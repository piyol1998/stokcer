import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/customSupabaseClient';

let stripePromise;
const getStripe = () => {
    if (!stripePromise) {
        stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
    }
    return stripePromise;
};

/**
 * Initiates a Stripe Checkout session
 * @param {Object} user - The user object
 * @param {Object} plan - The subscription plan object
 * @param {string} mode - 'subscription' or 'payment' (for lifetime)
 * @param {string} currency - 'IDR' or 'USD'
 */
export async function createStripeCheckoutSession(user, plan, mode = 'subscription', currency = 'USD') {
    const stripe = await getStripe();
    if (!stripe) throw new Error("Failed to load Stripe");

    // Call Supabase Edge Function to create session
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
            price: plan.price, // Note: You might need to handle price mapping backend-side if USD price is different
            planId: plan.id,
            planName: plan.name,
            mode: mode,
            currency: currency,
            userId: user.id,
            email: user.email,
            returnUrl: window.location.origin + '/subscription/success' // Or appropriate success page
        }
    });

    if (error) {
        console.error("Stripe Function Error:", error);
        throw new Error(error.message || "Failed to initiate payment");
    }

    if (!data?.sessionId) {
        throw new Error("No session ID returned from backend");
    }

    const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
    });

    if (stripeError) {
        throw stripeError;
    }
}
