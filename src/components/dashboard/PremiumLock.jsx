
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Crown, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const PremiumLock = ({ 
  title = "Fitur Premium", 
  message = "Upgrade plan Anda untuk mengakses fitur ini.", 
  showButton = true 
}) => {
  const navigate = useNavigate();
  const { trialEndDate, isTrialExpired } = useSubscription();
  const { userRole } = useAuth();

  // SAFETY CHECK: If user is staff, this screen should generally NOT appear for normal trial expiration
  // unless the owner is genuinely expired.
  // However, sometimes race conditions happen. 
  // If we are staff and somehow seeing this, let's verify if we are truly expired via hook.

  // Format the expiration date and time if available
  const formattedDate = trialEndDate 
    ? new Date(trialEndDate).toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) 
    : null;
    
  const formattedTime = trialEndDate
    ? new Date(trialEndDate).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred Backdrop */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
      
      {/* Content Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-[#0f172a] border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl overflow-hidden"
      >
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-3">
            {title}
          </h3>
          
          <p className="text-slate-400 mb-6 leading-relaxed">
            {message}
          </p>

          {isTrialExpired && formattedDate && (
             <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                    Berakhir Pada
                </p>
                <div className="flex flex-col gap-1 items-center justify-center text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        <span>Pukul {formattedTime} WIB</span>
                    </div>
                </div>
             </div>
          )}

          {showButton && (
            <div className="flex flex-col gap-3">
              {userRole === 'staff' ? (
                 <div className="bg-red-500/10 border border-red-500/20 p-3 rounded text-red-400 text-sm">
                    Hubungi pemilik bisnis (Owner) untuk memperpanjang langganan.
                 </div>
              ) : (
                <>
                  <Button 
                    onClick={() => navigate('/pricing')}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 font-bold h-11"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade ke Premium
                  </Button>
                  
                  <p className="text-xs text-slate-500 mt-2">
                    Mulai dari Rp 49.000/bulan. Batalkan kapan saja.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumLock;
