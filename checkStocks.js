const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.log('No URL found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStocksTable() {
    const { data, error } = await supabase.from('stocks').select('id').limit(1);
    if (error) {
        console.error('Error fetching stocks table:', error.message);
    } else {
        console.log('SUCCESS: Stocks table exists.');
    }
}

checkStocksTable();
