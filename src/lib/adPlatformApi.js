
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Invokes the secure 'meta-oauth' Edge Function.
 */
async function callMetaFunction(body) {
  const { data, error } = await supabase.functions.invoke('meta-oauth', { body });
  
  if (error) {
     let msg = error.message;
     try {
        const json = await error.context.json();
        msg = json.error || msg;
     } catch(e) {}
     throw new Error(msg);
  }
  return data;
}

export const adPlatformApi = {
  // Check if connected by querying DB directly (RLS protected)
  checkConnection: async () => {
      const { data, error } = await supabase
          .from('meta_connections')
          .select('ad_account_name, ad_account_id, updated_at')
          .eq('platform', 'meta')
          .maybeSingle();
      
      if (error) throw error;
      return data;
  },

  // Exchange code for token securely on backend
  exchangeCode: (code, redirectUri, state) => {
      return callMetaFunction({ 
          action: 'exchange', 
          code, 
          redirectUri, 
          state 
      });
  },

  // Disconnect
  disconnect: () => {
      return callMetaFunction({ action: 'disconnect' });
  },
  
  // Launch Campaign (Mock/Placeholder for now as per previous structure)
  launchCampaign: async (campaignData) => {
      // For a real implementation, this would call another edge function 'meta-ads-manager'
      // that uses the stored access_token from meta_connections table
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true, id: 'mock_campaign_id_123' };
  },

  generateCopy: (prompt) => {
      const copy = `🔥 SPECIAL OFFER: ${prompt} 🔥\n\nUpgrade with our premium ${prompt}. Limited stock!\n\n✅ Premium Quality\n✅ Fast Shipping\n\nShop Now! 🚀 #Promo`;
      return Promise.resolve({ copy });
  }
};
