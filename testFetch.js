const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlenNrb3VreWVzZnpkZml4d2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjcxMTIsImV4cCI6MjA4MDYwMzExMn0.iYqscvyB-uv_FfEEkW4AjVv_p-52rj2adRQ7XU-Eals";
const url = "https://cezskoukyesfzdfixwfe.supabase.co/rest/v1/raw_materials?select=*&limit=1";
fetch(url, { headers: { "apikey": apiKey, "Authorization": `Bearer ${apiKey}` } }).then(res => res.json()).then(console.log);
