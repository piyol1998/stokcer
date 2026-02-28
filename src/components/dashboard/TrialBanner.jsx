import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Crown, X, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';

function TrialBanner() {
  const { userRole } = useAuth();
  const { 
    subscription,
    loading, 
    daysRemaining, 
    hoursRemaining, 
    isTrialActive
  } = useSubscription();
  
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  // 1. Loading check
  if (loading) return null;

  // 2. STAFF CHECK: Staff never see trial alerts
  if (userRole === 'staff') return null;

  // 3. PREMIUM CHECK: Paid users never see trial alerts
  const isPremium = subscription?.status === 'active';
  if (isPremium) return null;

  // 4. VISIBILITY CHECK: Only show if user hasn't closed it
  if (!isVisible) return null;

  // 5. ACTIVE TRIAL CHECK: Only show if trial is actually running
  if (!isTrialActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative z-40"
      >
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 border-b border-white/10 shadow-lg relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              
              {/* Left Content */}
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="p-2 bg-white/20 rounded-full shrink-0 animate-pulse">
                    <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                      Masa Trial Aktif. <span className="bg-white/20 px-2 py-0.5 rounded text-white border border-white/20 text-xs sm:text-sm">
                        {daysRemaining} Hari {hoursRemaining} Jam Tersisa
                      </span>
                  </h3>
                  <p className="text-indigo-100 text-xs sm:text-sm mt-0.5">
                    Nikmati semua fitur premium sebelum masa percobaan berakhir.
                  </p>
                </div>
              </div>

              {/* Right Action */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button 
                    onClick={() => navigate('/pricing')}
                    className="bg-white text-indigo-600 hover:bg-indigo-50 border-0 font-bold shadow-lg shadow-black/10 w-full sm:w-auto whitespace-nowrap group transition-all transform hover:scale-105"
                  >
                    <Crown className="w-4 h-4 mr-2 text-amber-500 fill-amber-500" />
                    Aktifkan Premium
                    <Sparkles className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                  </Button>
                  
                  <button 
                    onClick={() => setIsVisible(false)}
                    className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-full transition-colors sm:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
              </div>

                {/* Close Button Desktop */}
                <button 
                  onClick={() => setIsVisible(false)}
                  className="absolute top-1/2 -translate-y-1/2 right-4 p-1 text-indigo-200 hover:text-white hover:bg-white/10 rounded-full transition-colors hidden sm:block"
                >
                  <X className="w-4 h-4" />
                </button>
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TrialBanner;