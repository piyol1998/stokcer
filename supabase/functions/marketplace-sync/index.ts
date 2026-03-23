import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

serve(async (req) => {
  const { action, code, userId } = await req.json()
  
  // 1. Setup Supabase Client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  )

  // 2. TOKEN EXCHANGE ACTION (OAuth Callback)
  if (action === 'exchange_tiktok_token') {
    const { data: settings } = await supabase.from('user_settings').select('marketplace_creds').eq('user_id', userId).single()
    const tiktok = settings?.marketplace_creds?.tiktok

    const url = `https://auth.tiktok-shops.com/api/v2/token/get?app_key=${tiktok.appKey}&app_secret=${tiktok.appSecret}&auth_code=${code}&grant_type=authorized_code`
    const res = await fetch(url)
    const tokenData = await res.json()

    if (tokenData.code !== 0) return new Response(JSON.stringify({ error: tokenData.message }), { status: 400 })

    const newCreds = { ...settings.marketplace_creds, tiktok: { ...tiktok, status: 'connected', access_token: tokenData.data.access_token, refresh_token: tokenData.data.refresh_token, connected_at: new Date().toISOString() } }
    await supabase.from('user_settings').update({ marketplace_creds: newCreds }).eq('user_id', userId)

    return new Response(JSON.stringify({ success: true, shop_name: tokenData.data.seller_name }), { status: 200 })
  }

  // 3. FETCH NEW ORDERS FROM TIKTOK
  if (action === 'fetch_orders') {
    // Logika penarikan pesanan TikTok Shop API v2
    // 1. Ambil data Token dari DB
    // 2. Request ke https://open-api.tiktokglobalshop.com/order/202309/orders/search
    // 3. Update stok lokal di Stokcer
    return new Response(JSON.stringify({ success: true, orders_count: 0 }), { status: 200 })
  }

  // 4. PUSH STOCK UPDATE TO TIKTOK
  if (action === 'push_update') {
    // Logika update stok TikTok Shop API v2
    // 1. Request ke https://open-api.tiktokglobalshop.com/product/202309/skus/stock/update
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  }

  return new Response("Action not found", { status: 404 })
})
