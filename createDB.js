// createDatabase.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lectures.db');

db.serialize(() => {
  // جدول المستخدمين (الواعظين)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  // جدول المحاضرات
  db.run(`
    CREATE TABLE IF NOT EXISTS lectures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      state TEXT NOT NULL,
      area TEXT NOT NULL,
      location TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  console.log('✅ قاعدة البيانات والجداول تم إنشاؤها.');
});

db.close();
