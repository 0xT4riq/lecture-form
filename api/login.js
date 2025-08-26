import { supabase } from '../supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ success: false, message: 'اسم وكلمة المرور مطلوبان' });
  }

  // Find the user with the matching name and password
  const { data, error } = await supabase
    .from('users')
    .select('id, name, state, isAdmin')
    .eq('name', name.trim())
    .eq('password', password.trim())
    .single();

  if (error) {
    // Supabase returns a specific code when no rows are found
    if (error.code === 'PGRST116') {
      return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور خاطئة' });
    }
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
  }
  
  if (!data) {
    return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور خاطئة' });
  }

  res.json({
    success: true,
    message: 'تم تسجيل الدخول',
    userId: data.id,
    userName: data.name,
    userState: data.state,
    isAdmin: data.isAdmin
  });
}