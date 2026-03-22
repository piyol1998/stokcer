
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const TELEGRAM_TOKEN = "8714895102:AAHNzdxP0Z1TXKBo5BnLmhZLQTawpvMU9MA"
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || "";

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

    // HANDLE INCOMING MESSAGES (WEBHOOK)
    if (body.message && body.message.chat) {
      const incomingChatId = body.message.chat.id
      const text = body.message.text
      const firstName = body.message.from?.first_name || "Owner"

      if (text === '/start' || text === '/myid') {
         await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: incomingChatId,
            text: `👋 Halo ${firstName}! ID Telegram Anda adalah: <code>${incomingChatId}</code>\n\nMasukkan ID ini di menu Settings website agar saya bisa membaca data bisnis Anda.`,
            parse_mode: "HTML"
          }),
        })
        return new Response('ok', { status: 200 })
      }

      // INTEGRASI AI STRATEGIST
      const { data: profile } = await supabase.from('profiles')
        .select('*')
        .eq('telegram_chat_id', incomingChatId.toString())
        .maybeSingle()

      if (!profile) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: incomingChatId,
            text: `⚠️ Maaf, saya belum mengenali Anda. Tambahkan ID <code>${incomingChatId}</code> ke Settings website dulu ya!`,
            parse_mode: "HTML"
          }),
        })
        return new Response('ok', { status: 200 })
      }

      const userId = profile.id
      const [stocks, materials, history, employees, settingsRes] = await Promise.all([
        supabase.from('stocks').select('*').eq('user_id', userId),
        supabase.from('raw_materials').select('*').eq('user_id', userId),
        supabase.from('production_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('employees').select('name, role').eq('owner_id', userId),
        supabase.from('user_settings').select('marketplace_creds').eq('user_id', userId).single()
      ])

      const aiCreds = settingsRes.data?.marketplace_creds?.ai || {}
      const aiProvider = aiCreds.provider || 'gemini'
      
      const context = `
      Anda adalah AI Strategist Bisnis untuk ${profile.business_name}.
      Data Bisnis:
      - Stok Produk: ${JSON.stringify(stocks.data || [])}
      - Bahan Baku: ${JSON.stringify(materials.data || [])}
      - Tim: ${JSON.stringify(employees.data || [])}
      
      Tugas: Jawab pertanyaan dengan data di atas secara cerdas & singkat. Gunakan Markdown.
      `

      let replyText = ""
      try {
        if (aiProvider === 'openai' || aiProvider === 'deepseek') {
          const isDeep = aiProvider === 'deepseek'
          const apiKey = isDeep ? aiCreds.deepseek_api_key : aiCreds.openai_api_key
          const baseURL = isDeep ? 'https://api.deepseek.com' : 'https://api.openai.com/v1'
          
          if (!apiKey) throw new Error(`${aiProvider.toUpperCase()} API Key belum diatur.`)

          const aiRes = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: isDeep ? 'deepseek-chat' : 'gpt-4o-mini',
              messages: [{ role: 'system', content: context }, { role: 'user', content: text }]
            })
          })
          const aiData = await aiRes.json()
          replyText = aiData?.choices?.[0]?.message?.content || "Gagal mendapatkan respon AI."
        } else {
          const apiKey = aiCreds.gemini_api_key || GEMINI_API_KEY
          const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-pro"]
          let successText = ""
          let errorReports: string[] = []
          const cleanKey = encodeURIComponent(apiKey.trim())

          for (const mId of models) {
            try {
              for (const ver of ["v1", "v1beta"]) {
                const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models/${mId}:generateContent?key=${cleanKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: `${context}\n\nOwner: ${text}` }] }] })
                })
                const data = await res.json()
                if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                  successText = data.candidates[0].content.parts[0].text
                  break
                } else if (data.error) {
                  errorReports.push(`[${ver}/${mId}: ${data.error.message}]`)
                }
              }
              if (successText) break
            } catch (e) {
              errorReports.push(`[Error ${mId}: ${e.message}]`)
            }
          }
          
          if (!successText && aiCreds.openai_api_key) {
            console.log("LOG: Gemini gagal, mencoba ban serep OpenAI...")
            const retryRes = await fetch(`https://api.openai.com/v1/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiCreds.openai_api_key}` },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: context }, { role: 'user', content: text }]
              })
            })
            const retryData = await retryRes.json()
            successText = retryData?.choices?.[0]?.message?.content || ""
          }

          replyText = successText || `❌ Kunci Google API Anda bermasalah (Not Found). Silakan gunakan kunci 'OpenAI' untuk hasil lebih stabil.`
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: incomingChatId, text: replyText || "AI sedang sibuk.", parse_mode: "Markdown" }),
        })
      } catch (err) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: incomingChatId, text: `❌ Error: ${err.message}` }),
        })
      }
      return new Response('ok', { status: 200 })
    }

    // HANDLE OUTGOING NOTIFICATIONS
    const targetChatId = body.chatId || body.chat_id
    const message = body.message

    if (targetChatId && message) {
      const cleanId = typeof targetChatId === 'string' ? parseInt(targetChatId, 10) : targetChatId
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cleanId, text: message, parse_mode: "HTML" }),
      })
      const result = await res.json()
      return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    return new Response(JSON.stringify({ error: "Missing data" }), { status: 400 })

  } catch (error) {
    console.error("ERROR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
