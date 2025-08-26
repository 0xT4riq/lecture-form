import { supabase } from '../supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { user_id, q, date_from, date_to } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'معرف الواعظ مطلوب' });
  }

  let query = supabase
    .from('lectures')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: false }); // Sort by date descending

  // Handle the search query 'q'
  if (q && q.trim() !== '') {
    const searchTerm = `%${q}%`;
    query = query.or(
      `title.ilike.${searchTerm},type.ilike.${searchTerm},state.ilike.${searchTerm},area.ilike.${searchTerm},location.ilike.${searchTerm},time.ilike.${searchTerm}`
    );
  }
  
  // Handle date filtering
  if (date_from) {
    query = query.gte('date', date_from);
  }
  if (date_to) {
    query = query.lte('date', date_to);
  }

  const { data: lectures, error } = await query;

  if (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
  }
  
  res.json(lectures);
}