
import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user, ownerId, userRole, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Trial State
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  const [trialEndDate, setTrialEndDate] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    // If no user, reset and stop
    if (!user) {
      setLoading(false);
      setSubscription(null);
      return;
    }

    // --- CRITICAL CHANGE: STAFF BYPASS ---
    // If user is staff, we treat them as fully active immediately.
    // We DO NOT fetch subscription data for them.
    if (userRole === 'staff') {
        setSubscription({ status: 'active', plan: { name: 'Employee Access' } });
        setIsTrialActive(false);
        setIsTrialExpired(false);
        setTrialEndDate(null);
        setDaysRemaining(0);
        setLoading(false);
        return;
    }

    let mounted = true;

    const fetchData = async () => {
      try {
        await Promise.all([
           fetchPlans(),
           fetchSubscriptionAndStatus(user.id) // Only fetch for Owner (self)
        ]);
      } catch (err) {
        console.error("Subscription init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    // Update timer every minute (Only needed for Owners)
    const timer = setInterval(() => {
        if (trialEndDate && userRole !== 'staff') {
            updateTimeRemaining(trialEndDate);
        }
    }, 60000); 

    return () => { 
      mounted = false; 
      clearInterval(timer);
    };
  }, [user, ownerId, authLoading, userRole]); 

  const fetchPlans = async () => {
    try {
        const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });
        
        if (!error && data) setPlans(data);
    } catch(e) {
        console.error("Fetch plans failed", e);
    }
  };

  const fetchSubscriptionAndStatus = async (targetOwnerId) => {
    try {
        // Fetch Subscription Record for the OWNER
        const { data: subData } = await supabase
            .from('user_subscriptions')
            .select(`*, plan:subscription_plans(*)`)
            .eq('user_id', targetOwnerId)
            .maybeSingle();

        // Fetch Owner Account Creation Date
        // FIX: Use maybeSingle() instead of single() to avoid PGRST116 error if row doesn't exist yet
        const { data: ownerStats } = await supabase
            .from('owner_stats_view')
            .select('created_at')
            .eq('user_id', targetOwnerId)
            .maybeSingle();

        // Case A: Active Paid Subscription (Owner paid)
        if (subData && subData.status === 'active') {
            setSubscription(subData);
            setIsTrialActive(false);
            setIsTrialExpired(false);
            setTrialEndDate(null);
            return;
        }

        // Case B: Trial Logic (For Owners Only)
        let calculatedTrialEnd = null;
        if (subData?.trial_end_date) {
            calculatedTrialEnd = new Date(subData.trial_end_date);
        } else if (ownerStats?.created_at) {
            const createdAt = new Date(ownerStats.created_at);
            calculatedTrialEnd = new Date(createdAt.getTime() + (7 * 24 * 60 * 60 * 1000)); // +7 Days
        } else {
            // Fallback: If we can't find creation date (e.g. view hasn't updated or user just created), 
            // assume trial starts NOW.
            // This prevents immediate "Expired" state for brand new users if the view is lagging.
            const now = new Date();
            calculatedTrialEnd = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); 
        }

        setSubscription(subData);
        setTrialEndDate(calculatedTrialEnd);
        updateTimeRemaining(calculatedTrialEnd);

    } catch (e) {
        console.error("Fetch sub/status failed", e);
        setSubscription(null);
    }
  };

  const updateTimeRemaining = (endDate) => {
    if (!endDate) return;
    
    const now = new Date();
    const diffTime = endDate - now;

    if (diffTime > 0) {
        // Trial is ACTIVE
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

        setIsTrialActive(true);
        setIsTrialExpired(false);
        setDaysRemaining(diffDays);
        setHoursRemaining(diffHours);
        setMinutesRemaining(diffMinutes);
    } else {
        // Trial is EXPIRED
        setIsTrialActive(false);
        setIsTrialExpired(true);
        setDaysRemaining(0);
        setHoursRemaining(0);
        setMinutesRemaining(0);
    }
  };

  const checkFeatureAccess = (featureKey) => {
    // STAFF ALWAYS ALLOWED (Assuming they only see what owner allows via UI)
    if (userRole === 'staff') return true;

    // 1. If Active Paid Subscription -> ALLOW ALL
    if (subscription?.status === 'active') return true;

    // 2. Identify Premium-Only Features
    const premiumOnlyFeatures = [
        'ai_ads', 
        'marketplace_sync', 
        'employee_management'
    ];

    if (premiumOnlyFeatures.includes(featureKey)) {
        return false;
    }

    // 3. If Trial Expired -> BLOCK CORE FEATURES
    if (isTrialExpired) {
        const expiredBlockedFeatures = [
            'unlimited_products', 
            'advanced_analytics',
            'dashboard_stats',
            'pos_access' 
        ];
        if (expiredBlockedFeatures.includes(featureKey)) return false;
    }

    return true; 
  };

  const getFeatureLimit = (featureKey) => {
    // STAFF -> Unlimited logic for UI purposes
    if (userRole === 'staff') return Infinity;

    // 1. Paid Subscription -> Unlimited
    if (subscription?.status === 'active') return Infinity;

    // 2. Trial Active (Free Tier)
    if (isTrialActive) {
        if (featureKey === 'max_materials') return 5;
        return Infinity;
    }

    // 3. Trial Expired -> Restricted
    if (isTrialExpired) return 0;
    
    // Default fallback
    if (featureKey === 'max_materials') return 5;
    
    return 0;
  };

  return (
    <SubscriptionContext.Provider value={{ 
      subscription, 
      plans, 
      loading, 
      checkFeatureAccess,
      getFeatureLimit,
      refreshSubscription: () => userRole !== 'staff' && fetchSubscriptionAndStatus(user?.id),
      isTrialActive,
      isTrialExpired,
      trialEndDate,
      daysRemaining,
      hoursRemaining,
      minutesRemaining,
      userRole
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
