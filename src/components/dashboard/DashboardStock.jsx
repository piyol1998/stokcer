import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, Activity, BarChart3, DollarSign, Clock, Coins, Wallet } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import RecentActivityWidget from './RecentActivityWidget';
import ProductionBatchModal from './inventory/ProductionBatchModal';

const DashboardStock = () => {
  const { user, ownerId } = useAuth();
  const [stats, setStats] = useState({
    totalModal: 0,
    materials: 0,
    production: 0,
    totalModalDikeluarkan: 0,
    sisaModalBahan: 0
  });
  const [loading, setLoading] = useState(true);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  useEffect(() => {
    if (ownerId) {
      fetchStats();

      // Realtime Subscription for Owner's Data
      const changes = supabase
        .channel('dashboard-stats-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'raw_materials',
            filter: `user_id=eq.${ownerId}`
          },
          () => fetchStats()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'production_history',
            filter: `user_id=eq.${ownerId}`
          },
          () => fetchStats()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(changes);
      };
    }
  }, [ownerId]);

  const fetchStats = async () => {
    if (!ownerId) return;

    try {
      // 1. Fetch Material details
      const { data: materialsData } = await supabase
        .from('raw_materials')
        .select('id, price, price_per_qty_amount, quantity, initial_stock')
        .eq('user_id', ownerId)
        .is('deleted_at', null);

      // Create a map for quick price lookup: { materialId: pricePerUnit }
      // Also calculate total value of current stock
      const priceMap = {};
      let totalStockValue = 0;
      let totalMaterialCost = 0;

      if (materialsData) {
        materialsData.forEach(m => {
          const price = Number(m.price) || 0;
          const amount = Number(m.price_per_qty_amount) || 1;
          const pricePerUnit = price / amount;
          priceMap[m.id] = pricePerUnit;

          // Sisa Modal Bahan Baku = current qty * price per unit
          totalStockValue += (Number(m.quantity) || 0) * pricePerUnit;

          // Estimate Total Modal Dikeluarkan (Approximation based on current price if historical purchases table doesn't exist)
          // Ideally we would sum up purchase history logs, but for now we use (initial_stock + restocks) * price
          // Since we don't track all restocks historically in a separate table yet, we can approximate:
          // Modal Dikeluarkan = (Current Stock Value) + (Value Consumed in Production)
          // OR, if we assume price is constant, we can track total purchased. 
          // Better approach for now: Use Production Cost + Current Stock Value = Total Modal input into system (roughly)
          // For a cleaner metric: "Total Modal Dikeluarkan" = Total Value of Materials EVER added.
          // Without a purchase history table, let's use: Total Production Cost + Current Material Value.
        });
      }

      // 2. Calculate Total Production Cost
      const { data: productionHistory, error: prodError } = await supabase
        .from('production_history')
        .select('ingredients_snapshot, quantity')
        .eq('user_id', ownerId);

      let totalProductionCost = 0;

      if (!prodError && productionHistory) {
        productionHistory.forEach(record => {
          if (Array.isArray(record.ingredients_snapshot)) {
            record.ingredients_snapshot.forEach(ing => {
              const qty = Number(ing.quantity) || 0;
              let unitPrice = 0;

              // Check if snapshot has price info, else fallback to current
              if (ing.pricePerUnit) {
                unitPrice = Number(ing.pricePerUnit);
              } else if (ing.materialId && priceMap[ing.materialId]) {
                unitPrice = priceMap[ing.materialId];
              }

              totalProductionCost += (qty * unitPrice);
            });
          }
        });
      }

      // Calculate "Total Modal Dikeluarkan" as (Consumed + Remaining)
      // This represents the total value of assets poured into the system
      const totalModalDikeluarkan = totalProductionCost + totalStockValue;

      // 3. Fetch Material Count (Total Items)
      const { count: materialCount } = await supabase
        .from('raw_materials')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId)
        .is('deleted_at', null);

      // 4. Fetch Production History Count (Batches)
      const { count: productionCount } = await supabase
        .from('production_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId);

      setStats({
        totalModal: totalProductionCost,
        materials: materialCount || 0,
        production: productionCount || 0,
        totalModalDikeluarkan: totalModalDikeluarkan,
        sisaModalBahan: totalStockValue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const Card = ({ title, value, icon: Icon, colorClass, label, watermarkIcon: Watermark, isCurrency = false, onClick, className }) => (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-[#1e293b] border border-slate-800 rounded-3xl p-6 h-48 flex flex-col justify-between shadow-xl transition-transform hover:scale-[1.02] ${onClick ? 'cursor-pointer hover:border-slate-600' : ''} ${className || ''}`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12 pointer-events-none">
        <Watermark className={`w-32 h-32 ${colorClass}`} />
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${colorClass === 'text-blue-500' ? 'bg-blue-500/20 text-blue-400' :
            colorClass === 'text-emerald-500' ? 'bg-emerald-500/20 text-emerald-400' :
              colorClass === 'text-purple-500' ? 'bg-purple-500/20 text-purple-400' :
                colorClass === 'text-amber-500' ? 'bg-amber-500/20 text-amber-400' :
                  colorClass === 'text-rose-500' ? 'bg-rose-500/20 text-rose-400' :
                    colorClass === 'text-cyan-500' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-slate-500/20 text-slate-400'
          }`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 ${colorClass === 'text-blue-500' ? 'text-blue-300' :
            colorClass === 'text-emerald-500' ? 'text-emerald-300' :
              colorClass === 'text-purple-500' ? 'text-purple-300' :
                colorClass === 'text-amber-500' ? 'text-amber-300' :
                  colorClass === 'text-rose-500' ? 'text-rose-300' :
                    colorClass === 'text-cyan-500' ? 'text-cyan-300' :
                      'text-slate-300'
          }`}>
          {label}
        </span>
      </div>

      <div className="relative z-10">
        <h3 className={`font-bold text-white tracking-tight mb-1 ${isCurrency ? 'text-2xl' : 'text-4xl'}`}>
          {loading ? '-' : (isCurrency ? formatCurrency(value) : value)}
        </h3>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400 mt-1">Real-time financial and inventory metrics.</p>
        </div>
        <div className="hidden md:block">
          <span className="text-xs text-slate-500 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Financial Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Total Modal Dikeluarkan"
          value={stats.totalModalDikeluarkan}
          icon={Wallet}
          colorClass="text-rose-500"
          label="INVESTASI TOTAL"
          watermarkIcon={Wallet}
          isCurrency={true}
        />
        <Card
          title="Sisa Modal Bahan Baku"
          value={stats.sisaModalBahan}
          icon={Package}
          colorClass="text-cyan-500"
          label="ASET SAAT INI"
          watermarkIcon={Package}
          isCurrency={true}
        />
        <Card
          title="Total Modal Produksi"
          value={stats.totalModal}
          icon={Coins}
          colorClass="text-amber-500"
          label="BIAYA PRODUKSI"
          watermarkIcon={Coins}
          isCurrency={true}
        />
      </div>

      {/* Operational Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Total Item Bahan Aktif"
          value={stats.materials}
          icon={TrendingUp}
          colorClass="text-emerald-500"
          label="INVENTORY"
          watermarkIcon={TrendingUp}
        />
        <Card
          onClick={() => setIsBatchModalOpen(true)}
          title="Total Batch Produksi"
          value={stats.production}
          icon={Activity}
          colorClass="text-purple-500"
          label="HISTORY"
          watermarkIcon={BarChart3}
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1">
        <RecentActivityWidget userId={ownerId} />
      </div>

      <ProductionBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        ownerId={ownerId}
      />
    </div>
  );
};

export default DashboardStock;