import React, { useState } from 'react';
import { LayoutDashboard, Box, Settings, LogOut, Package, UserPlus as Users, Menu, X, BrainCircuit, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

function Sidebar({ activeTab, setActiveTab, user, isMobileOpen, setIsMobileOpen }) {
  const { signOut, userRole } = useAuth();
  const { checkFeatureAccess } = useSubscription();

  const handleLogout = async () => {
    await signOut();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
        id: 'ai-ads', 
        label: 'AI Advertising', 
        icon: BrainCircuit,
        locked: !checkFeatureAccess('ai_ads')
    },
    { id: 'inventory', label: 'Stok & Produksi', icon: Box },
    { 
        id: 'employees', 
        label: 'Manajemen Karyawan', 
        icon: Users,
        // Update: This is now accessible for staff if owner is premium
        // logic is handled inside checkFeatureAccess
        locked: !checkFeatureAccess('employee_management')
    },
    // Marketplace integration removed as requested
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#020617] border-r border-slate-800">
      <div className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-6 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent tracking-tight">
            Stokcer
          </h1>
        </div>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 text-slate-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                  {item.locked && (
                      <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full border border-slate-700">
                        <Lock className="w-2.5 h-2.5 text-red-400" />
                      </div>
                  )}
              </div>
              <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-800">
           <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1 tracking-wider">
              {userRole === 'owner' ? 'Owner Account' : `Employee (${userRole})`}
           </p>
           <p className="text-sm font-medium text-slate-300 truncate" title={user?.email}>
             {user?.email}
           </p>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10 gap-3"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col h-screen shrink-0 sticky top-0 font-sans z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-[#020617] z-50 lg:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;