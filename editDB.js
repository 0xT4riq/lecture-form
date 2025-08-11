const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('lectures.db');

const adminUser = {
  name: 'admin',
  email: 'admin@example.com',
  state: 'admin-state',
  password: 'admin123',
  isAdmin: 1
};

db.run(`
  INSERT OR IGNORE INTO users (name, email, state, password, isAdmin) 
  VALUES (?, ?, ?, ?, ?)`,
  [adminUser.name, adminUser.email, adminUser.state, adminUser.password, adminUser.isAdmin], 
  function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log('تم إنشاء حساب الأدمن (أو موجود مسبقاً)');
    }
    db.close();
  }
);
