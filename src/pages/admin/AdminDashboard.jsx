import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Activity, Database, LogOut, Plus, Search, 
  Trash2, ShieldAlert, Key, Eye, EyeOff, ChevronDown, 
  ChevronUp, User, Building2, Smartphone, Mail, BadgeCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { callAdminApi } from '@/lib/adminApi';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

function AdminDashboard() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // State for visible passwords (tracking which owner's password is shown)
  const [visiblePasswords, setVisiblePasswords] = useState({});
  // State for expanded employee sections
  const [expandedOwners, setExpandedOwners] = useState({});

  const [newOwner, setNewOwner] = useState({ email: '', password: '', businessName: '' });
  
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Owner Stats (View)
      const ownersData = await callAdminApi('list');
      
      // 2. Fetch All Employees (RLS allows admin)
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('*');
        
      if (empError) throw empError;

      // 3. Fetch User Secrets (Passwords) - RLS allows admin
      const { data: secretsData, error: secError } = await supabase
        .from('user_secrets')
        .select('*');

      if (secError) throw secError;

      // 4. Merge Data
      const mergedData = (ownersData || []).map(owner => {
        const ownerEmployees = employeesData?.filter(e => e.user_id === owner.user_id) || [];
        const ownerSecret = secretsData?.find(s => s.user_id === owner.user_id);
        
        return {
          ...owner,
          employees: ownerEmployees,
          decrypted_password: ownerSecret?.password_decrypted || null
        };
      });

      setOwners(mergedData);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const toggleEmployees = (userId) => {
    setExpandedOwners(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await callAdminApi('create', newOwner);
      toast({ title: "Success", description: `Owner ${newOwner.email} created.` });
      setIsCreateOpen(false);
      setNewOwner({ email: '', password: '', businessName: '' });
      fetchAllData();
    } catch (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!window.confirm(`Delete ${email}? This action is irreversible.`)) return;
    try {
      await callAdminApi('delete', { userId });
      toast({ title: "Deleted", description: "Account removed." });
      fetchAllData();
    } catch (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  // --- Filtering ---
  const filteredOwners = owners.filter(owner => 
    owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Stats Calculation ---
  const stats = {
    totalOwners: owners.length,
    totalEmployees: owners.reduce((acc, curr) => acc + (curr.employees?.length || 0), 0),
    totalBatches: owners.reduce((sum, u) => sum + (Number(u.production_count) || 0), 0)
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm backdrop-blur-xl bg-white/80">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-500/30 shadow-lg">
               <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">WebDev Console</h1>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Administration</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-slate-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        
        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard 
            icon={Building2} 
            label="Registered Owners" 
            value={stats.totalOwners} 
            color="text-indigo-600" 
            bg="bg-indigo-50" 
          />
          <StatCard 
            icon={Users} 
            label="Total Employees" 
            value={stats.totalEmployees} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
          />
          <StatCard 
            icon={Database} 
            label="Production Batches" 
            value={stats.totalBatches} 
            color="text-blue-600" 
            bg="bg-blue-50" 
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input 
              placeholder="Search owners or businesses..." 
              className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 shadow-sm rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 w-full md:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add New Owner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Owner Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input 
                    value={newOwner.businessName}
                    onChange={(e) => setNewOwner({...newOwner, businessName: e.target.value})}
                    placeholder="e.g. Berkah Jaya Abadi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email" 
                    required 
                    value={newOwner.email}
                    onChange={(e) => setNewOwner({...newOwner, email: e.target.value})}
                    placeholder="owner@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Password</Label>
                  <div className="relative">
                    <Input 
                        type="text" 
                        required 
                        value={newOwner.password}
                        onChange={(e) => setNewOwner({...newOwner, password: e.target.value})}
                        className="font-mono"
                        placeholder="Secure password"
                    />
                    <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Create Account</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 animate-pulse">Loading dashboard data...</p>
             </div>
          ) : filteredOwners.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No owners found</h3>
                <p className="text-slate-500">Try adjusting your search criteria</p>
             </div>
          ) : (
             filteredOwners.map((owner) => (
                <OwnerCard 
                  key={owner.user_id} 
                  owner={owner}
                  isPasswordVisible={visiblePasswords[owner.user_id]}
                  onTogglePassword={() => togglePassword(owner.user_id)}
                  isExpanded={expandedOwners[owner.user_id]}
                  onToggleExpand={() => toggleEmployees(owner.user_id)}
                  onDelete={() => handleDeleteUser(owner.user_id, owner.email)}
                />
             ))
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub-Components ---

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 flex items-center gap-5"
    >
      <div className={`w-14 h-14 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-0.5">{label}</p>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
      </div>
    </motion.div>
  );
}

function OwnerCard({ owner, isPasswordVisible, onTogglePassword, isExpanded, onToggleExpand, onDelete }) {
  const employeeCount = owner.employees ? owner.employees.length : 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Owner Info Section */}
          <div className="flex items-start gap-5 flex-1 min-w-0">
             <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                <span className="font-bold text-xl text-slate-600">
                   {owner.business_name ? owner.business_name.charAt(0).toUpperCase() : owner.email.charAt(0).toUpperCase()}
                </span>
             </div>
             <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                   <h3 className="text-lg font-bold text-slate-900 truncate">
                      {owner.business_name || 'Unnamed Business'}
                   </h3>
                   <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wide border border-indigo-100">
                      Owner
                   </span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-slate-500 mb-3">
                   <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {owner.email}
                   </div>
                   <div className="hidden sm:block w-1 h-1 bg-slate-300 rounded-full"></div>
                   <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      <div className="flex items-center gap-2">
                        <span className={`font-mono ${isPasswordVisible ? 'bg-yellow-100 text-yellow-800 px-1 rounded' : ''}`}>
                            {isPasswordVisible ? (owner.decrypted_password || 'No Password Stored') : '••••••••••••'}
                        </span>
                        <button onClick={onTogglePassword} className="hover:bg-slate-100 p-1 rounded transition-colors">
                            {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4">
                   <StatBadge label="Products" value={owner.stock_count || 0} />
                   <StatBadge label="Materials" value={owner.material_count || 0} />
                </div>
             </div>
          </div>

          {/* Actions & Employee Toggle */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
             <div className="flex items-center gap-2 w-full lg:w-auto">
                 <Button 
                   variant="outline" 
                   onClick={onToggleExpand}
                   className={`flex-1 lg:flex-none border-slate-200 hover:bg-slate-50 text-slate-600 ${isExpanded ? 'bg-slate-50 border-slate-300' : ''}`}
                 >
                    <Users className="w-4 h-4 mr-2" />
                    Employees
                    <span className="ml-2 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-xs font-bold border border-slate-200">
                       {employeeCount}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 ml-2 opacity-50" /> : <ChevronDown className="w-4 h-4 ml-2 opacity-50" />}
                 </Button>
                 
                 <Button 
                   variant="ghost" 
                   size="icon"
                   className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                   onClick={onDelete}
                 >
                    <Trash2 className="w-4 h-4" />
                 </Button>
             </div>
             <p className="hidden lg:block text-xs text-slate-400">
                Created: {new Date(owner.created_at).toLocaleDateString()}
             </p>
          </div>

        </div>
      </div>

      {/* Expanded Employee List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
             initial={{ height: 0, opacity: 0 }}
             animate={{ height: "auto", opacity: 1 }}
             exit={{ height: 0, opacity: 0 }}
             className="bg-slate-50 border-t border-slate-200"
          >
             <div className="p-6 pt-2">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                       <BadgeCheck className="w-4 h-4 text-emerald-500" />
                       Registered Employees for {owner.business_name}
                    </h4>
                </div>

                {employeeCount > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {owner.employees.map(emp => (
                         <div key={emp.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                {emp.name.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                                <p className="text-xs text-slate-500 mb-1">{emp.email}</p>
                                <div className="flex gap-2">
                                   <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 uppercase">
                                      {emp.role}
                                   </span>
                                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                      emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                   }`}>
                                      {emp.status}
                                   </span>
                                </div>
                             </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="text-center py-6 text-slate-400 italic text-sm bg-slate-100/50 rounded-xl border border-slate-200 border-dashed">
                      No employees registered for this business yet.
                   </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatBadge({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
       <span className="text-slate-500">{label}:</span>
       <span className="font-bold text-slate-700">{value}</span>
    </div>
  );
}

export default AdminDashboard;