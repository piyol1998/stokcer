
import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, Ticket, Package, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

function RegisterWithInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    code: ''
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isValidCode, setIsValidCode] = useState(null); // null, true, false

  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setFormData(prev => ({ ...prev, code: codeFromUrl }));
      verifyCode(codeFromUrl);
    }
  }, [searchParams]);

  const verifyCode = async (codeToCheck) => {
    if (!codeToCheck || codeToCheck.length < 5) return;
    
    setVerifying(true);
    try {
        const cleanCode = codeToCheck.trim().toUpperCase();
        
        // Use database check via RLS (publicly readable pending invites)
        // This is a preliminary check. The Edge Function is the final authority.
        const { data, error } = await supabase
            .from('employee_invitations')
            .select('*')
            .eq('invitation_code', cleanCode)
            .eq('status', 'pending')
            .maybeSingle();

        if (error || !data) {
            setIsValidCode(false);
        } else {
            // Robust Date Comparison
            const now = new Date();
            const expiresAt = new Date(data.expires_at);
            
            if (expiresAt < now) {
                console.warn("Code expired client-side check", expiresAt, now);
                setIsValidCode(false);
            } else {
                setIsValidCode(true);
            }
        }
    } catch (err) {
        console.error("Verification error", err);
        setIsValidCode(false);
    } finally {
        setVerifying(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-uppercase code input for better UX
    const finalValue = name === 'code' ? value.toUpperCase() : value;
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    
    if (name === 'code' && value.length >= 8) {
        verifyCode(value);
    } else if (name === 'code') {
        setIsValidCode(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        if (!formData.code) throw new Error("Kode undangan wajib diisi");
        if (!formData.name) throw new Error("Nama lengkap wajib diisi");
        if (!formData.password || formData.password.length < 6) throw new Error("Password minimal 6 karakter");

        // Call Edge Function
        // Using explicit uppercase code to match DB
        const { data, error } = await supabase.functions.invoke('accept-invitation', {
            body: {
                email: formData.email,
                password: formData.password,
                name: formData.name,
                phone: formData.phone,
                code: formData.code.trim().toUpperCase()
            }
        });

        if (error) {
            let errMsg = error.message;
            try {
               const parsed = JSON.parse(await error.context.text());
               if (parsed.error) errMsg = parsed.error;
            } catch(e) { /* ignore parse error */ }
            throw new Error(errMsg);
        }
        
        if (data && data.error) {
            throw new Error(data.error);
        }

        toast({
            title: "Registrasi Berhasil! 🎉",
            description: "Akun Anda telah dibuat. Mengarahkan ke dashboard...",
        });

        // Auto login after success
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
        });

        if (!loginError) {
            setTimeout(() => navigate('/dashboard'), 1000);
        } else {
            navigate('/login');
        }

    } catch (error) {
        console.error("Registration error:", error);
        toast({
            variant: "destructive",
            title: "Gagal Mendaftar",
            description: error.message || "Terjadi kesalahan saat memproses pendaftaran.",
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
       <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Package className="w-6 h-6 text-white" />
                </div>
            </Link>
            <h1 className="text-2xl font-bold text-white">Daftar Karyawan</h1>
            <p className="text-slate-400 text-sm mt-2">Bergabung dengan tim menggunakan kode undangan.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kode Undangan</label>
                <div className="relative group/input">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                        name="code"
                        placeholder="Contoh: INV-ABC123" 
                        className={`pl-10 bg-[#020617] border-slate-700 text-white h-11 transition-all rounded-lg uppercase tracking-widest font-mono
                            ${isValidCode === true ? 'border-emerald-500/50 focus:border-emerald-500' : ''}
                            ${isValidCode === false ? 'border-red-500/50 focus:border-red-500' : ''}
                        `}
                        value={formData.code}
                        onChange={handleInputChange}
                        required
                    />
                    {verifying && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                             <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                        </div>
                    )}
                    {!verifying && isValidCode === true && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                    )}
                     {!verifying && isValidCode === false && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                             <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                    )}
                </div>
                {isValidCode === false && (
                    <p className="text-xs text-red-400 mt-1">Kode undangan tidak valid atau kadaluarsa.</p>
                )}
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama Lengkap</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                        name="name"
                        placeholder="John Doe" 
                        className="pl-10 bg-[#020617] border-slate-700 text-white h-11 rounded-lg"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                        name="email"
                        type="email"
                        placeholder="nama@email.com" 
                        className="pl-10 bg-[#020617] border-slate-700 text-white h-11 rounded-lg"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                        name="password"
                        type="password"
                        placeholder="••••••••" 
                        className="pl-10 bg-[#020617] border-slate-700 text-white h-11 rounded-lg"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No. Telepon (Opsional)</label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                        name="phone"
                        type="tel"
                        placeholder="08..." 
                        className="pl-10 bg-[#020617] border-slate-700 text-white h-11 rounded-lg"
                        value={formData.phone}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-lg mt-4 font-bold shadow-lg shadow-indigo-500/25"
                disabled={loading}
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buat Akun & Masuk"}
            </Button>
        </form>

        <div className="mt-6 text-center pt-6 border-t border-white/5">
             <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                 Sudah punya akun? Masuk disini
             </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterWithInvitation;
