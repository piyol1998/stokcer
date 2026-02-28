
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Users, Plus, Search, Edit, Trash2, UserCheck, Clock, Key, Mail, Shield, CheckCircle2, Building, AlertTriangle, Ticket, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import PremiumLock from '@/components/dashboard/PremiumLock';

function EmployeeManagement() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const { checkFeatureAccess } = useSubscription();

  const hasAccess = checkFeatureAccess('employee_management');
  const [activeTab, setActiveTab] = useState("list");

  // --- Employee List State ---
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', status: 'Active', password: '' });

  // --- Invitation State ---
  const [invitations, setInvitations] = useState([]);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [revokeConfirmId, setRevokeConfirmId] = useState(null);

  useEffect(() => {
    if (user && hasAccess) {
        fetchEmployees();
        if (userRole === 'owner') {
            fetchInvitations();
        }
    }
  }, [userRole, user, hasAccess]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from('employees').select('*').order('name');
      if (error) console.warn("Could not fetch employees:", error);
      else setEmployees(data || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchInvitations = async () => {
      if (userRole !== 'owner') return;
      try {
          const { data, error } = await supabase
            .from('employee_invitations')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error) setInvitations(data || []);
      } catch(e) { console.error(e); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (userRole !== 'owner') return;
    setLoading(true);
    try {
        if (editingItem) {
            const { error } = await supabase.from('employees').update({
                name: formData.name, phone: formData.phone, status: formData.status, role: 'staff'
            }).eq('id', editingItem.id);
            if (error) throw error;
            toast({ title: "Berhasil", description: `Data karyawan ${formData.name} diperbarui.` });
        } else {
            // Direct Creation
            if (!formData.email || !formData.password) throw new Error("Email & Password required");
            const { data, error } = await supabase.functions.invoke('create-employee', {
                body: { email: formData.email, password: formData.password, name: formData.name, phone: formData.phone, role: 'staff' }
            });

            // Improved Error Handling
            if (error) {
                let msg = error.message;
                try {
                    // Try to parse error body if it exists
                    const body = JSON.parse(await error.context.text());
                    if (body.error) msg = body.error;
                } catch(e) {}
                throw new Error(msg || "Gagal menghubungi server");
            }
            if (data && data.error) throw new Error(data.error);

            toast({ title: "Akun Dibuat", description: `Akun untuk ${formData.name} berhasil dibuat.` });
        }
        setIsDialogOpen(false);
        setEditingItem(null);
        setFormData({ name: '', email: '', phone: '', status: 'Active', password: '' });
        fetchEmployees();
    } catch (error) {
        toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const generateInvitation = async (e) => {
      e.preventDefault();
      setInvitationLoading(true);

      try {
          // Explicitly get session to ensure we have a valid token
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
              throw new Error("Sesi tidak valid. Silakan login ulang.");
          }

          console.log("Invoking generate-invitation with token", session.access_token.substring(0, 10) + "...");

          // Pass Authorization header explicitly
          const { data, error } = await supabase.functions.invoke('generate-invitation', {
              body: { email: inviteEmail || null },
              headers: {
                  Authorization: `Bearer ${session.access_token}`
              }
          });
          
          if (error) {
               console.error("Edge Function Error:", error);
               let msg = error.message;
               try {
                  // Try to parse error body if it exists
                  const body = await error.context.json();
                  if (body.error) msg = body.error;
                  if (body.details) msg += ` (${body.details})`;
               } catch(e) {
                   // If JSON parse fails, try text
                   try {
                       const text = await error.context.text();
                       console.log("Raw error text:", text);
                   } catch(t) {}
               }
               throw new Error(msg);
          }
          
          if (data && data.error) throw new Error(data.error);

          toast({ title: "Undangan Dibuat", description: `Kode: ${data.invitation.invitation_code}` });
          setIsInviteDialogOpen(false);
          setInviteEmail('');
          fetchInvitations();
      } catch (err) {
          console.error("Full Invite Error:", err);
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      } finally {
          setInvitationLoading(false);
      }
  };

  const revokeInvitation = async (id) => {
      try {
          const { error } = await supabase.from('employee_invitations').update({ status: 'revoked' }).eq('id', id);
          if (error) throw error;
          fetchInvitations();
          setRevokeConfirmId(null);
          toast({ title: "Undangan Dibatalkan" });
      } catch(e) {
          toast({ title: "Error", description: e.message, variant: "destructive" });
      }
  };

  const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text);
      toast({ title: "Disalin", description: "Kode/Link berhasil disalin ke clipboard." });
  };

  // --- UI Helpers ---
  const filtered = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!hasAccess) {
    return <PremiumLock title="Fitur Manajemen Tim Terkunci" message="Upgrade ke Premium untuk mengelola tim." />;
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Manajemen Karyawan</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">Kelola tim dan akses organisasi Anda.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
         <TabsList className="bg-slate-800 border-slate-700">
             <TabsTrigger value="list" className="data-[state=active]:bg-indigo-600">Daftar Karyawan</TabsTrigger>
             {userRole === 'owner' && <TabsTrigger value="invites" className="data-[state=active]:bg-indigo-600">Undangan & Kode</TabsTrigger>}
         </TabsList>

         <TabsContent value="list" className="mt-6 space-y-6">
            <div className="flex justify-between gap-4">
                 <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Cari karyawan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-[#1e293b]" />
                 </div>
                 {userRole === 'owner' && (
                     <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => { setEditingItem(null); setFormData({name:'', email:'', phone:'', status:'Active', password:''}); }}>
                                <Plus className="w-4 h-4 mr-2" /> Tambah Manual
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700">
                             <DialogHeader><DialogTitle>{editingItem ? 'Edit Karyawan' : 'Tambah Karyawan Manual'}</DialogTitle></DialogHeader>
                             <form onSubmit={handleSave} className="space-y-4 mt-4">
                                <Input placeholder="Nama Lengkap" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="bg-slate-800" />
                                <Input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required disabled={!!editingItem} className="bg-slate-800" />
                                {!editingItem && <Input type="password" placeholder="Password (Min 6 char)" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required className="bg-slate-800" />}
                                <Input placeholder="No. Telepon" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-slate-800" />
                                <Button type="submit" className="w-full bg-indigo-600" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
                             </form>
                        </DialogContent>
                     </Dialog>
                 )}
            </div>

            <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
                 <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#0f172a] text-slate-400 border-b border-slate-700">
                        <th className="px-6 py-4">Nama</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        {userRole === 'owner' && <th className="px-6 py-4 text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filtered.map(emp => (
                            <tr key={emp.id} className="hover:bg-slate-800/50">
                                <td className="px-6 py-4"><div className="font-medium text-white">{emp.name}</div><div className="text-xs text-slate-500">{emp.email}</div></td>
                                <td className="px-6 py-4 capitalize">{emp.role === 'owner' ? 'Owner' : 'Staff'}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs ${emp.status==='Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{emp.status}</span></td>
                                {userRole === 'owner' && (
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => { setEditingItem(emp); setFormData({name: emp.name, email: emp.email, phone: emp.phone, status: emp.status}); setIsDialogOpen(true); }} className="p-2 bg-indigo-500/10 text-indigo-400 rounded hover:bg-indigo-500/20"><Edit className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
         </TabsContent>

         <TabsContent value="invites" className="mt-6 space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-900/20 p-6 rounded-xl border border-indigo-500/20">
                  <div>
                      <h3 className="text-lg font-bold text-white">Kode Undangan</h3>
                      <p className="text-slate-400 text-sm">Generate kode unik untuk karyawan agar mereka bisa mendaftar sendiri.</p>
                  </div>
                  <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                      <DialogTrigger asChild>
                          <Button className="bg-indigo-600 hover:bg-indigo-500"><Ticket className="w-4 h-4 mr-2" /> Buat Undangan</Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#1e293b] text-white border-slate-700">
                          <DialogHeader><DialogTitle>Buat Kode Undangan Baru</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-4">
                              <Label>Email Khusus (Opsional)</Label>
                              <Input placeholder="user@example.com (Kosongkan jika untuk siapa saja)" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="bg-slate-800" />
                              <p className="text-xs text-slate-500">Jika diisi, kode hanya bisa digunakan oleh email ini.</p>
                          </div>
                          <Button onClick={generateInvitation} disabled={invitationLoading} className="w-full bg-indigo-600">{invitationLoading ? 'Generating...' : 'Generate Code'}</Button>
                      </DialogContent>
                  </Dialog>
             </div>

             <div className="grid gap-4">
                 {invitations.length === 0 ? (
                     <p className="text-center text-slate-500 py-10">Belum ada undangan yang dibuat.</p>
                 ) : (
                     invitations.map(inv => (
                         <div key={inv.id} className="bg-[#1e293b] p-4 rounded-xl border border-slate-800 flex items-center justify-between group">
                             <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 font-mono text-lg font-bold tracking-wider border border-slate-700">
                                     {inv.invitation_code.substring(0,2)}..
                                 </div>
                                 <div>
                                     <div className="flex items-center gap-2">
                                         <span className="text-white font-mono font-bold tracking-widest text-lg">{inv.invitation_code}</span>
                                         <button onClick={() => copyToClipboard(inv.invitation_code)} className="p-1 text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                                     </div>
                                     <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                         <span>Created: {new Date(inv.created_at).toLocaleDateString()}</span>
                                         <span>•</span>
                                         <span>{inv.email ? `For: ${inv.email}` : 'Public Invitation'}</span>
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="flex items-center gap-4">
                                 <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                     inv.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                     inv.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                     'bg-slate-800 text-slate-500 border-slate-700'
                                 }`}>
                                     {inv.status.toUpperCase()}
                                 </div>
                                 {inv.status === 'pending' && (
                                     <Dialog open={revokeConfirmId === inv.id} onOpenChange={(open) => setRevokeConfirmId(open ? inv.id : null)}>
                                         <DialogTrigger asChild>
                                             <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                                 Revoke
                                             </Button>
                                         </DialogTrigger>
                                         <DialogContent className="bg-[#1e293b] text-white border-slate-700">
                                             <DialogHeader><DialogTitle>Batalkan Undangan?</DialogTitle></DialogHeader>
                                             <p className="text-slate-300">Kode <span className="font-mono font-bold">{inv.invitation_code}</span> tidak akan bisa digunakan lagi.</p>
                                             <DialogFooter className="gap-2">
                                                 <Button variant="ghost" onClick={() => setRevokeConfirmId(null)}>Batal</Button>
                                                 <Button variant="destructive" onClick={() => revokeInvitation(inv.id)}>Batalkan Undangan</Button>
                                             </DialogFooter>
                                         </DialogContent>
                                     </Dialog>
                                 )}
                                 <Button variant="outline" size="sm" onClick={() => copyToClipboard(`${window.location.origin}/register-invite?code=${inv.invitation_code}`)} className="border-slate-700 text-slate-300">
                                     Share Link
                                 </Button>
                             </div>
                         </div>
                     ))
                 )}
             </div>
         </TabsContent>
      </Tabs>
    </div>
  );
}

export default EmployeeManagement;
