const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const files = [
  {
    path: 'G:\\My Drive\\[ANPHIM] MASTER PLANN\\02_PROJECTs\\K87K\\Documents\\Winterland87_Info.md',
    projects: ['proj_1', 'proj_7'] // Winterland87
  },
  {
    path: 'G:\\My Drive\\[ANPHIM] MASTER PLANN\\02_PROJECTs\\VISTA X AN PHIM\\AI_DONG THANG LONG\\Documents\\Dong_Thang_Long_Info.md',
    projects: ['proj_3'] // Đông Thăng Long
  },
  {
    path: 'G:\\My Drive\\[ANPHIM] MASTER PLANN\\02_PROJECTs\\VISTA X AN PHIM\\AI_KHAISON\\Documents\\Khai_Son_Info.md',
    projects: ['proj_0'] // Khai Son
  },
  {
    path: 'G:\\My Drive\\[ANPHIM] MASTER PLANN\\02_PROJECTs\\VISTA X AN PHIM\\Cát Bà - The Marina\\Documents\\Cat_Ba_The_Marina_Info.md',
    projects: ['proj_5', 'proj_6'] // The Marina
  },
  {
    path: 'G:\\My Drive\\[ANPHIM] MASTER PLANN\\02_PROJECTs\\F35story\\Đệ nhất pháp sư\\Documents\\De_nhat_phap_su_Info.md',
    projects: ['proj_8'] // Đệ nhất pháp sư
  }
];

async function run() {
  try {
    await pgClient.connect();
    
    // Ensure table exists (though user screenshot shows it does)
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS "Project_SOW" (
        id VARCHAR(50) PRIMARY KEY,
        project_id VARCHAR(50),
        summary TEXT
      )
    `);

    for (const file of files) {
      if (fs.existsSync(file.path)) {
        let content = fs.readFileSync(file.path, 'utf8');
        
        // Strip out Section 1 since it's already in the clients table
        content = content.replace(/## 🏢 1\. THÔNG TIN PHÁP LÝ CHUNG.*?(?=## 📅 2\. NHẬT KÝ CHI TIẾT)/s, '');

        for (const pid of file.projects) {
          const sowId = `sow_${pid}`;
          await pgClient.query(`
            INSERT INTO "Project_SOW" (id, project_id, summary)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET summary = EXCLUDED.summary
          `, [sowId, pid, content.trim()]);
          
          console.log(`Updated SOW for project ${pid} (stripped client info)`);
        }
      } else {
        console.error(`File not found: ${file.path}`);
      }
    }

    console.log("SOW update complete.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pgClient.end();
  }
}

run();
