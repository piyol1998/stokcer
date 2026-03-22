
import fetch from 'node-fetch';

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlenNrb3VreWVzZnpkZml4d2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjcxMTIsImV4cCI6MjA4MDYwMzExMn0.iYqscvyB-uv_FfEEkW4AjVv_p-52rj2adRQ7XU-Eals";
const baseUrl = "https://cezskoukyesfzdfixwfe.supabase.co/rest/v1";

async function check() {
    // Tebak nama tabel penjualan yang umum
    const tables = ['sales', 'orders', 'transactions', 'pesanan', 'pos_sales', 'marketplace_orders'];
    for (let table of tables) {
        try {
            const res = await fetch(`${baseUrl}/${table}?select=count`, {
                headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` }
            });
            if (res.ok) {
                const data = await res.json();
                console.log(`Table ${table}:`, data);
            } else if (res.status === 404) {
                // console.log(`Table ${table}: 404 Not Found`);
            } else {
                console.log(`Table ${table}: Status ${res.status}`);
            }
        } catch (e) {
            // console.log(`Table ${table} error:`, e.message);
        }
    }
}
check();
