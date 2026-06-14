const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('db.sqlite');
db.get("SELECT value FROM stats WHERE key = 'dashboard'", (err, row) => {
  if (err) console.error(err);
  else console.log(JSON.parse(row.value).cashAvailable);
});
