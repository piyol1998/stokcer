import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'FAIL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'FAIL';

if (supabaseUrl === 'FAIL') {
  console.log('No URL found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStocksTable() {
    const { data, error } = await supabase.from('stocks').select('id').limit(1);
    if (error) {
        console.error('Error fetching stocks table:', error);
    } else {
        console.log('SUCCESS: Stocks table exists. Data:', data);
    }
}

checkStocksTable();
