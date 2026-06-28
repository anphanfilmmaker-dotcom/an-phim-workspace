const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const sqliteDb = new sqlite3.Database(path.resolve(__dirname, 'db.sqlite'));
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function alterTables() {
  try {
    await pgClient.connect();
    console.log("✅ Connected to PostgreSQL Supabase");
    
    // Add columns to PostgreSQL
    const alterPgQueries = [
      `ALTER TABLE agents ADD COLUMN tokenInput INTEGER DEFAULT 0;`,
      `ALTER TABLE agents ADD COLUMN tokenOutput INTEGER DEFAULT 0;`,
      `ALTER TABLE agents ADD COLUMN runCount INTEGER DEFAULT 0;`,
      `ALTER TABLE agents ADD COLUMN totalCost REAL DEFAULT 0.0;`
    ];
    
    for (let q of alterPgQueries) {
      try {
        await pgClient.query(q);
        console.log(`✅ PG: ${q}`);
      } catch(e) {
        if (!e.message.includes("already exists")) {
          console.error(`❌ PG Error: ${e.message}`);
        } else {
          console.log(`⚠️ PG: Column already exists, skipping.`);
        }
      }
    }
    await pgClient.end();

    // Add columns to SQLite
    const alterSqliteQueries = [
      `ALTER TABLE agents ADD COLUMN tokenInput INTEGER DEFAULT 0;`,
      `ALTER TABLE agents ADD COLUMN tokenOutput INTEGER DEFAULT 0;`,
      `ALTER TABLE agents ADD COLUMN runCount INTEGER DEFAULT 0;`,
      `ALTER TABLE agents ADD COLUMN totalCost REAL DEFAULT 0.0;`
    ];

    for (let q of alterSqliteQueries) {
      sqliteDb.run(q, function(err) {
        if (err) {
          if (!err.message.includes("duplicate column name")) {
             console.error(`❌ SQLite Error: ${err.message}`);
          } else {
             console.log(`⚠️ SQLite: Column already exists, skipping.`);
          }
        } else {
          console.log(`✅ SQLite: ${q}`);
        }
      });
    }
    
    setTimeout(() => {
      sqliteDb.close();
      console.log("🎉 Database alteration complete!");
    }, 1000);

  } catch (err) {
    console.error("❌ Fatal Error:", err.message);
  }
}

alterTables();
