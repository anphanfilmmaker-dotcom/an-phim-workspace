const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sqliteDb = new sqlite3.Database('db.sqlite');

async function run() {
  try {
    await pgClient.connect();
    
    console.log("Dropping old schedule table...");
    await pgClient.query('DROP TABLE IF EXISTS schedule');

    console.log("Creating new schedule table...");
    await pgClient.query(`
      CREATE TABLE schedule (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date VARCHAR(50),
        time VARCHAR(50),
        type VARCHAR(50),
        participants TEXT
      )
    `);

    console.log("Migrating schedule data...");
    sqliteDb.all('SELECT * FROM schedule', [], async (err, rows) => {
      if (err) throw err;
      let count = 0;
      for (let row of rows) {
        const keys = Object.keys(row);
        const values = Object.values(row);
        const placeholders = keys.map((_, i) => '$' + (i + 1)).join(', ');
        await pgClient.query(`INSERT INTO schedule (${keys.join(', ')}) VALUES (${placeholders})`, values);
        count++;
      }
      console.log(`Successfully migrated ${count} schedule rows!`);
      
      await pgClient.end();
      sqliteDb.close();
    });

  } catch (err) {
    console.error("Error:", err);
    await pgClient.end();
    sqliteDb.close();
  }
}

run();
