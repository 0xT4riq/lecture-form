import { supabase } from '../supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { name, email, state, password } = req.body;

  if (!name || !email || !state || !password) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال جميع الخانات' });
  }

  // Check if a user with the same name or email already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .or(`name.eq.${name},email.eq.${email}`);

  if (checkError) {
    console.error('API Error:', checkError);
    return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
  }

  if (existingUser && existingUser.length > 0) {
    return res.status(409).json({ success: false, message: 'اسم المستخدم أو البريد الإلكتروني موجود مسبقًا' });
  }

  // Insert the new user into the 'users' table
  const { data, error } = await supabase
    .from('users')
    .insert([
      { name, email, state, password } // You should hash the password in production!
    ])
    .select();

  if (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
  }

  res.status(201).json({ success: true, message: 'تم التسجيل بنجاح', user: data[0] });
}