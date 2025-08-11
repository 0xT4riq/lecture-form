// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const app = express();
const PORT = 3000;
require('dotenv').config();

const db = new sqlite3.Database('lectures.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// تسجيل مستخدم جديد
app.post('/register', (req, res) => {
  const { name, email, state, password } = req.body;
  if (!name || !password || !email || !state) return res.status(400).json({ error: 'يرجى إدخال جميع الخانات' });

 const stmt = db.prepare(
    'INSERT INTO users (name, email, state, password) VALUES (?, ?, ?, ?)'
  );
    stmt.run(name, email, state, password, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني موجود مسبقًا' });
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

    res.json({ message: 'تم تسجيل الدخول', userId: row.id, userName: row.name, userState: row.state });
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
  const { user_id, q, date_from, date_to } = req.query;
  if (!user_id) return res.status(400).json({ error: 'معرف الواعظ مطلوب' });

  let sql = 'SELECT * FROM lectures WHERE user_id = ?';
  const params = [user_id];

  if (q && q.trim() !== '') {
    sql += ` AND (
      title LIKE ? OR 
      type LIKE ? OR 
      state LIKE ? OR 
      area LIKE ? OR 
      location LIKE ? OR
      time LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (date_from) {
    sql += ` AND date >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    sql += ` AND date <= ?`;
    params.push(date_to);
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
app.put('/lectures/:id', (req, res) => {
  const { id } = req.params;
  const { type, title, state, area, location, date, time } = req.body;

  db.run(`
    UPDATE lectures 
    SET type = ?, title = ?, state = ?, area = ?, location = ?, date = ?, time = ?
    WHERE id = ?
  `, [type, title, state, area, location, date, time, id], function(err) {
    if (err) return res.status(500).json({ error: 'حدث خطأ داخلي' });
    res.json({ message: 'تم تحديث المحاضرة بنجاح' });
  });
});

app.get('/user/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT id, name, email, state FROM users WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: 'حدث خطأ داخلي' });
        if (!row) return res.status(404).json({ error: 'المستخدم غير موجود' });
        res.json(row);
    });
});
// تحديث بيانات المستخدم
app.put('/user/:id', (req, res) => {
    const id = req.params.id;
    const { name, email, state, password } = req.body;

    if (!name || !email || !state) {
        return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة' });
    }

    let query, params;
    if (password) {
        query = 'UPDATE users SET name = ?, email = ?, state = ?, password = ? WHERE id = ?';
        params = [name, email, state, password, id];
    } else {
        query = 'UPDATE users SET name = ?, email = ?, state = ? WHERE id = ?';
        params = [name, email, state, id];
    }

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: 'حدث خطأ أثناء التحديث' });
        res.json({ message: 'تم تحديث البيانات بنجاح' });
    });
});
let resetTokens = {};

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'خطأ في السيرفر' });

    // حتى لو الإيميل غير موجود، ما نكشف للمستخدم
    if (!user) {
      return res.json({ message: 'إذا كان البريد موجود، سيتم إرسال الرابط.' });
    }

    // توليد التوكِن
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 15 * 60 * 1000; // صالح 15 دقيقة

    // حفظ التوكِن في قاعدة البيانات
    db.run(
      'INSERT INTO password_resets (token, email, expires) VALUES (?, ?, ?)',
      [token, email, expires],
      (err) => {
        if (err) return res.status(500).json({ error: 'خطأ في حفظ البيانات' });

        const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;

        // إرسال الإيميل
        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        let mailOptions = {
          from: `"دعم الموقع" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'إعادة تعيين كلمة المرور - موقعك',
          text: `السلام عليكم،

          لقد طلبت إعادة تعيين كلمة المرور لحسابك في موقعنا.

          لإعادة تعيين كلمة المرور، اضغط على الرابط التالي أو انسخه والصقه في متصفحك:

          ${resetLink}

          إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل.

          شكراً لاستخدامك موقعنا.

          مع تحيات فريق الدعم.`,
          html: `
            <p>السلام عليكم،</p>
            <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك في موقعنا.</p>
            <p>لإعادة تعيين كلمة المرور، اضغط على الرابط التالي:</p>
            <p><a href="${resetLink}" target="_blank">إعادة تعيين كلمة المرور</a></p>
            <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل.</p>
            <br/>
            <p>شكراً لاستخدامك موقعنا.</p>
            <p>مع تحيات فريق الدعم.</p>
          `
        };


        transporter.sendMail(mailOptions, (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'فشل إرسال البريد' });
          }
          res.json({ message: 'تم إرسال رابط إعادة التعيين إلى بريدك.' });
        });
      }
    );
  });
});
// إعادة تعيين كلمة المرور
app.post('/reset-password', (req, res) => {
  const { token, password } = req.body;

  db.get('SELECT * FROM password_resets WHERE token = ?', [token], (err, tokenData) => {
    if (err) return res.status(500).json({ error: 'خطأ في السيرفر' });
    if (!tokenData || tokenData.expires < Date.now()) {
      return res.status(400).json({ message: 'الرابط غير صالح أو منتهي.' });
    }

    // تحديث كلمة المرور
    db.run('UPDATE users SET password = ? WHERE email = ?', [password, tokenData.email], (err) => {
      if (err) return res.status(500).json({ error: 'فشل تحديث كلمة المرور' });

      // حذف التوكِن بعد الاستخدام
      db.run('DELETE FROM password_resets WHERE token = ?', [token]);

      res.json({ message: 'تم تغيير كلمة المرور بنجاح.' });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
