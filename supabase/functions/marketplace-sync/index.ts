import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

serve(async (req) => {
  const { action, code, userId } = await req.json()
  
  // 1. Setup Supabase Client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  )

  if (action === 'exchange_tiktok_token') {
    // Fetch Credentials from Database
    const { data: settings } = await supabase
      .from('user_settings')
      .select('marketplace_creds')
      .eq('user_id', userId)
      .single()

    const tiktok = settings?.marketplace_creds?.tiktok

    if (!tiktok?.appKey || !tiktok?.appSecret) {
      return new Response(JSON.stringify({ error: "Missing App Key or Secret" }), { status: 400 })
    }

    // 2. Call TikTok API to Exchange Code for Token
    const url = `https://auth.tiktok-shops.com/api/v2/token/get?app_key=${tiktok.appKey}&app_secret=${tiktok.appSecret}&auth_code=${code}&grant_type=authorized_code`
    
    const res = await fetch(url)
    const tokenData = await res.json()

    if (tokenData.code !== 0) {
      return new Response(JSON.stringify({ error: tokenData.message }), { status: 400 })
    }

    // 3. Save Access Token and Expiry back to DB
    const newCreds = {
      ...settings.marketplace_creds,
      tiktok: {
        ...tiktok,
        status: 'connected',
        access_token: tokenData.data.access_token,
        refresh_token: tokenData.data.refresh_token,
        access_token_expire_in: tokenData.data.access_token_expire_in,
        connected_at: new Date().toISOString()
      }
    }

    await supabase
      .from('user_settings')
      .update({ marketplace_creds: newCreds })
      .eq('user_id', userId)

    return new Response(JSON.stringify({ success: true, shop_name: tokenData.data.seller_name }), { status: 200 })
  }

  return new Response("Not found", { status: 404 })
})
