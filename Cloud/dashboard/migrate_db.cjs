const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const sqliteDb = new sqlite3.Database(path.resolve(__dirname, 'db.sqlite'));
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await pgClient.connect();
    console.log("✅ Connected to PostgreSQL Supabase");
  } catch (err) {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    process.exit(1);
  }

  const tables = [
    'projects', 'cash_flow', 'expenses', 'alerts', 'documents', 
    'actions', 'agents', 'recent_expenses', 'tasks', 'stats', 
    'incomes', 'schedule'
  ];

  const schemas = [
    `CREATE TABLE IF NOT EXISTS projects ( id TEXT PRIMARY KEY, name TEXT NOT NULL, client TEXT NOT NULL, status TEXT NOT NULL, budget REAL, received REAL, dueDate TEXT, nextAction TEXT, nextActionDue TEXT, projectType TEXT, paymentD1 REAL, paymentD2 REAL, paymentD3 REAL, milestones TEXT, paymentPhase TEXT, paymentPhaseProgress INTEGER, thumbnailUrl TEXT, notes TEXT )`,
    `CREATE TABLE IF NOT EXISTS cash_flow ( id TEXT PRIMARY KEY, label TEXT NOT NULL, inflow REAL, outflow REAL, netProfit REAL )`,
    `CREATE TABLE IF NOT EXISTS expenses ( category TEXT PRIMARY KEY, amount REAL, percentage INTEGER, color TEXT )`,
    `CREATE TABLE IF NOT EXISTS alerts ( id TEXT PRIMARY KEY, type TEXT NOT NULL, description TEXT, project TEXT, urgency TEXT, status TEXT )`,
    `CREATE TABLE IF NOT EXISTS documents ( id TEXT PRIMARY KEY, name TEXT NOT NULL, project TEXT, type TEXT, status TEXT, owner TEXT, lastUpdated TEXT, fileSize TEXT, isUrgent INTEGER, urgentReason TEXT, priorityLevel TEXT )`,
    `CREATE TABLE IF NOT EXISTS actions ( id TEXT PRIMARY KEY, priorityOrder INTEGER, title TEXT NOT NULL, project TEXT, priorityLevel TEXT, suggestedAgent TEXT, status TEXT, notes TEXT )`,
    `CREATE TABLE IF NOT EXISTS agents ( id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT, keyResponsibility TEXT, currentTask TEXT, recentActivity TEXT, workloadProgress INTEGER, avatarColor TEXT )`,
    `CREATE TABLE IF NOT EXISTS recent_expenses ( id TEXT PRIMARY KEY, title TEXT, amount INTEGER, date TEXT, category TEXT )`,
    `CREATE TABLE IF NOT EXISTS tasks ( id TEXT PRIMARY KEY, taskName TEXT NOT NULL, priority TEXT, assignedAgent TEXT, status TEXT, dueTime TEXT )`,
    `CREATE TABLE IF NOT EXISTS stats ( key TEXT PRIMARY KEY, value TEXT )`,
    `CREATE TABLE IF NOT EXISTS incomes ( id TEXT PRIMARY KEY, date TEXT, project TEXT, amount REAL, notes TEXT )`,
    `CREATE TABLE IF NOT EXISTS schedule ( id TEXT PRIMARY KEY, title TEXT NOT NULL, date TEXT, time TEXT, type TEXT, participants TEXT )`
  ];

  for (let schema of schemas) {
    await pgClient.query(schema);
  }
  console.log("✅ Created all table schemas in PostgreSQL");

  const migrationPromises = tables.map(table => {
    return new Promise((resolve, reject) => {
      sqliteDb.all(`SELECT * FROM ${table}`, [], async (err, rows) => {
        if (err) {
          console.error(`❌ Error reading ${table} from SQLite:`, err.message);
          return resolve(); 
        }
        if (!rows || rows.length === 0) {
          console.log(`ℹ️ Table ${table} is empty. Skipping.`);
          return resolve();
        }

        console.log(`Migrating ${rows.length} rows for table [${table}]...`);
        let successCount = 0;
        
        for (let row of rows) {
          const ObjectKeys = Object.keys(row);
          const ObjectValues = Object.values(row);
          const placeholders = ObjectKeys.map((_, i) => `$${i + 1}`).join(', ');
          
          let pk = 'id';
          if (table === 'expenses') pk = 'category';
          if (table === 'stats') pk = 'key';

          const query = `INSERT INTO ${table} (${ObjectKeys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${pk}) DO NOTHING`;
          
          try {
            await pgClient.query(query, ObjectValues);
            successCount++;
          } catch (insertErr) {
            console.error(`❌ Error inserting row into ${table}:`, insertErr.message);
          }
        }
        console.log(`✅ Finished migrating ${table} (${successCount}/${rows.length} rows inserted).`);
        resolve();
      });
    });
  });

  await Promise.all(migrationPromises);
  
  console.log("🎉 All migrations completed successfully!");
  await pgClient.end();
  sqliteDb.close();
}

migrate();
