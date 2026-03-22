
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TELEGRAM_TOKEN = "8714895102:AAHNzdxP0Z1TXKBo5BnLmhZLQTawpvMU9MA"
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('DEEPSEEK_API_KEY') || ""; // Gunakan Gemini sebagai default

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const rawBody = await req.text()
    const body = JSON.parse(rawBody)
    console.log("LOG: Menerima request body:", rawBody)

    // Handle Telegram Webhook (Incoming)
    if (body.message && body.message.chat) {
      const chatId = body.message.chat.id
      const text = body.message.text
      const firstName = body.message.from?.first_name || "Owner"

      console.log(`LOG: Pesan masuk dari ${firstName} (${chatId}): ${text}`)

      if (text === '/start' || text === '/myid') {
         await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 Halo ${firstName}! ID Telegram Anda adalah:\n\n<code>${chatId}</code>\n\nSalin ID di atas dan masukkan ke pengaturan Stokcer Anda agar saya bisa mengenali bisnis Anda.`,
            parse_mode: "HTML"
          }),
        })
        return new Response('ok', { status: 200 })
      }

      // INTEGRASI OTAK AI (AI STRATEGIST)
      // 1. Cari profil berdasarkan chatId
      const { data: profile } = await supabase.from('profiles')
        .select('*')
        .eq('telegram_chat_id', chatId.toString())
        .maybeSingle()

      if (!profile) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ Maaf ${firstName}, saya belum bisa mengenali bisnis Anda. Silakan masukkan ID <code>${chatId}</code> di menu Settings website Stokcer terlebih dahulu ya!`,
            parse_mode: "HTML"
          }),
        })
        return new Response('ok', { status: 200 })
      }

      // 2. Jika profil ditemukan, ambil data bisnis (Stocks, Raw Materials, History)
      const userId = profile.id
      const [stocks, rawMaterials, history, employees] = await Promise.all([
        supabase.from('stocks').select('*').eq('user_id', userId),
        supabase.from('raw_materials').select('*').eq('user_id', userId),
        supabase.from('production_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
        supabase.from('employees').select('name, role').eq('owner_id', userId)
      ])

      // 3. Ambil API Key dari user_settings (sama seperti di website)
      const { data: settings } = await supabase.from('user_settings')
        .select('marketplace_creds')
        .eq('user_id', userId)
        .single()
      
      const aiCreds = settings?.marketplace_creds?.ai || {}
      const activeApiKey = aiCreds.gemini_api_key || aiCreds.openai_api_key || aiCreds.deepseek_api_key || GEMINI_API_KEY

      if (!activeApiKey) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ Halo ${firstName}, saya belum menemukan kunci API AI di pengaturan Anda. Silakan atur di menu Integrasi website Stokcer ya!`,
            parse_mode: "HTML"
          }),
        })
        return new Response('ok', { status: 200 })
      }

      const context = `
      Anda adalah AI Strategist Bisnis untuk ${profile.business_name}.
      Pemilik: ${profile.business_name} (ID: ${chatId})
      Data Bisnis Saat Ini:
      - Stok Produk Jadi: ${JSON.stringify(stocks.data || [])}
      - Stok Bahan Baku: ${JSON.stringify(rawMaterials.data || [])}
      - Riwayat Produksi Terakhir: ${JSON.stringify(history.data || [])}
      - Tim/Karyawan: ${JSON.stringify(employees.data || [])}

      Tugas: Jawab pertanyaan owner dengan cerdas, ramah, dan solutif di Telegram. 
      Berikan data yang akurat jika ditanya stok atau penjualan. 
      Format jawaban gunakan Markdown atau HTML agar rapi di Telegram.
      `

      // 4. Panggil AI Engine (Gemini)
      try {
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${context}\n\nPertanyaan Owner: ${text}` }] }]
          })
        })
        const aiData = await aiResponse.json()
        const replyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, otak AI saya sedang istirahat. Bisa ulangi pertanyaannya?"

        // 5. Kirim balasan ke Telegram
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: "Markdown"
          }),
        })
      } catch (err) {
        console.error("AI Error:", err)
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: "❌ Terjadi kesalahan saat memproses jawaban AI." }),
        })
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    // Handle App Notification (Outgoing)
    const chatId = body.chatId || body.chat_id
    const message = body.message

    if (chatId && message) {
      // FORCE PARSE TO INTEGER if needed
      const cleanChatId = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId
      
      console.log(`LOG: Mengirim notifikasi ke ID ${cleanChatId}`)
      
      const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: message,
          parse_mode: "HTML"
        }),
      })
      
      const tgResult = await tgResponse.json()
      console.log("LOG: Hasil dari Telegram:", JSON.stringify(tgResult))
      
      return new Response(JSON.stringify(tgResult), {
        status: tgResponse.status,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
      })
    }

    return new Response(JSON.stringify({ error: "No chatId or message provided" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (error) {
    console.error("LOG ERROR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
