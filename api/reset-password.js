import { supabase } from '../supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and new password are required.' });
  }

  // Find the token in the 'password_resets' table
  const { data: tokenData, error: tokenError } = await supabase
    .from('password_resets')
    .select('*')
    .eq('token', token)
    .single();

  if (tokenError || !tokenData || new Date(tokenData.expires_at) < new Date()) {
    return res.status(400).json({ success: false, message: 'الرابط غير صالح أو منتهي.' });
  }

  // Update the user's password
  const { error: updateError } = await supabase
    .from('users')
    .update({ password })
    .eq('email', tokenData.email);

  if (updateError) {
    console.error('API Error:', updateError);
    return res.status(500).json({ success: false, message: 'فشل تحديث كلمة المرور' });
  }

  // Delete the token after successful use
  const { error: deleteError } = await supabase
    .from('password_resets')
    .delete()
    .eq('token', token);

  if (deleteError) {
    console.error('API Error: Could not delete token.', deleteError);
  }

  res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح.' });
}