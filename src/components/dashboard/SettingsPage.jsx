
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { Store, Globe, User, CreditCard, Zap, BadgeCheck, AlertTriangle, Trash2, Users, Ticket, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';

function SettingsPage() {
  const { user, userRole, signOut } = useAuth();
  const { toast } = useToast();
  const { subscription, isTrialActive, isTrialExpired } = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Account Deletion State
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Join Team State
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);

  const [formData, setFormData] = useState({
      businessName: 'Stokcer Business',
      address: '',
      phone: '',
      currency: 'IDR',
      osSyncEnabled: true,
      osAutoSyncInterval: 5
  });

  const handleSave = async (e) => {
      e.preventDefault();
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      toast({ title: "Settings Saved", description: "Your business configuration has been updated." });
      setLoading(false);
  };

  const handleJoinTeam = () => {
    if (!joinCode || joinCode.length < 3) {
        toast({
            title: "Kode tidak valid",
            description: "Mohon masukkan kode undangan yang valid.",
            variant: "destructive"
        });
        return;
    }
    setShowJoinConfirm(true);
  };

  const executeJoinTeam = async () => {
    setJoinLoading(true);
    try {
        const { data, error } = await supabase.functions.invoke('join-as-employee', {
            body: { code: joinCode }
        });

        if (error) throw error;
        if (data && data.error) throw new Error(data.error);

        toast({
            title: "Berhasil Bergabung!",
            description: data.message || "Anda telah berhasil bergabung dengan tim.",
        });
        
        setShowJoinConfirm(false);
        setJoinCode('');
        
        // Force reload to refresh permissions/role
        setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
        console.error("Join Error:", error);
        toast({
            title: "Gagal Bergabung",
            description: error.message || "Terjadi kesalahan saat memproses kode undangan.",
            variant: "destructive"
        });
    } finally {
        setJoinLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
        console.log("Initiating account deletion for:", user?.email);
        
        // Explicitly get session to ensure we have a valid token
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data, error } = await supabase.functions.invoke('delete-account', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session?.access_token}`
            }
        });
        
        if (error) {
            console.error("Delete Account Edge Error:", error);
            let errorMessage = error.message;
            try {
                if (error.context && typeof error.context.text === 'function') {
                    const bodyText = await error.context.text();
                    console.error("Delete Account Error Body:", bodyText);
                    const bodyJson = JSON.parse(bodyText);
                    if (bodyJson.error) errorMessage = bodyJson.error;
                }
            } catch (parseErr) {
                // ignore parsing error
            }
            throw new Error(errorMessage);
        }

        if (data && data.error) {
            throw new Error(data.error);
        }

        toast({ 
            title: "Account Deleted", 
            description: "Your account has been permanently removed. Redirecting..." 
        });
        
        await signOut();
        setTimeout(() => navigate('/login'), 1000);

    } catch (err) {
        console.error("Delete Account Catch:", err);
        toast({ 
            title: "Deletion Failed", 
            description: err.message || "A network or server error occurred. Please try again.",
            variant: "destructive"
        });
    } finally {
        setDeleteLoading(false);
        setShowDeleteDialog(false);
    }
  };

  const isPremium = subscription?.status === 'active';
  const isStaff = userRole === 'staff';

  let planLabel = "Free";
  let planStatusColor = "text-slate-400";
  if (isPremium) {
      planLabel = "Premium";
      planStatusColor = "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400";
  } else if (isTrialActive) {
      planLabel = "Free Trial";
      planStatusColor = "text-emerald-400";
  } else if (isTrialExpired) {
      planLabel = "Expired";
      planStatusColor = "text-red-400";
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
       <div className="flex justify-between items-center">
           <h1 className="text-2xl font-bold text-white">Settings</h1>
           <Button disabled={loading} onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
               {loading ? 'Saving...' : 'Save Changes'}
           </Button>
       </div>

       <Tabs defaultValue="general" className="space-y-6">
           <TabsList className="bg-[#1e293b] border border-slate-700/50 p-1 rounded-xl w-full flex justify-start overflow-x-auto">
               <TabsTrigger value="general" className="data-[state=active]:bg-indigo-600 text-slate-400 data-[state=active]:text-white"><Store className="w-4 h-4 mr-2" /> General</TabsTrigger>
               {!isStaff && (
                 <TabsTrigger value="subscription" className="data-[state=active]:bg-indigo-600 text-slate-400 data-[state=active]:text-white"><CreditCard className="w-4 h-4 mr-2" /> Subscription</TabsTrigger>
               )}
               <TabsTrigger value="online-store" className="data-[state=active]:bg-indigo-600 text-slate-400 data-[state=active]:text-white"><Globe className="w-4 h-4 mr-2" /> Online Store</TabsTrigger>
               <TabsTrigger value="account" className="data-[state=active]:bg-indigo-600 text-slate-400 data-[state=active]:text-white"><User className="w-4 h-4 mr-2" /> Account</TabsTrigger>
           </TabsList>

           <TabsContent value="general" className="space-y-6">
               <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                   <h2 className="text-lg font-bold text-white mb-4">Business Profile</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                           <Label className="text-white">Business Name</Label>
                           <Input className="bg-slate-800 border-slate-600 text-white" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} disabled={isStaff} />
                       </div>
                       <div className="space-y-2">
                           <Label className="text-white">Phone Number</Label>
                           <Input className="bg-slate-800 border-slate-600 text-white" placeholder="+62..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} disabled={isStaff} />
                       </div>
                       <div className="col-span-2 space-y-2">
                           <Label className="text-white">Address</Label>
                           <Input className="bg-slate-800 border-slate-600 text-white" placeholder="Jalan..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} disabled={isStaff} />
                       </div>
                   </div>
               </div>
           </TabsContent>

           {!isStaff && (
             <TabsContent value="subscription" className="space-y-6">
                 <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                             <h2 className="text-lg font-bold text-white flex items-center gap-2">
                             Current Plan: <span className={planStatusColor}>{planLabel}</span>
                             {isPremium && <BadgeCheck className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />}
                             </h2>
                             <p className="text-slate-400 text-sm mt-1">
                             {isPremium ? "Your workspace has full access to all premium features." : isTrialActive ? "You are currently on a free trial with full access." : "Subscription is inactive. Features are limited."}
                             </p>
                        </div>
                        {!isPremium && (
                          <Button onClick={() => navigate('/pricing')} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20">
                             <Zap className="w-4 h-4 mr-2 fill-white" /> Upgrade to Premium
                          </Button>
                        )}
                     </div>
                 </div>
             </TabsContent>
           )}

           {/* ... rest of tabs ... */}
           <TabsContent value="online-store" className="space-y-6">
               <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                   <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-400" /> Online Store Integration</h2>
                   <div className="p-4 bg-indigo-900/20 border border-indigo-500/20 rounded-lg">
                       <p className="text-sm text-indigo-300">Automatic sync allows you to manage inventory in one place.</p>
                   </div>
               </div>
           </TabsContent>

           <TabsContent value="account" className="space-y-6">
               {!isStaff && (
                   <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                   <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                       <Users className="w-5 h-5 text-indigo-400" /> Bergabung dengan Tim
                   </h2>
                   <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-700/50">
                       <p className="text-slate-400 text-sm mb-4">
                           Masukkan kode undangan yang diberikan oleh pemilik bisnis untuk bergabung sebagai staf.
                           Anda akan beralih ke workspace mereka.
                       </p>
                       <div className="flex gap-3 max-w-md">
                           <div className="relative flex-1">
                               <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                               <Input 
                                   placeholder="Masukkan Kode Undangan (8 Digit)" 
                                   value={joinCode} 
                                   onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                   className="pl-10 bg-slate-800 border-slate-600 text-white font-mono tracking-widest uppercase"
                                   maxLength={10}
                               />
                           </div>
                           
                           <Button onClick={handleJoinTeam} className="bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap">
                               Gunakan Kode
                           </Button>

                           <Dialog open={showJoinConfirm} onOpenChange={setShowJoinConfirm}>
                               <DialogContent className="bg-[#1e293b] border-slate-700 text-white">
                                   <DialogHeader>
                                       <DialogTitle>Konfirmasi Bergabung</DialogTitle>
                                       <DialogDescription className="text-slate-300">
                                           Anda akan bergabung dengan organisasi baru. 
                                           <br/><br/>
                                           <span className="flex items-start gap-2 text-amber-400 bg-amber-900/20 p-2 rounded text-xs border border-amber-500/20">
                                               <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                               <span>Perhatian: Akses Anda saat ini akan dialihkan ke workspace baru. Pastikan ini tindakan yang Anda inginkan.</span>
                                           </span>
                                       </DialogDescription>
                                   </DialogHeader>
                                   <DialogFooter className="mt-4 gap-2">
                                       <Button variant="ghost" onClick={() => setShowJoinConfirm(false)} disabled={joinLoading}>Batal</Button>
                                       <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={executeJoinTeam} disabled={joinLoading}>
                                            {joinLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                            {joinLoading ? 'Memproses...' : 'Ya, Gabung Sekarang'}
                                       </Button>
                                   </DialogFooter>
                               </DialogContent>
                           </Dialog>
                       </div>
                   </div>
               </div>
               )}

               <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700">
                   <h2 className="text-lg font-bold text-white mb-4">Account Management</h2>
                   <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                       <div>
                           <h3 className="text-white font-medium">Email Address</h3>
                           <p className="text-sm text-slate-400">{user?.email}</p>
                       </div>
                       <Button variant="outline" className="border-slate-700 text-slate-300">Update Email</Button>
                   </div>
               </div>

               <div className="bg-red-950/20 p-6 rounded-xl border border-red-500/20">
                   <h2 className="text-lg font-bold text-red-500 mb-2 flex items-center gap-2">
                       <AlertTriangle className="w-5 h-5" /> Danger Zone
                   </h2>
                   <p className="text-red-400/70 text-sm mb-6">
                       Deleting your account is permanent. All your data, inventory, and transaction history will be wiped immediately.
                   </p>
                   
                   <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                       <DialogTrigger asChild>
                           <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                               <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                           </Button>
                       </DialogTrigger>
                       <DialogContent className="bg-[#1e293b] border-red-500/30 text-white">
                           <DialogHeader>
                               <DialogTitle className="text-red-500">Delete Account Permanently?</DialogTitle>
                               <DialogDescription className="text-slate-400">
                                   This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                   {userRole === 'owner' && <span className="block mt-2 font-bold text-red-400">WARNING: As an owner, this will also delete your entire organization and remove access for all employees.</span>}
                               </DialogDescription>
                           </DialogHeader>
                           <DialogFooter className="gap-2 mt-4">
                               <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={deleteLoading}>Cancel</Button>
                               <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteLoading}>
                                   {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                   {deleteLoading ? 'Deleting...' : 'Yes, Delete Everything'}
                               </Button>
                           </DialogFooter>
                       </DialogContent>
                   </Dialog>
               </div>
           </TabsContent>
       </Tabs>
    </div>
  );
}

export default SettingsPage;
