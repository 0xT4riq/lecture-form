import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // This log will now appear in your Vercel logs instead of a crash
    console.error('Supabase URL or Key is missing from environment variables!');
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);