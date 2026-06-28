const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const sqliteDb = new sqlite3.Database(path.resolve(__dirname, 'db.sqlite'));
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const agentsData = [
  {
    id: "tram-anh",
    name: "Trâm Anh",
    status: "Active",
    keyResponsibility: "PM Agent",
    currentTask: "Quản lý luồng công việc",
    recentActivity: "Báo cáo tiến độ",
    workloadProgress: 65,
    avatarColor: "#05F169", // Primary green
    tokenInput: 8500,
    tokenOutput: 1100,
    runCount: 22,
    totalCost: 0.05
  },
  {
    id: "minh-thu",
    name: "Minh Thư",
    status: "Active",
    keyResponsibility: "Finance Agent",
    currentTask: "Quét giao dịch ngân hàng",
    recentActivity: "Cập nhật chi phí",
    workloadProgress: 72,
    avatarColor: "#05F169",
    tokenInput: 15400,
    tokenOutput: 3200,
    runCount: 45,
    totalCost: 0.12
  },
  {
    id: "minh-dan",
    name: "Minh Đan",
    status: "Active",
    keyResponsibility: "Social manager",
    currentTask: "Lên bài fanpage",
    recentActivity: "Tạo content Facebook",
    workloadProgress: 58,
    avatarColor: "#c241ff", // Purple
    tokenInput: 45000,
    tokenOutput: 12000,
    runCount: 18,
    totalCost: 0.85
  },
  {
    id: "quoc-bao",
    name: "Quốc Bảo",
    status: "Active",
    keyResponsibility: "Sales Agent",
    currentTask: "Làm báo giá",
    recentActivity: "Cập nhật Quotation_Draft",
    workloadProgress: 41,
    avatarColor: "#ffa500", // Orange
    tokenInput: 32000,
    tokenOutput: 4500,
    runCount: 12,
    totalCost: 0.35
  },
  {
    id: "chi-hai",
    name: "Chí Hải",
    status: "Active",
    keyResponsibility: "Tech Agent",
    currentTask: "Giám sát hệ thống",
    recentActivity: "Kiểm tra Token",
    workloadProgress: 27,
    avatarColor: "#4169e1", // Royal Blue
    tokenInput: 2100,
    tokenOutput: 400,
    runCount: 8,
    totalCost: 0.01
  }
];

async function seedAgents() {
  try {
    await pgClient.connect();
    console.log("✅ Connected to PostgreSQL Supabase");
    
    // Clear old data
    await pgClient.query('DELETE FROM agents');
    
    // Insert new data
    for (let agent of agentsData) {
      const keys = Object.keys(agent);
      const values = Object.values(agent);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `INSERT INTO agents (${keys.join(', ')}) VALUES (${placeholders})`;
      await pgClient.query(query, values);
    }
    console.log("✅ Successfully seeded 5 real agents into PostgreSQL");
    
    await pgClient.end();

    // SQLite
    sqliteDb.run('DELETE FROM agents', function(err) {
      if (err) console.error(err);
      
      let stmt = sqliteDb.prepare(`INSERT INTO agents (${Object.keys(agentsData[0]).join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (let agent of agentsData) {
        stmt.run(Object.values(agent));
      }
      stmt.finalize();
      console.log("✅ Successfully seeded 5 real agents into SQLite");
      sqliteDb.close();
    });

  } catch (err) {
    console.error("❌ Fatal Error:", err.message);
  }
}

seedAgents();
