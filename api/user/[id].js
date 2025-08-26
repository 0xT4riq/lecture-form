import { supabase } from '../../supabaseClient.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // Logic for GET /user/:id
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, state')
      .eq('id', id)
      .single();

    if (error) {
      console.error('API Error:', error);
      // Supabase returns a specific code when no rows are found
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      }
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }

    res.json({ success: true, user });
  } 
  
  else if (req.method === 'PUT') {
    // Logic for PUT /user/:id
    const { name, email, state, password } = req.body;

    if (!name || !email || !state) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال جميع البيانات المطلوبة' });
    }

    // Build the update object dynamically
    const updateData = { name, email, state };
    if (password) {
      updateData.password = password;
      // In a real app, you should hash the password here before updating
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, state');

    if (error) {
      console.error('API Error:', error);
      return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحديث' });
    }

    res.json({ success: true, message: 'تم تحديث البيانات بنجاح', user: data[0] });
  } 
  
  else {
    // Return a 405 Method Not Allowed for other methods
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}