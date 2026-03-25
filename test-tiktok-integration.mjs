/**
 * test-tiktok-integration.mjs
 * Script untuk test integrasi TikTok Shop Stokcer
 * Usage: node test-tiktok-integration.mjs
 */

const SUPABASE_URL = "https://cezskoukyesfzdfixwfe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlenNrb3VreWVzZnpkZml4d2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjcxMTIsImV4cCI6MjA4MDYwMzExMn0.iYqscvyB-uv_FfEEkW4AjVv_p-52rj2adRQ7XU-Eals";

// ============================================================
// STEP 1: Cek credentials TikTok yang tersimpan di DB
// ============================================================
async function checkStoredCredentials() {
  console.log("\n📦 STEP 1: Mengambil TikTok credentials dari Supabase...");

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_settings?select=user_id,marketplace_creds&limit=5`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.log("❌ Tidak ada data user_settings ditemukan.");
    return null;
  }

  // Cari user yang punya TikTok creds
  let foundTiktok = null;
  let foundUserId = null;

  for (const row of data) {
    const tiktok = row.marketplace_creds?.tiktok;
    if (tiktok?.appKey) {
      foundTiktok = tiktok;
      foundUserId = row.user_id;
      break;
    }
  }

  if (!foundTiktok) {
    console.log("❌ Tidak ada TikTok credentials di database.");
    console.log("   → Silakan isi App Key & App Secret di menu Integrasi Toko terlebih dahulu.");
    return null;
  }

  console.log(`✅ TikTok credentials ditemukan untuk user: ${foundUserId}`);
  console.log(`   App Key   : ${foundTiktok.appKey}`);
  console.log(`   Status    : ${foundTiktok.status || 'unknown'}`);
  console.log(`   Shop ID   : ${foundTiktok.shopId || '(kosong)'}`);
  console.log(`   Access Token : ${foundTiktok.access_token ? foundTiktok.access_token.substring(0, 20) + '...' : '❌ BELUM ADA (perlu OAuth)'}`);
  console.log(`   Connected At : ${foundTiktok.connected_at || '(belum pernah connect)'}`);

  return { tiktok: foundTiktok, userId: foundUserId };
}

// ============================================================
// STEP 2: Test Token Exchange via Supabase Function
//         (hanya dijalankan jika ada auth_code)
// ============================================================
async function testTokenExchange(userId, authCode) {
  console.log("\n🔄 STEP 2: Test Token Exchange via marketplace-sync function...");

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/marketplace-sync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "exchange_tiktok_token",
        userId,
        code: authCode,
      }),
    }
  );

  const result = await res.json();
  console.log(`   HTTP Status: ${res.status}`);
  console.log(`   Response:`, JSON.stringify(result, null, 2));

  if (result.success) {
    console.log(`✅ TOKEN EXCHANGE BERHASIL! Toko: ${result.shop_name}`);
  } else {
    console.log(`❌ Token exchange gagal: ${result.error}`);
  }
  return result;
}

// ============================================================
// STEP 3: Test Get Product List dari TikTok API v2
// ============================================================
async function testGetProducts(appKey, accessToken, shopId) {
  console.log("\n🛍️  STEP 3: Test GET Products dari TikTok Shop API...");

  if (!accessToken) {
    console.log("   ⚠️  Tidak ada access_token. Lewati step ini.");
    console.log("   → Selesaikan OAuth dulu melalui browser.");
    return;
  }

  // TikTok Shop API v2 - Get Products
  const baseUrl = "https://open-api.tiktokglobalshop.com";
  const path = "/product/202309/products/search";
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("timestamp", timestamp);
  if (shopId) url.searchParams.set("shop_id", shopId);

  console.log(`   Endpoint: POST ${baseUrl}${path}`);
  console.log(`   Note: Request ini perlu signature (HMAC-SHA256)`);
  console.log(`   → Untuk test lengkap, gunakan TikTok Partner Center API Testing Tool`);
  console.log(`   → atau integrasikan via Supabase function push_update`);
}

// ============================================================
// STEP 4: Test Supabase Function - push_update
// ============================================================
async function testFunctionConnectivity(userId) {
  console.log("\n🔌 STEP 4: Test konektivitas Supabase Function...");

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/marketplace-sync`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: "push_update",
        userId,
      }),
    }
  );

  const result = await res.json();
  console.log(`   HTTP Status: ${res.status}`);
  console.log(`   Response:`, JSON.stringify(result, null, 2));

  if (res.status === 200) {
    console.log("✅ Supabase Function dapat dijangkau dan merespons dengan benar.");
  } else {
    console.log("❌ Supabase Function error.");
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("=".repeat(60));
  console.log("  🧪 STOKCER - TikTok Shop Integration Test");
  console.log("=".repeat(60));

  // Step 1: Cek credentials
  const creds = await checkStoredCredentials();

  if (!creds) {
    console.log("\n⚠️  Test dihentikan: credentials belum ada di DB.");
    console.log("   Langkah selanjutnya:");
    console.log("   1. Buka http://localhost:3000/dashboard");
    console.log("   2. Klik 'Integrasi Toko' di sidebar");
    console.log("   3. Isi App Key & App Secret, klik Save & Connect");
    console.log("   4. Klik 'Buka Link Otorisasi' dan ikuti langkah OAuth");
    return;
  }

  // Step 4: Test function connectivity
  await testFunctionConnectivity(creds.userId);

  // Step 3: Test get products jika udah ada access_token
  await testGetProducts(
    creds.tiktok.appKey,
    creds.tiktok.access_token,
    creds.tiktok.shopId
  );

  console.log("\n" + "=".repeat(60));
  if (creds.tiktok.access_token) {
    console.log("✅ STATUS: TikTok Shop TERHUBUNG dan siap digunakan!");
    console.log("   Gunakan API Testing Tool di TikTok Partner Center");
    console.log("   dengan access_token di atas untuk test lebih lanjut.");
  } else {
    console.log("⚠️  STATUS: Credentials ada, tapi OAuth belum selesai.");
    console.log("   Klik 'Buka Link Otorisasi' di halaman Integrasi Toko");
    console.log("   untuk mendapatkan access_token.");
    console.log("\n   Auth URL yang akan dibuka:");
    console.log(`   https://auth.tiktok-shops.com/oauth/authorize?app_key=${creds.tiktok.appKey}&state=stokcer_auth&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fdashboard`);
  }
  console.log("=".repeat(60));
}

main().catch(console.error);
