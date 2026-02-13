import { supabase } from '../../supabaseClient.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    // Logic for DELETE /lectures/:id
    const { data, error } = await supabase
      .from('lectures')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('API Error:', error);
      return res.status(500).json({ success: false, message: 'فشل حذف المحاضرة' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: 'المحاضرة غير موجودة' });
    }

    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } else if (req.method === 'PUT') {
    // Logic for PUT /lectures/:id
    const { type, title, state, area, location, date, time, hijriDate, dateTo, hijriDateTo } = req.body;

    const { data, error } = await supabase
      .from('lectures')
      .update({ 
        type, 
        title, 
        state, 
        area, 
        location, 
        date, 
        time, 
        hijri_date: hijriDate,
        date_to: dateTo || null,
        hijri_date_to: hijriDateTo || null
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('API Error:', error);
      return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }

    res.json({ success: true, message: 'تم تحديث المحاضرة بنجاح', data: data[0] });
  } else {
    // Return a 405 Method Not Allowed for other methods
    res.setHeader('Allow', ['DELETE', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}