const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function rollback() {
  try {
    await pgClient.connect();
    console.log("Connected to PostgreSQL Supabase");

    const tables = [
      'projects', 'cash_flow', 'expenses', 'alerts', 'documents', 
      'actions', 'agents', 'recent_expenses', 'tasks', 'stats', 
      'incomes', 'schedule'
    ];

    for (let table of tables) {
      await pgClient.query(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`Truncated table ${table}`);
    }

    console.log("Rollback completed successfully.");
  } catch (err) {
    console.error("Error during rollback:", err);
  } finally {
    await pgClient.end();
  }
}

rollback();
