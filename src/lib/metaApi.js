import { supabase } from '@/lib/customSupabaseClient';

/**
 * Meta (Facebook) Marketing API Integration
 * Handles OAuth flow and Campaign Management
 */

const GRAPH_API_VERSION = 'v18.0';
// In a real app, these would be env vars. 
// For this environment, we simulate the OAuth redirect or use manual token input.
const FACEBOOK_APP_ID = '1234567890'; 

export const metaApi = {
  /**
   * Get login URL for Facebook OAuth
   */
  getLoginUrl: (redirectUri) => {
    const scope = 'ads_management,ads_read,business_management';
    const state = Math.random().toString(36).substring(7);
    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
  },

  /**
   * Fetch user's ad accounts from Meta Graph API
   * @param {string} accessToken 
   */
  getAdAccounts: async (accessToken) => {
    try {
      // Simulation for demo/testing without real Meta App
      if (accessToken === 'demo_token' || accessToken.startsWith('demo_')) {
        return [
          { id: 'act_101202303', name: 'Stokcer Business Account', currency: 'IDR' },
          { id: 'act_555444333', name: 'Personal Ad Account', currency: 'IDR' }
        ];
      }

      // Real API Call
      const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/adaccounts?fields=name,account_id,currency&access_token=${accessToken}`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error.message);
      return data.data;
    } catch (error) {
      console.error("Meta API Error:", error);
      throw error;
    }
  },

  /**
   * Create a Campaign on Meta
   */
  createCampaign: async (accessToken, adAccountId, campaignData) => {
    try {
      const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${adAccountId}/campaigns`;
      
      const payload = {
        name: campaignData.name,
        objective: campaignData.objective || 'OUTCOME_SALES',
        status: 'PAUSED', // Safety default
        special_ad_categories: [],
        access_token: accessToken
      };

      // Mock Success for Demo
      if (accessToken === 'demo_token' || accessToken.startsWith('demo_')) {
         // Simulate network delay
         await new Promise(resolve => setTimeout(resolve, 1500));
         return { id: 'cam_' + Math.floor(Math.random() * 1000000), success: true };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      return data;
    } catch (error) {
      console.error("Meta Campaign Creation Error:", error);
      throw error;
    }
  },

  /**
   * Get Insights/Metrics for a campaign
   */
  getCampaignInsights: async (accessToken, campaignId) => {
      // Mock data for demo
      if (accessToken === 'demo_token' || accessToken.startsWith('demo_')) {
          return {
              spend: Math.floor(Math.random() * 5000000),
              impressions: Math.floor(Math.random() * 50000),
              clicks: Math.floor(Math.random() * 2000),
              cpc: 2500
          };
      }
      return null;
  }
};