// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

const db = new sqlite3.Database('lectures.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تسجيل مستخدم جديد
app.post('/register', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'اسم وكلمة المرور مطلوبان' });

  const stmt = db.prepare('INSERT INTO users (name, password) VALUES (?, ?)');
  stmt.run(name, password, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'اسم المستخدم موجود مسبقًا' });
      }
      return res.status(500).json({ error: 'حدث خطأ داخلي' });
    }
    res.json({ message: 'تم التسجيل بنجاح' });
  });
  stmt.finalize();
});

// تسجيل الدخول
app.post('/login', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'اسم وكلمة المرور مطلوبان' });

  db.get('SELECT * FROM users WHERE name = ? AND password = ?', [name, password], (err, row) => {
    if (err) return res.status(500).json({ error: 'حدث خطأ داخلي' });
    if (!row) return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور خاطئة' });

    res.json({ message: 'تم تسجيل الدخول', userId: row.id, userName: row.name });
  });
});

// حفظ محاضرة
app.post('/save', (req, res) => {
  const { user_id, type, title, state, area, location, date, time } = req.body;
  if (!user_id || !type || !title || !state || !area || !location || !date || !time) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const stmt = db.prepare(`INSERT INTO lectures
    (user_id, type, title, state, area, location, date, time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(user_id, type, title, state, area, location, date, time, function(err) {
    if (err) return res.status(500).json({ error: 'حدث خطأ داخلي' });
    res.json({ message: 'تم حفظ المحاضرة', lectureId: this.lastID });
  });
  stmt.finalize();
});

// جلب محاضرات الواعظ
app.get('/lectures', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'معرف الواعظ مطلوب' });

  db.all('SELECT * FROM lectures WHERE user_id = ? ORDER BY date DESC', [user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'حدث خطأ داخلي' });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
