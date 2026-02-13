// server.js - Supabase Integration
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY are required in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
  try {
    let { name, email, state, password } = req.body;
    if (!name || !password || !email || !state) {
      return res.status(400).json({ error: 'يرجى إدخال جميع الخانات' });
    }

    name = name.trim();
    email = email.trim();
    state = state.trim();
    password = password.trim();

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, state, password, isAdmin: false }])
      .select();

    if (error) {
      if (error.message.includes('duplicate key')) {
        return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني موجود مسبقًا' });
      }
      console.error('Register error:', error);
      return res.status(500).json({ error: 'حدث خطأ داخلي' });
    }

    res.json({ message: 'تم التسجيل بنجاح', userId: data[0].id });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});


// تسجيل الدخول
app.post('/api/login', async (req, res) => {
  try {
    let { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'اسم وكلمة المرور مطلوبان' });
    }

    name = name.trim();
    password = password.trim();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .eq('password', password)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور خاطئة' });
    }

    res.json({
      message: 'تم تسجيل الدخول',
      userId: data.id,
      userName: data.name,
      userState: data.state,
      isAdmin: data.isAdmin
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});



// حفظ محاضرة
app.post('/api/save', async (req, res) => {
  try {
    const { user_id, type, title, state, area, location, date, time, hijriDate, dateFrom, dateTo, hijriDateFrom, hijriDateTo } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'معرف المستخدم مطلوب' });
    }

    let lectureData;

    if (type === 'إجازة') {
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'تاريخ البداية والنهاية مطلوبان للإجازة' });
      }

      lectureData = {
        user_id: parseInt(user_id),
        type: 'إجازة',
        title: 'إجازة',
        date: dateFrom,
        hijri_date: hijriDateFrom,
        date_to: dateTo,
        hijri_date_to: hijriDateTo,
        time: 'طوال اليوم',
        state: null,
        area: null,
        location: null
      };
    } else {
      if (!type || !title || !state || !date || !time || !hijriDate) {
        return res.status(400).json({ error: 'يرجى ملء جميع الحقول المطلوبة' });
      }

      lectureData = {
        user_id: parseInt(user_id),
        type,
        title,
        state,
        area: area || '',
        location: location || '',
        date,
        time,
        hijri_date: hijriDate,
        date_to: null,
        hijri_date_to: null
      };
    }

    const { data, error } = await supabase
      .from('lectures')
      .insert([lectureData])
      .select();

    if (error) {
      console.error('Save error:', error);
      return res.status(500).json({ error: 'حدث خطأ داخلي' });
    }

    res.json({ message: type === 'إجازة' ? 'تم حفظ الإجازة' : 'تم حفظ المحاضرة', lectureId: data[0].id });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});


// جلب محاضرات الواعظ مع دعم البحث
app.get('/api/lectures', async (req, res) => {
  try {
    const { user_id, q, date_from, date_to } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'معرف الواعظ مطلوب' });
    }

    const userId = parseInt(user_id, 10);
    let query = supabase
      .from('lectures')
      .select('*')
      .eq('user_id', userId);

    if (q && q.trim() !== '') {
      const searchTerm = q.trim();
      query = query.or(`title.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%,area.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,time.ilike.%${searchTerm}%`);
    }

    if (date_from) {
      query = query.gte('date', date_from);
    }

    if (date_to) {
      query = query.lte('date', date_to);
    }

    query = query.order('date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Fetch lectures error:', error);
      return res.status(500).json({ error: 'حدث خطأ داخلي' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Fetch lectures error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});


// حذف محاضرة
app.delete("/api/lectures/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const { error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'فشل حذف المحاضرة' });
    }

    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// تحديث محاضرة
app.put('/api/lectures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, state, area, location, date, time, hijriDate, dateFrom, dateTo, hijriDateFrom, hijriDateTo } = req.body;

    let updateData;

    if (type === 'إجازة') {
      updateData = {
        type: 'إجازة',
        title: 'إجازة',
        date: dateFrom,
        hijri_date: hijriDateFrom,
        date_to: dateTo,
        hijri_date_to: hijriDateTo,
        time: 'طوال اليوم',
        state: null,
        area: null,
        location: null
      };
    } else {
      updateData = {
        type,
        title,
        state,
        area: area || '',
        location: location || '',
        date,
        time,
        hijri_date: hijriDate,
        date_to: null,
        hijri_date_to: null
      };
    }

    const { error } = await supabase
      .from('lectures')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return res.status(500).json({ error: 'حدث خطأ داخلي' });
    }

    res.json({ message: 'تم تحديث المحاضرة بنجاح' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});


// الحصول على بيانات المستخدم
app.get('/api/user/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, state')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    res.json(data);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// تحديث بيانات المستخدم
app.put('/api/user/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, state, password } = req.body;

    if (!name || !email || !state) {
      return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة' });
    }

    let updateData = { name, email, state };
    if (password) {
      updateData.password = password;
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ error: 'حدث خطأ أثناء التحديث' });
    }

    res.json({ message: 'تم تحديث البيانات بنجاح' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// نسيان كلمة المرور
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // حتى لو الإيميل غير موجود، ما نكشف للمستخدم
    if (userError || !user) {
      return res.json({ message: 'إذا كان البريد موجود، سيتم إرسال الرابط.' });
    }

    // توليد التوكِن
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // حفظ التوكِن في قاعدة البيانات
    const { error: tokenError } = await supabase
      .from('password_resets')
      .insert([{ token, email, expires }]);

    if (tokenError) {
      console.error('Token save error:', tokenError);
      return res.status(500).json({ error: 'خطأ في حفظ البيانات' });
    }

    const resetLink = `https://lecture-form.onrender.com/reset-password.html?token=${token}`;

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
        console.error('Email error:', err);
        return res.status(500).json({ error: 'فشل إرسال البريد' });
      }
      res.json({ message: 'تم إرسال رابط إعادة التعيين إلى بريدك.' });
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// إعادة تعيين كلمة المرور
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    const { data: tokenData, error: tokenError } = await supabase
      .from('password_resets')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData || new Date(tokenData.expires) < new Date()) {
      return res.status(400).json({ message: 'الرابط غير صالح أو منتهي.' });
    }

    // تحديث كلمة المرور
    const { error: updateError } = await supabase
      .from('users')
      .update({ password })
      .eq('email', tokenData.email);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'فشل تحديث كلمة المرور' });
    }

    // حذف التوكِن بعد الاستخدام
    await supabase.from('password_resets').delete().eq('token', token);

    res.json({ message: 'تم تغيير كلمة المرور بنجاح.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

// الحصول على قائمة المستخدمين (للأدمن)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, isAdmin');

    if (error) {
      console.error('Fetch users error:', error);
      return res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

