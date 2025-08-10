const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lectures.db');

db.serialize(() => {
  db.run(`ALTER TABLE users ADD COLUMN email TEXT `);
  db.run(`ALTER TABLE users ADD COLUMN state TEXT`);
  console.log('✅ تمت إضافة الحقول email و state إلى جدول users.');
});

db.close();
