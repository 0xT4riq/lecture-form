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

// جلب محاضرات الواعظ مع دعم البحث
app.get('/lectures', (req, res) => {
  const { user_id, q } = req.query;
  if (!user_id) return res.status(400).json({ error: 'معرف الواعظ مطلوب' });

  let sql = 'SELECT * FROM lectures WHERE user_id = ?';
  const params = [user_id];

  if (q && q.trim() !== '') {
    sql += ` AND (
      title LIKE ? OR 
      type LIKE ? OR 
      state LIKE ? OR 
      area LIKE ? OR 
      location LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  sql += ' ORDER BY date DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'حدث خطأ داخلي' });
    res.json(rows);
  });
});

// حذف محاضرة
app.delete("/lectures/:id", (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM lectures WHERE id = ?", [id], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "فشل حذف المحاضرة" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "المحاضرة غير موجودة" });
    }

    res.json({ success: true, message: "تم الحذف بنجاح" });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
