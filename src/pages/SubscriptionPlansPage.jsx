import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Sparkles, Shield, Zap, Loader2, AlertTriangle, Clock, Percent, Tag, Ticket, TrendingUp, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { createMidtransTransaction, updateTransactionStatus } from '@/lib/midtrans';

const SubscriptionPlansPage = () => {
  const { plans, subscription, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const [processingId, setProcessingId] = useState(null);
  const [snapLoaded, setSnapLoaded] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  
  useEffect(() => {
    const checkSnap = setInterval(() => {
      if (window.snap) {
        setSnapLoaded(true);
        clearInterval(checkSnap);
      }
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(checkSnap);
    }, 5000);

    const calculateTimeLeft = () => {
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const diff = endOfDay - now;

        if (diff > 0) {
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeLeft({ hours, minutes, seconds });
        }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => {
        clearInterval(checkSnap);
        clearTimeout(timeout);
        clearInterval(timer);
    };
  }, []);

  const handleApplyVoucher = () => {
    setVoucherError('');
    if (!voucherCode.trim()) return;

    if (voucherCode.toLowerCase() === 'piyol2025') {
        setAppliedVoucher({
            code: 'PIYOL2025',
            price: 1000,
            name: 'Special Voucher',
            originalPrice: 350000,
            interval: 'year'
        });
        toast({
            title: "Voucher Applied!",
            description: "Special price of Rp 1.000 unlocked.",
            variant: "success",
            className: "bg-emerald-500 border-emerald-600 text-white"
        });
    } else {
        setVoucherError('Invalid voucher code');
        setAppliedVoucher(null);
        toast({
            title: "Invalid Code",
            description: "The voucher code you entered is not valid.",
            variant: "destructive"
        });
    }
  };

  const handleRemoveVoucher = () => {
      setAppliedVoucher(null);
      setVoucherCode('');
      setVoucherError('');
  };

  const handleSubscribe = async (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (plan.price === 0) {
      toast({ title: "Already Active", description: "You are already on the Free plan." });
      return;
    }
    
    if (!snapLoaded) {
       toast({ 
           title: "System Not Ready", 
           description: "Payment gateway is loading. Please refresh the page.", 
           variant: "destructive" 
       });
       return;
    }

    setProcessingId(plan.id);
    
    try {
      const { token, orderId } = await createMidtransTransaction(user, plan);

      window.snap.pay(token, {
        onSuccess: async function(result) {
          await handlePaymentSuccess(plan, orderId, result);
        },
        onPending: async function(result) {
          toast({ 
            title: "Payment Pending", 
            description: "Please complete your payment to activate Premium.",
            variant: "default"
          });
          await updateTransactionStatus(orderId, 'pending', result);
          setProcessingId(null);
        },
        onError: async function(result) {
          toast({ 
            title: "Payment Failed", 
            description: "The transaction could not be completed.",
            variant: "destructive"
          });
          await updateTransactionStatus(orderId, 'failure', result);
          setProcessingId(null);
        },
        onClose: function() {
          setProcessingId(null);
        }
      });
      
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Initialization Failed", 
        description: error.message || "Could not start payment process.", 
        variant: "destructive" 
      });
      setProcessingId(null);
    }
  };

  const handlePaymentSuccess = async (plan, orderId, result) => {
      try {
        await updateTransactionStatus(orderId, 'success', result);

        const nextPeriod = new Date();
        if (plan.interval === 'year' || plan.interval === 'tahun') {
            nextPeriod.setFullYear(nextPeriod.getFullYear() + 1);
        } else {
            nextPeriod.setMonth(nextPeriod.getMonth() + 1);
        }

        const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
            user_id: user.id,
            plan_id: plan.id,
            status: 'active',
            midtrans_order_id: orderId,
            last_payment_date: new Date().toISOString(),
            current_period_end: nextPeriod.toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        await refreshSubscription();
        navigate('/subscription/success');

      } catch (err) {
          console.error("Post-payment error:", err);
          toast({
              title: "Activation Error",
              description: "Payment successful but activation failed. Contact support.",
              variant: "destructive"
          });
      } finally {
          setProcessingId(null);
      }
  };

  const isCurrentPlan = (planId) => {
    return subscription?.plan_id === planId || (subscription?.plan?.price === 0 && planId === plans.find(p => p.price === 0)?.id);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <Helmet>
        <title>Pricing Plans - Stokcer</title>
      </Helmet>

      <AnimatePresence>
        <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-gradient-to-r from-red-600 to-orange-600 text-white overflow-hidden relative z-20"
        >
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full animate-pulse">
                    <Clock className="w-4 h-4" />
                    <span className="font-bold text-sm tracking-wide">
                        Promo Hanya Hari Ini
                    </span>
                </div>
                <div className="font-medium flex items-center gap-2">
                        <span className="text-white/90">Penawaran Terbatas Berakhir Dalam:</span>
                        <span className="font-mono font-bold text-xl bg-black/20 px-2 py-0.5 rounded border border-white/10">
                        {String(timeLeft.hours).padStart(2, '0')} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                </div>
            </div>
        </motion.div>
      </AnimatePresence>

      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 relative">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-6">
                Invest in Financial Control
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                How much is <strong>lost inventory</strong> costing you each month? <br/>
                Our system pays for itself by preventing just one incident of theft or waste.
            </p>
            {!snapLoaded && (
                <div className="mt-4 flex items-center justify-center gap-2 text-yellow-500 text-sm">
                    <AlertTriangle size={14} />
                    <span>Connecting to payment gateway...</span>
                </div>
            )}
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <TrendingUp className="w-8 h-8 text-red-500 mb-4" />
                    <h3 className="font-bold text-lg mb-2">Prevent Capital Leaks</h3>
                    <p className="text-slate-400 text-sm">Stop 'boncos'. Track every rupiah of modal tied up in raw materials and finished goods.</p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <Users className="w-8 h-8 text-blue-500 mb-4" />
                    <h3 className="font-bold text-lg mb-2">Employee Accountability</h3>
                    <p className="text-slate-400 text-sm">Separate roles for Warehouse, Production, and Cashier. Log every action to a specific user.</p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <Lock className="w-8 h-8 text-emerald-500 mb-4" />
                    <h3 className="font-bold text-lg mb-2">Total Asset Clarity</h3>
                    <p className="text-slate-400 text-sm">Know your business's true value. Real-time valuation of all assets at any moment.</p>
                </div>
            </div>

            {/* Voucher Code Input Area */}
            <div className="max-w-md mx-auto mb-12 relative z-30">
                <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-4 rounded-xl shadow-xl">
                    <label className="text-sm font-medium text-slate-400 mb-2 block flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-indigo-400" /> Have a voucher code?
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input 
                                placeholder="Enter code" 
                                className={`bg-slate-800 border-slate-600 text-white pr-10 ${voucherError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                value={voucherCode}
                                onChange={(e) => {
                                    setVoucherCode(e.target.value.toUpperCase());
                                    if(voucherError) setVoucherError('');
                                }}
                                disabled={!!appliedVoucher}
                            />
                            {appliedVoucher && (
                                <Check className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                        </div>
                        {appliedVoucher ? (
                            <Button variant="destructive" onClick={handleRemoveVoucher} className="shrink-0">
                                <X className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleApplyVoucher} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                            >
                                Apply
                            </Button>
                        )}
                    </div>
                    {voucherError && <p className="text-red-400 text-xs mt-2 ml-1">{voucherError}</p>}
                    {appliedVoucher && <p className="text-emerald-400 text-xs mt-2 ml-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Code applied successfully!</p>}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => {
                const isPremium = plan.price > 0;
                let displayPlan = { ...plan };

                if (isPremium) {
                    if (appliedVoucher) {
                        displayPlan = {
                            ...plan,
                            name: `Premium (${appliedVoucher.code})`,
                            price: appliedVoucher.price,
                            originalPrice: 350000,
                            interval: 'year',
                            features: [
                                "Capital & Modal Tracking",
                                "Employee Role Management",
                                "Loss Prevention System",
                                "Production & Recipe Logic",
                                "Priority Support",
                                "Advanced Financial Reports"
                            ]
                        };
                    } else {
                        displayPlan = {
                            ...plan,
                            name: "Premium (Promo 1 Tahun)",
                            price: 149000,
                            originalPrice: 350000,
                            interval: 'year',
                            features: [
                                "Capital & Modal Tracking",
                                "Employee Role Management",
                                "Loss Prevention System",
                                "Production & Recipe Logic",
                                "Priority Support",
                                "Advanced Financial Reports"
                            ]
                        };
                    }
                }

                const current = isCurrentPlan(plan.id);

                return (
                <motion.div 
                    key={plan.id}
                    whileHover={{ y: -5 }}
                    className={`relative rounded-2xl p-8 border overflow-hidden ${
                    isPremium 
                        ? (appliedVoucher ? 'bg-emerald-950/40 border-emerald-500/50 shadow-2xl shadow-emerald-500/10' : 'bg-[#1a1425] border-orange-500/50 shadow-2xl shadow-orange-500/10') 
                        : 'bg-slate-900/40 border-slate-800'
                    }`}
                >
                    {isPremium && (
                    <div className={`absolute top-0 right-0 left-0 h-1.5 ${appliedVoucher ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-500'}`} />
                    )}

                    {isPremium && (
                        <div className="absolute top-5 right-5 animate-bounce-slow">
                            <div className={`text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border flex items-center gap-1 ${appliedVoucher ? 'bg-emerald-600 border-emerald-500' : 'bg-red-500 border-red-400'}`}>
                                <Percent className="w-3 h-3" />
                                {appliedVoucher 
                                    ? `Hemat Rp${new Intl.NumberFormat('id-ID').format(350000 - appliedVoucher.price)}` 
                                    : 'Hemat Rp201.000'}
                            </div>
                        </div>
                    )}
                    
                    {isPremium && !appliedVoucher && (
                         <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg mt-4 z-10">
                            <Sparkles size={14} /> Best Value
                        </div>
                    )}

                    <div className="mb-8 relative z-10">
                        <h3 className={`text-2xl font-bold mb-2 flex items-center gap-2 ${isPremium ? (appliedVoucher ? 'text-emerald-400' : 'text-orange-400') : 'text-white'}`}>
                            {displayPlan.name}
                        </h3>
                        
                        <div className="flex flex-col items-start gap-1">
                            {isPremium && (
                                <span className="text-slate-500 text-lg line-through font-semibold decoration-red-500/50">
                                    Rp 350.000
                                </span>
                            )}
                            
                            <div className="flex items-baseline gap-1">
                                <span className={`text-4xl font-extrabold ${isPremium ? 'text-white' : ''}`}>
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(displayPlan.price)}
                                </span>
                                <span className="text-slate-400 text-lg font-medium">
                                    /{displayPlan.interval === 'year' ? 'tahun' : displayPlan.interval}
                                </span>
                            </div>
                        </div>

                        <p className="text-slate-400 mt-4 h-12 text-sm leading-relaxed">
                            {isPremium 
                            ? (appliedVoucher 
                                ? "Voucher applied! Full protection against financial loss." 
                                : "Penawaran terbatas. Amankan modal bisnis Anda sekarang.")
                            : "Perfect for testing the system features."}
                        </p>
                    </div>

                    <div className="space-y-4 mb-8 relative z-10">
                        {(displayPlan.features || []).map((feature, i) => (
                            <div key={i} className="flex items-start gap-3">
                            <div className={`mt-1 p-0.5 rounded-full ${isPremium ? (appliedVoucher ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400') : 'bg-slate-700 text-slate-400'}`}>
                                <Check size={14} strokeWidth={3} />
                            </div>
                            <span className="text-slate-300">{feature}</span>
                            </div>
                        ))}
                        
                        {!isPremium && (
                            <>
                            <div className="flex items-center gap-3 opacity-50">
                                <X size={18} className="text-slate-500" />
                                <span className="text-slate-500 line-through">Capital Tracking</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-50">
                                <X size={18} className="text-slate-500" />
                                <span className="text-slate-500 line-through">Employee Roles</span>
                            </div>
                            </>
                        )}
                    </div>

                    <Button 
                        onClick={() => handleSubscribe(displayPlan)}
                        disabled={current || processingId === plan.id || (!snapLoaded && isPremium)}
                        className={`w-full py-6 text-lg font-semibold transition-all duration-300 ${
                            isPremium 
                            ? (appliedVoucher 
                                ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-900/20'
                                : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-900/20 border border-orange-500/20')
                            : 'bg-slate-800 hover:bg-slate-700 text-white'
                        }`}
                    >
                        {processingId === plan.id ? (
                            <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin" /> Preparing Payment...
                            </span>
                        ) : current ? (
                            <span className="flex items-center gap-2">
                            <Shield size={18} /> Current Plan
                            </span>
                        ) : !snapLoaded && isPremium ? (
                            <span className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                            {isPremium ? (appliedVoucher ? <Ticket size={18} className="fill-white" /> : <Sparkles size={18} className="fill-white" />) : null}
                            {isPremium ? (appliedVoucher ? 'Secure My Business Now' : 'Ambil Promo Sekarang') : 'Get Started'}
                            </span>
                        )}
                    </Button>
                    
                    {isPremium && !appliedVoucher && (
                        <p className="text-center text-xs text-orange-400/80 mt-3 font-medium animate-pulse">
                            🔥 Penawaran berakhir hari ini!
                        </p>
                    )}
                </motion.div>
                );
            })}
            </div>

            <div className="mt-20 text-center border-t border-slate-800 pt-10">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">Secure Payment Partners</h3>
            <div className="flex justify-center flex-wrap gap-6 opacity-60 grayscale hover:grayscale-0 transition-all items-center">
                <div className="bg-white/10 px-4 py-2 rounded text-xs font-bold text-white tracking-wider">GOPAY</div>
                <div className="bg-white/10 px-4 py-2 rounded text-xs font-bold text-white tracking-wider">BCA</div>
                <div className="bg-white/10 px-4 py-2 rounded text-xs font-bold text-white tracking-wider">MANDIRI</div>
                <div className="bg-white/10 px-4 py-2 rounded text-xs font-bold text-white tracking-wider">BNI</div>
                <div className="bg-white/10 px-4 py-2 rounded text-xs font-bold text-white tracking-wider">ALFAMART</div>
            </div>
            <p className="text-xs text-slate-500 mt-4">Powered by Midtrans Payment Gateway</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlansPage;