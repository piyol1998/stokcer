const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// We have .env.local in the folder.
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envConfig = dotenv.parse(envContent);

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.log('No URL found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStocksTable() {
    console.log("Testing insert into stocks...");
    const { data: insertData, error: insertError } = await supabase
      .from('stocks')
      .insert([{ name: 'Test Insert 30ml', category: 'Produk Jadi', quantity: 1, selling_price: 10 }])
      .select(); // we must .select() to get data back in v2
      
    if (insertError) {
        console.error('Insert error details:', insertError);
    } else {
        console.log('Insert success!', insertData);
        // Clean it up
        await supabase.from('stocks').delete().eq('id', insertData[0].id);
    }
}

checkStocksTable();
