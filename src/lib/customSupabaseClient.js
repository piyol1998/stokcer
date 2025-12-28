import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cezskoukyesfzdfixwfe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlenNrb3VreWVzZnpkZml4d2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjcxMTIsImV4cCI6MjA4MDYwMzExMn0.iYqscvyB-uv_FfEEkW4AjVv_p-52rj2adRQ7XU-Eals';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
