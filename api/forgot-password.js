import { supabase } from '../supabaseClient.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
  }

  // Find the user by email without revealing if they exist
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (userError && userError.code !== 'PGRST116') { // PGRST116 is for 'not found'
    console.error('API Error:', userError);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }

  // Always return the same message to prevent email enumeration
  if (!user) {
    return res.json({ message: 'إذا كان البريد موجود، سيتم إرسال الرابط.' });
  }

  // Generate a secure token and expiration time
  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  // Insert the token into a new 'password_resets' table
  const { error: insertError } = await supabase
    .from('password_resets')
    .insert([{ token, email, expires_at }]);

  if (insertError) {
    console.error('API Error:', insertError);
    return res.status(500).json({ success: false, message: 'خطأ في حفظ البيانات' });
  }

  // Create the password reset link
  const resetLink = `https://lecture-form.onrender.com/reset-password.html?token=${token}`;
  
  // Set up Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"دعم الموقع" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'إعادة تعيين كلمة المرور - موقعك',
    text: `السلام عليكم،\n\nلقد طلبت إعادة تعيين كلمة المرور لحسابك في موقعنا.\n\nلإعادة تعيين كلمة المرور، اضغط على الرابط التالي أو انسخه والصقه في متصفحك:\n\n${resetLink}\n\nإذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل.\n\nشكراً لاستخدامك موقعنا.\n\nمع تحيات فريق الدعم.`,
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

  // Send the email
  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.error('Email sending error:', err);
      return res.status(500).json({ success: false, message: 'فشل إرسال البريد' });
    }
    res.json({ success: true, message: 'تم إرسال رابط إعادة التعيين إلى بريدك.' });
  });
}