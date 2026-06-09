const { syncExcelToDatabase } = require('./excel-parser.cjs');
const Database = require('better-sqlite3');
const db = new Database('./db.sqlite');

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    try {
      db.prepare(sql).run(...params);
      resolve();
    } catch (e) {
      console.error('DB error:', e.message, 'SQL:', sql.slice(0,80));
      reject(e);
    }
  });
};
const dbQuery = (sql, params = []) => {
  return new Promise((resolve) => {
    resolve(db.prepare(sql).all(...params));
  });
};

syncExcelToDatabase(dbRun, dbQuery).then(() => {
  const projects = db.prepare('SELECT id, name, client, status, budget, received FROM projects').all();
  console.log('Projects in DB:', projects.length);
  projects.slice(0,5).forEach(p => console.log(' -', p.name, '|', p.client, '|', p.status, '|', 'budget:', p.budget, '|', 'received:', p.received));
  
  const expenses = db.prepare('SELECT category, amount FROM expenses').all();
  console.log('Expense categories:', expenses.length);
  expenses.forEach(e => console.log(' -', e.category, ':', e.amount));
  
  const stats = db.prepare("SELECT value FROM stats WHERE key='dashboard'").get();
  if (stats) console.log('Stats:', stats.value);
  
  db.close();
}).catch(err => {
  console.error('SYNC ERROR:', err.message);
  db.close();
});
