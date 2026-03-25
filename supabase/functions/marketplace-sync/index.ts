import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: { action?: string; code?: string; userId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { action, code, userId } = body

  if (!action || !userId) {
    return new Response(JSON.stringify({ error: 'Missing required fields: action, userId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Setup Supabase Admin Client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // ============================================================
  // ACTION: exchange_tiktok_token (OAuth Callback)
  // ============================================================
  if (action === 'exchange_tiktok_token') {
    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing auth code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ambil credentials dari DB
    const { data: settings, error: dbError } = await supabase
      .from('user_settings')
      .select('marketplace_creds')
      .eq('user_id', userId)
      .single()

    if (dbError || !settings?.marketplace_creds?.tiktok) {
      return new Response(JSON.stringify({ 
        error: 'TikTok credentials tidak ditemukan. Pastikan App Key & App Secret sudah disimpan terlebih dahulu.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const tiktok = settings.marketplace_creds.tiktok

    if (!tiktok.appKey || !tiktok.appSecret) {
      return new Response(JSON.stringify({ 
        error: 'App Key atau App Secret belum diisi di pengaturan integrasi.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Request token ke TikTok API v2
    const tokenUrl = `https://auth.tiktok-shops.com/api/v2/token/get?app_key=${tiktok.appKey}&app_secret=${tiktok.appSecret}&auth_code=${code}&grant_type=authorized_code`
    
    let tokenData: Record<string, unknown>
    try {
      const res = await fetch(tokenUrl)
      tokenData = await res.json()
    } catch (fetchErr) {
      return new Response(JSON.stringify({ error: `Gagal menghubungi TikTok API: ${fetchErr}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (tokenData.code !== 0) {
      return new Response(JSON.stringify({ 
        error: `TikTok API Error (${tokenData.code}): ${tokenData.message}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Simpan token ke DB
    const tokenPayload = tokenData.data as Record<string, unknown>
    const newCreds = {
      ...settings.marketplace_creds,
      tiktok: {
        ...tiktok,
        status: 'connected',
        access_token: tokenPayload.access_token,
        refresh_token: tokenPayload.refresh_token,
        access_token_expire_in: tokenPayload.access_token_expire_in,
        refresh_token_expire_in: tokenPayload.refresh_token_expire_in,
        open_id: tokenPayload.open_id,
        connected_at: new Date().toISOString()
      }
    }

    const { error: updateError } = await supabase
      .from('user_settings')
      .update({ marketplace_creds: newCreds, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (updateError) {
      return new Response(JSON.stringify({ error: `Gagal menyimpan token: ${updateError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      shop_name: tokenPayload.seller_name ?? tokenPayload.open_id ?? 'TikTok Shop'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // ============================================================
  // ACTION: fetch_orders
  // ============================================================
  if (action === 'fetch_orders') {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('marketplace_creds')
      .eq('user_id', userId)
      .single()
    
    const tiktok = settings?.marketplace_creds?.tiktok
    if (!tiktok?.access_token) {
      return new Response(JSON.stringify({ error: 'TikTok belum terhubung.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // TODO: Implementasi fetch orders dari TikTok Shop API v2
    // GET https://open-api.tiktokglobalshop.com/order/202309/orders/search
    return new Response(JSON.stringify({ success: true, orders_count: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // ============================================================
  // ACTION: push_update (Push stock to TikTok)
  // ============================================================
  if (action === 'push_update') {
    // TODO: Implementasi update stok ke TikTok Shop API v2
    // PUT https://open-api.tiktokglobalshop.com/product/202309/skus/stock/update
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ error: 'Action not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
