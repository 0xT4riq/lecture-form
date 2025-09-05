import { supabase } from '../supabaseClient.js';

export default async function handler(req, res) {
      console.log('Received payload:', req.body);
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let { user_id, type, title, state, area, location, date, time, hijriDate } = req.body;
  
    type = type.trim();
    title = title.trim();
    state = state.trim();
    area = area.trim();
    location = location.trim();
    
  if (!user_id || !type || !title || !state || !area || !location || !date || !time || !hijriDate) {
    return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
  }
  const userIdAsInt = parseInt(user_id, 8);
  if (isNaN(userIdAsInt)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح.' });
  }
  // Use the correct column name from your Supabase table for 'hijriDate'
  const { data, error } = await supabase
    .from('lectures')
    .insert([
      { 
        user_id: userIdAsInt, 
        type, 
        title, 
        state, 
        area, 
        location, 
        date, 
        time, 
        hijri_date: hijriDate 
      }
    ])
    .select();

  if (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
  }
  
  res.status(201).json({ success: true, message: 'تم حفظ المحاضرة', lectureId: data[0].id });
}