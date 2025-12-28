import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

// Helper to run the reset function
const resetAdminAccount = async () => {
  const { data, error } = await supabase.functions.invoke('reset-admin-user');
  if (error) throw error;
  return data;
};

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: { user, session }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      if (!user || !session) {
        throw new Error("Login succeeded but no session was created.");
      }

      // 2. Refresh the session explicitly to ensure RLS context is up to date
      await supabase.auth.refreshSession();

      // 3. Verify Admin Status in public.admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', user.id)
        .single();

      if (adminError || !adminData) {
        console.error("Admin verification failed:", adminError);
        // Force sign out if they aren't an admin
        await supabase.auth.signOut();
        throw new Error("Unauthorized access. Admin privileges required.");
      }

      toast({
        title: "Access Granted",
        description: "Welcome back, Administrator.",
      });

      navigate('/admin/dashboard');

    } catch (error) {
      console.error("Login process error:", error);
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: error.message === "Invalid login credentials" 
          ? "Kombinasi email atau password salah." 
          : error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Reset manually if needed
  const handleAutoFix = async () => {
    if (!window.confirm("This will PERMANENTLY RESET the admin account 'piyol@stokcer.com' to default credentials (password: 250840125). Are you sure?")) return;
    
    setIsResetting(true);
    try {
      await resetAdminAccount();
      toast({
        title: "Account Reset Success",
        description: "Try logging in with password: '250840125'",
        duration: 5000,
        className: "bg-green-600 text-white border-none"
      });
      setPassword('250840125'); // Auto fill password for convenience
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const showEmergencyButton = email.toLowerCase().includes('piyol@stokcer.com');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 px-4"
      >
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Developer Console</h1>
            <p className="text-slate-400 text-sm">Sistem Manajemen Terpusat</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs font-bold tracking-wider">ADMIN EMAIL</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <Input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-950/50 border-slate-800 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-xs font-bold tracking-wider">PASSWORD</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <Input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-950/50 border-slate-800 text-slate-200 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]"
            >
              {isLoading ? "Authenticating..." : (
                <span className="flex items-center gap-2">
                  Access Console <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Emergency Reset Button - only visible if 'piyol@stokcer.com' is typed */}
          <AnimatePresence>
            {showEmergencyButton && (
               <motion.div 
                 initial={{ opacity: 0, height: 0, marginTop: 0 }}
                 animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                 exit={{ opacity: 0, height: 0, marginTop: 0 }}
                 className="overflow-hidden"
               >
                 <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 backdrop-blur-sm">
                   <div className="flex items-center justify-center gap-2 text-red-400 mb-3 text-sm font-medium">
                     <AlertTriangle className="w-4 h-4" />
                     <span>Trouble logging in?</span>
                   </div>
                   <Button 
                     type="button"
                     onClick={handleAutoFix}
                     disabled={isResetting}
                     variant="destructive"
                     className="w-full h-12 text-sm font-bold tracking-wide shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-red-600 active:scale-95 transition-all"
                   >
                     {isResetting ? (
                       <span className="flex items-center gap-2">
                         <RefreshCw className="w-4 h-4 animate-spin" /> RESETTING...
                       </span>
                     ) : (
                       "EMERGENCY: RESET ACCOUNT"
                     )}
                   </Button>
                   <p className="text-[10px] text-red-400/60 text-center mt-2">
                     Sets password to: 250840125
                   </p>
                 </div>
               </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-500">System Operational</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AdminLogin;