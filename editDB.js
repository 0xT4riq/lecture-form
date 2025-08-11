const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lectures.db');

db.serialize(() => {
  db.all(`PRAGMA table_info(lectures);`, (err, rows) => {
    if (err) {
      console.error("خطأ في جلب معلومات الجدول:", err);
      return;
    }

    const columnNames = rows.map(row => row.name);
    if (!columnNames.includes('hijri_date')) {
      db.run(`ALTER TABLE lectures ADD COLUMN hijri_date TEXT`, err => {
        if (err) {
          console.error("خطأ في إضافة العمود:", err);
        } else {
          console.log('✅ تم إضافة عمود hijri_date إلى جدول lectures.');
        }
      });
    } else {
      console.log('✅ العمود hijri_date موجود بالفعل.');
    }
  });
});
