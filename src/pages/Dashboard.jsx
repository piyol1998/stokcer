import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardStock from '@/components/dashboard/DashboardStock';
import InventoryManagement from '@/components/dashboard/InventoryManagement';
import SettingsPage from '@/components/dashboard/SettingsPage';
import EmployeeManagement from '@/components/dashboard/inventory/EmployeeManagement';
import MarketplaceIntegration from '@/components/dashboard/marketplace/MarketplaceIntegration';
import AiAdvertising from '@/components/dashboard/AiAdvertising';
import TrialBanner from '@/components/dashboard/TrialBanner';
import PremiumLock from '@/components/dashboard/PremiumLock';
import AIStudio from '@/components/dashboard/ai/AIStudio';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Menu, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper component for loading states
const LoadingSpinner = () => (
  <div className="flex h-full w-full items-center justify-center p-12">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
  </div>
);

function Dashboard() {
  const { user, ownerId } = useAuth();
  const { loading: subLoading, isTrialExpired } = useSubscription();
  const { toast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventoryInitialTab, setInventoryInitialTab] = useState('materials');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Key to force re-mount MarketplaceIntegration after successful TikTok auth
  const [marketplaceKey, setMarketplaceKey] = useState(0);
  const handledCode = useRef(null);

  useEffect(() => {
    // Detect TikTok/Shopee Authorization Redirect
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');

    // Guard: only process each unique code once
    if (code && state === 'stokcer_auth' && handledCode.current !== code) {
      handledCode.current = code;

      const handleTiktokAuth = async () => {
        setActiveTab('marketplace');
        toast({
          title: "🔄 Menyambungkan TikTok Shop...",
          description: "Sedang menukarkan kode otorisasi. Mohon tunggu sebentar.",
        });

        try {
          const { data, error } = await supabase.functions.invoke('marketplace-sync', {
            body: { 
              action: 'exchange_tiktok_token', 
              code: code,
              userId: ownerId 
            }
          });

          if (error) throw new Error(error.message || 'Supabase function error');
          
          if (data?.success) {
            toast({
              title: "✅ Berhasil Tersambung!",
              description: `Toko "${data.shop_name || 'TikTok Shop'}" kini terhubung ke Stokcer.`,
            });
            // Force MarketplaceIntegration re-fetch settings to show CONNECTED
            setMarketplaceKey(k => k + 1);
          } else {
            throw new Error(data?.error || 'Token exchange failed');
          }
        } catch (err) {
          console.error("TikTok Auth Error:", err);
          toast({
            title: "❌ Gagal Menyambung",
            description: err.message || "Gagal menukarkan kode akses. Pastikan App Key & Secret sudah benar.",
            variant: "destructive"
          });
        } finally {
          // Clean URL agar code tidak diproses ulang saat render
          window.history.replaceState({}, document.title, "/dashboard");
        }
      };

      if (ownerId) handleTiktokAuth();
    }
  }, [location, toast, ownerId]);

  const goToInventory = (tab = 'materials') => {
    setInventoryInitialTab(tab);
    setActiveTab('inventory');
  };

  const renderContent = () => {
    // Prevent rendering heavy content until subscription is checked
    if (subLoading) return <LoadingSpinner />;

    // 4. After 7-day trial ends, lock ALL features for free plan users
    // Note: isTrialExpired is calculated in useSubscription. 
    // If Staff, it is ONLY true if Owner is expired.
    if (isTrialExpired) {
      return (
        <div className="relative h-[80vh]">
          <DashboardStock />
          <PremiumLock
            title="Masa Percobaan Berakhir"
            message="Masa trial 7 hari Anda telah habis. Seluruh fitur telah dikunci. Silakan upgrade ke Premium untuk melanjutkan penggunaan Stokcer dan mengakses kembali data Anda."
          />
        </div>
      );
    }

    try {
      switch (activeTab) {
        case 'dashboard':
          return <DashboardStock onNavigate={goToInventory} />;
        case 'inventory':
          return <InventoryManagement onUpdate={() => { }} initialTab={inventoryInitialTab} />;
        case 'employees':
          return <EmployeeManagement />;
        case 'ai-ads':
          return <AiAdvertising />;
        case 'ai-studio':
          return <AIStudio onNavigate={goToInventory} />;
        case 'marketplace':
          return <MarketplaceIntegration key={marketplaceKey} />;
        case 'settings':
          return <SettingsPage />;
        default:
          return <DashboardStock onNavigate={goToInventory} />;
      }
    } catch (error) {
      console.error("Component Render Error:", error);
      return (
        <div className="p-8 text-center text-red-400">
          <p>Something went wrong loading this section. Please refresh.</p>
          <Button variant="outline" className="mt-4" onClick={() => setActiveTab('dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-white overflow-hidden flex-col md:flex-row">
      <Helmet>
        <title>Dashboard - Stokcer</title>
        <meta name="description" content="Stokcer Dashboard for managing inventory, production, and sales." />
      </Helmet>

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Safe Trial Banner - will hide itself for staff */}
        <TrialBanner />

        {/* Mobile Header Bar */}
        <div className="lg:hidden h-16 border-b border-white/10 flex items-center justify-between px-4 bg-[#020617]/80 backdrop-blur-md shrink-0 sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300 hover:bg-slate-800">
            <Menu className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Stokcer
            </span>
          </div>

          <div className="w-10"></div>
        </div>

        {/* Content Area with Suspense for safety */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-20 lg:pb-0">
            <Suspense fallback={<LoadingSpinner />}>
              {renderContent()}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;