const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pgClient.connect();
    
    const res1 = await pgClient.query(`
      UPDATE expensetransactions 
      SET projectid = 'proj_canhan' 
      WHERE project = 'Cá nhân'
    `);
    console.log(`Updated ${res1.rowCount} rows for Cá nhân`);

    const res2 = await pgClient.query(`
      UPDATE expensetransactions 
      SET projectid = 'proj_congty' 
      WHERE project = 'Công ty'
    `);
    console.log(`Updated ${res2.rowCount} rows for Công ty`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pgClient.end();
  }
}

run();
