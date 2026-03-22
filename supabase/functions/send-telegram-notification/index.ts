
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_TOKEN = "8613324489:AAE0SjA_e3GN9Go1iayrmDmuB7zB3P0g0kg"

serve(async (req) => {
  // Handle CORS for browser requests
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
    const body = await req.json()

    // 1. Logika untuk Webhook Telegram (Menerima Chat dari User)
    if (body.message) {
      const chatId = body.message.chat.id
      const text = body.message.text

      if (text === '/start' || text === '/myid') {
        const replyText = `👋 Halo! ID Telegram Anda adalah:\n\n<code>${chatId}</code>\n\nSalin ID di atas dan masukkan ke pengaturan Stokcer Anda.`
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: "HTML"
          }),
        })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    // 2. Logika untuk Notifikasi Internal (Dipanggil dari Aplikasi)
    const { chatId, message } = body

    if (!chatId || !message) {
      return new Response(JSON.stringify({ error: 'Missing chatId or message' }), { status: 400 })
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      }),
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
