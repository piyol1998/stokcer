
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_TOKEN = "8714895102:AAHNzdxP0Z1TXKBo5BnLmhZLQTawpvMU9MA"

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
      if (text === '/start' || text === '/myid') {
         await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 Halo! ID Telegram Anda adalah:\n\n<code>${chatId}</code>\n\nSalin ID di atas dan masukkan ke pengaturan Stokcer Anda.`,
            parse_mode: "HTML"
          }),
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
