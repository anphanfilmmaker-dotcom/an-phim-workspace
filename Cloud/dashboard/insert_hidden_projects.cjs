const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pgClient.connect();
    
    await pgClient.query(`
      INSERT INTO projects (id, name, client, status, projecttype) 
      VALUES ('proj_canhan', 'Cá nhân', 'Internal', 'Hidden', 'Internal')
      ON CONFLICT (id) DO NOTHING
    `);

    await pgClient.query(`
      INSERT INTO projects (id, name, client, status, projecttype) 
      VALUES ('proj_congty', 'Công ty', 'Internal', 'Hidden', 'Internal')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log("Successfully inserted hidden projects.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pgClient.end();
  }
}

run();
