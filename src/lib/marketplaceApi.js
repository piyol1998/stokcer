import { supabase } from './customSupabaseClient';

export const marketplaceApi = {
  /**
   * Syncs all products across connected platforms.
   * Note: Online Store sync is currently disabled/manual only.
   */
  async syncAllProducts(userId) {
    try {
      // Trigger Marketplace Sync (Shopee/Tokopedia via Edge Function)
      const { data, error } = await supabase.functions.invoke('marketplace-sync', {
        body: { action: 'sync_products', userId }
      });
      
      if (error) {
        console.warn("Marketplace sync function warning:", error);
      }

      return { success: true, syncedCount: 0 };
    } catch (error) {
      console.error("Sync Error:", error);
      throw error;
    }
  },

  /**
   * Helper to create link entry
   */
  async linkProductToPlatform(userId, stockId, platform, externalId) {
     const { error } = await supabase.from('marketplace_links').upsert({
         user_id: userId,
         stock_id: stockId,
         platform: platform,
         external_product_id: externalId,
         last_synced_at: new Date().toISOString(),
         sync_status: 'synced'
     }, { onConflict: 'stock_id, platform' });
     
     if (error) console.error(`Failed to link ${platform}:`, error);
  },

  /**
   * Fetches new orders from connected platforms and updates local stock.
   */
  async fetchNewOrders(userId) {
    // Marketplace Orders (Shopee/Tokopedia via Edge Function)
    const { data, error } = await supabase.functions.invoke('marketplace-sync', {
      body: { action: 'fetch_orders', userId }
    });
    
    if (error) {
       console.warn("Marketplace sync function warning:", error);
    }
    return data || { success: true };
  },

  /**
   * Pushes a specific product to all connected platforms.
   */
  async pushProductUpdate(stockId, payload) {
    // Push to Marketplaces via Edge Function
    const { data, error } = await supabase.functions.invoke('marketplace-sync', {
      body: { action: 'push_update', stockId, payload }
    });
    
    if (error) {
      console.warn("Marketplace sync function warning:", error);
    }
    return data || { success: true };
  }
};