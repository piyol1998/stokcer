
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, Sparkles, Store, Clock, Package, Menu, X, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

// --- Navigation Component for Login Page ---
const LoginNavbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    return (
        <nav className="fixed top-0 w-full z-50 bg-[#020617]/80 backdrop-blur-lg border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Stokcer
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                    <Link to="/#features" className="hover:text-white transition-colors">Features</Link>
                    <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                </div>

                {/* Desktop CTA */}
                <div className="hidden md:flex items-center gap-4">
                    <Button 
                        onClick={() => navigate('/login')}
                        variant="ghost"
                        className="text-white hover:text-indigo-300 hover:bg-white/5"
                    >
                        Sign In
                    </Button>
                    <Button 
                        onClick={() => navigate('/login?mode=signup')}
                        className="bg-white text-slate-900 hover:bg-indigo-50 rounded-full px-6 font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        Get Started
                    </Button>
                </div>

                {/* Mobile Toggle */}
                <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-[#0f172a] border-b border-white/10 overflow-hidden"
                    >
                        <div className="flex flex-col p-6 gap-4 text-center">
                             <Link to="/" className="text-slate-300 py-2">Home</Link>
                             <Link to="/pricing" className="text-slate-300 py-2">Pricing</Link>
                             <Button onClick={() => navigate('/login')} className="w-full bg-indigo-600">Sign In</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

// --- Main Login Page Component ---
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Directly use supabase client for auth actions to avoid Context issues
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check URL params for mode (e.g. /login?mode=signup)
  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsLogin(false);
    } else {
        setIsLogin(true);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Validation
        if (!email || !password) throw new Error("Please enter both email and password.");

        // Direct Login Call
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        // Navigation is handled by the auth state listener in useAuth/App.jsx

      } else {
        // Sign Up Logic
        // Validation
        if (!businessName.trim()) throw new Error("Business Name is required.");
        if (!email) throw new Error("Email address is required.");
        if (!password || password.length < 6) throw new Error("Password must be at least 6 characters long.");

        // Direct Sign Up Call
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              business_name: businessName
            }
          }
        });

        if (authError) throw authError;

        if (authData?.user) {
          if (authData.session) {
             // 2. Ensure Business Info is stored
             const { error: businessError } = await supabase.from('user_business_info').upsert({
                user_id: authData.user.id,
                business_name: businessName,
                updated_at: new Date().toISOString()
             }, { onConflict: 'user_id' });

             // 3. Assign Free Plan Automatically
             const { data: plans } = await supabase.from('subscription_plans').select('id').eq('price', 0).single();
             if (plans?.id) {
                 await supabase.from('user_subscriptions').insert({
                    user_id: authData.user.id,
                    plan_id: plans.id, 
                    status: 'active', // Active immediately as Free plan
                    last_payment_date: new Date().toISOString()
                 });
             }
          }

          toast({
            title: "Welcome aboard! 🚀",
            description: "Your account has been created successfully.",
          });
          
          if (!authData.session) {
             toast({
                title: "Check your email",
                description: "We've sent a confirmation link to your email address.",
             });
             setIsLogin(true);
          }
        }
      }
    } catch (error) {
      console.error("Authentication Error:", error);
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col relative overflow-hidden font-sans">
      <LoginNavbar />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[150px]" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="flex-1 container mx-auto flex flex-col lg:flex-row items-center justify-center lg:justify-between px-4 sm:px-6 lg:px-8 pt-24 pb-12 relative z-10 h-full">
        
        {/* Left Side: Hero Copy */}
        <div className="w-full lg:w-1/2 pr-0 lg:pr-16 mb-12 lg:mb-0 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold tracking-wider uppercase mb-8 shadow-glow">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enterprise Grade System</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white tracking-tight">
              {isLogin ? (
                  <>Welcome <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Back.</span></>
              ) : (
                  <>Scale Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Empire.</span></>
              )}
            </h1>
            
            <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
              {isLogin 
                ? "Access your command center. Manage orders, optimize production, and analyze growth with AI-driven insights." 
                : "Join elite manufacturers using Stokcer to automate inventory and boost sales. Get started with our Free plan today."}
            </p>
          </motion.div>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full lg:w-[480px]">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full bg-[#0f172a]/60 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden group"
          >
             <div className="mb-8">
               <h2 className="text-2xl font-bold text-white mb-2">
                 {isLogin ? 'Sign In' : 'Create Account'}
               </h2>
               <p className="text-slate-400 text-sm">
                 {isLogin ? 'Enter your credentials to access dashboard' : 'Setup your business profile in seconds'}
               </p>
             </div>

             <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
               <AnimatePresence mode="popLayout">
                 {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      className="space-y-5"
                    >
                      <div className="space-y-2">
                         <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Business Name</label>
                         <div className="relative group/input">
                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                            <Input 
                              placeholder="e.g. My Perfume Shop" 
                              className="pl-10 bg-[#020617] border-slate-700 text-white h-12 focus:ring-indigo-500 focus:border-indigo-500 transition-all rounded-xl"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              required={!isLogin}
                            />
                         </div>
                      </div>
                    </motion.div>
                 )}
               </AnimatePresence>

               <div className="space-y-2">
                 <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Email Address</label>
                 <div className="relative group/input">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                    <Input 
                      type="email" 
                      placeholder="name@company.com" 
                      className="pl-10 bg-[#020617] border-slate-700 text-white h-12 focus:ring-indigo-500 focus:border-indigo-500 transition-all rounded-xl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Password</label>
                 <div className="relative group/input">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-indigo-400 transition-colors" />
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 bg-[#020617] border-slate-700 text-white h-12 focus:ring-indigo-500 focus:border-indigo-500 transition-all rounded-xl"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                 </div>
               </div>

               <Button 
                 type="submit" 
                 disabled={loading}
                 className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold mt-8 transition-all shadow-lg shadow-indigo-500/25 rounded-xl text-base"
               >
                 {loading ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 ) : (
                   <span className="flex items-center gap-2">
                     {isLogin ? 'Sign In' : 'Get Started'} 
                     <ArrowRight className="w-4 h-4" />
                   </span>
                 )}
               </Button>
             </form>

             <div className="mt-8 pt-6 border-t border-slate-700/50 text-center space-y-4">
               <p className="text-sm text-slate-400">
                 {isLogin ? "Don't have an account?" : "Already have an account?"}
                 <button 
                   onClick={() => navigate(isLogin ? '/login?mode=signup' : '/login')}
                   className="ml-2 text-indigo-400 hover:text-indigo-300 font-bold hover:underline focus:outline-none transition-colors"
                 >
                   {isLogin ? 'Sign up' : 'Sign in'}
                 </button>
               </p>

               {/* New Invitation Option */}
               <Link to="/register-invite" className="inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors font-medium">
                   <Ticket className="w-4 h-4" />
                   Daftar dengan Kode Undangan Karyawan
               </Link>
             </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
