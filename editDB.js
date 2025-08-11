const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lectures.db');

db.run(`
  CREATE TABLE IF NOT EXISTS password_resets (
    token TEXT PRIMARY KEY,
    email TEXT,
    expires INTEGER
  )
`);
db.close();
