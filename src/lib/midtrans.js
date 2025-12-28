import { supabase } from '@/lib/customSupabaseClient';

/**
 * Initiates a Midtrans transaction for a subscription plan
 * @param {Object} user - The user object
 * @param {Object} plan - The subscription plan object
 * @returns {Promise<string>} - Returns the Snap Token
 */
export async function createMidtransTransaction(user, plan) {
  const orderId = `SUB-${user.id.substring(0,8)}-${Date.now()}`;
  
  // 1. Get Snap Token from Edge Function
  const { data: { token }, error: functionError } = await supabase.functions.invoke('midtrans-token', {
    body: {
      orderId,
      amount: plan.price,
      planName: plan.name,
      customerDetails: {
        firstName: user.user_metadata?.first_name || 'Stokcer',
        lastName: user.user_metadata?.last_name || 'User',
        email: user.email,
        phone: user.phone || '08123456789'
      }
    }
  });

  if (functionError) throw new Error(`Failed to initialize payment: ${functionError.message}`);
  if (!token) throw new Error("No payment token received");

  // 2. Log pending transaction in DB
  const { error: dbError } = await supabase
    .from('midtrans_transactions')
    .insert({
      user_id: user.id,
      order_id: orderId,
      amount: plan.price,
      status: 'pending',
      snap_token: token,
      metadata: { plan_id: plan.id, plan_name: plan.name }
    });

  if (dbError) console.error("Failed to log transaction", dbError);

  return { token, orderId };
}

export async function updateTransactionStatus(orderId, status, transactionData = {}) {
    // Update local transaction log
    await supabase
        .from('midtrans_transactions')
        .update({ 
            status: status,
            metadata: transactionData
        })
        .eq('order_id', orderId);
}