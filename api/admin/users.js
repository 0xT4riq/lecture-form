import { supabase } from '../../supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Fetch all users from the 'users' table, selecting only specific columns
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, isAdmin');

  if (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
  }

  res.json(users);
}