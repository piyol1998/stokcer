import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { History, ChevronDown, ChevronUp, Trash2, Coins, Calculator, Layers, Beaker, Wine, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { getColorForString } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function ProductionHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  // State for manual bottle estimation per row
  const [bottleEstimators, setBottleEstimators] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [histData, matData] = await Promise.all([
          supabase
            .from('production_history')
            .select('*')
            .order('date', { ascending: false }),
          supabase.from('raw_materials').select('*')
      ]);
      
      setHistory(histData.data || []);
      setMaterials(matData.data || []);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async (e, id, name) => {
      e.stopPropagation(); // Prevent toggling accordion
      if(!window.confirm("Yakin ingin menghapus riwayat produksi ini? Data stok tidak akan dikembalikan otomatis.")) return;

      try {
          const { error } = await supabase.from('production_history').delete().eq('id', id);
          if (error) throw error;
          
          toast({ title: "Berhasil", description: `Riwayat produksi ${name} dihapus.` });
          fetchData();
      } catch (err) {
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      }
  };

  const formatDate = (str) => {
      const d = new Date(str);
      return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes()}`;
  };

  // Helper to calculate cost based on current material prices
  const calculateCost = (ingredients) => {
      if (!ingredients || !Array.isArray(ingredients)) return 0;
      return ingredients.reduce((sum, item) => {
          const mat = materials.find(m => m.id === item.materialId);
          // Calculate price per unit based on pack size if available
          const pricePerUnit = (mat?.price_per_qty_amount && mat.price_per_qty_amount > 0) 
              ? (mat.price / mat.price_per_qty_amount) 
              : (mat?.price || 0);

          return sum + (parseFloat(item.quantity) * pricePerUnit);
      }, 0);
  };
  
  const handleBottleSizeChange = (id, val) => {
      setBottleEstimators(prev => ({...prev, [id]: val}));
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat riwayat...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Riwayat Produksi</h2>
      </div>

      <div className="space-y-4">
        {history.map((item) => {
            const batchId = `BATCH${item.id.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
            const isExpanded = expandedId === item.id;
            const badgeColor = getColorForString(item.recipe_name);
            const estimatedCost = calculateCost(item.ingredients_snapshot);
            
            // Total volume for percentage calculation
            const totalVolume = parseFloat(item.quantity) || 0;

            // Bottle Estimation Logic
            const customSize = bottleEstimators[item.id] ? parseFloat(bottleEstimators[item.id]) : 0;
            let bottleEstimateDisplay = "Pilih Ukuran";
            let bottleCount = 0;
            
            if (customSize > 0 && totalVolume > 0) {
                const count = Math.floor(totalVolume / customSize);
                bottleCount = count;
                bottleEstimateDisplay = `${count} botol`;
            } else if (!bottleEstimators[item.id] && totalVolume > 0) {
                 // Try to guess default size 30ml
                 bottleCount = Math.floor(totalVolume / 30);
                 bottleEstimateDisplay = `~${bottleCount} @ 30ml`;
            }
            
            const costPerBottle = bottleCount > 0 ? estimatedCost / bottleCount : 0;

            return (
                <div key={item.id} className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden shadow-lg transition-all group">
                    <div 
                        onClick={() => toggleExpand(item.id)}
                        className="p-6 cursor-pointer hover:bg-slate-800/50"
                    >
                         {/* Header Row: ID, Name, Date */}
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-700/50 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-slate-200 tracking-wider font-mono">{batchId}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${badgeColor}`}>
                                    {item.recipe_name}
                                </span>
                            </div>
                            <div className="text-sm text-slate-500">
                                {formatDate(item.date)}
                            </div>
                         </div>

                         {/* Info Row: Target, Bottles, etc. */}
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                              {/* Target Quantity */}
                              <div>
                                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Total Volume</p>
                                  <div className="flex items-center gap-2 text-slate-200">
                                      <Beaker className="w-4 h-4 text-indigo-400" />
                                      <span className="font-bold">{totalVolume} ml</span>
                                  </div>
                              </div>

                              {/* Bottle Estimate with Manual Input */}
                              <div onClick={(e) => e.stopPropagation()}> 
                                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Estimasi Botol</p>
                                  <div className="flex items-center gap-2 text-slate-200">
                                      <Wine className="w-4 h-4 text-pink-400" />
                                      <div className="flex flex-col">
                                          <span className="font-bold text-sm leading-tight">{bottleEstimateDisplay}</span>
                                          <select 
                                            className="mt-1 bg-slate-900 border border-slate-700 text-[10px] rounded px-1 py-0.5 text-slate-400 outline-none focus:border-indigo-500"
                                            value={bottleEstimators[item.id] || ''}
                                            onChange={(e) => handleBottleSizeChange(item.id, e.target.value)}
                                          >
                                              <option value="">Ubah Ukuran...</option>
                                              <option value="15">15 ml</option>
                                              <option value="20">20 ml</option>
                                              <option value="25">25 ml</option>
                                              <option value="30">30 ml</option>
                                              <option value="35">35 ml</option>
                                              <option value="50">50 ml</option>
                                              <option value="60">60 ml</option>
                                              <option value="100">100 ml</option>
                                          </select>
                                      </div>
                                  </div>
                              </div>

                               {/* Cost */}
                               <div>
                                 <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Modal Total</p>
                                 <div className="flex flex-col">
                                     <div className="flex items-center gap-2 text-emerald-400">
                                         <Coins className="w-4 h-4" />
                                         <span className="font-bold">Rp {estimatedCost.toLocaleString()}</span>
                                     </div>
                                     <div className="text-[10px] text-emerald-500/70 mt-0.5 flex items-center gap-1">
                                         <span>@ Rp {costPerBottle.toLocaleString('id-ID', { maximumFractionDigits: 0 })} / botol</span>
                                         <TooltipProvider>
                                             <Tooltip>
                                                 <TooltipTrigger>
                                                     <HelpCircle className="w-3 h-3 text-emerald-500/50" />
                                                 </TooltipTrigger>
                                                 <TooltipContent className="bg-slate-900 border-slate-700">
                                                     <p className="text-xs">Estimasi modal bahan per botol</p>
                                                 </TooltipContent>
                                             </Tooltip>
                                         </TooltipProvider>
                                     </div>
                                 </div>
                               </div>

                               {/* Actions */}
                               <div className="flex justify-end items-center gap-2">
                                     <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => handleDelete(e, item.id, item.recipe_name)}
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </Button>
                                     {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                               </div>
                         </div>
                    </div>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-700/50 bg-[#0f172a]"
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Layers className="w-4 h-4 text-slate-400" />
                                        <h4 className="text-sm font-semibold text-slate-300">Breakdown Komposisi Batch</h4>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-2">
                                        {/* Table Header */}
                                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 px-3 pb-2 border-b border-slate-700/50">
                                            <div className="col-span-5">Material</div>
                                            <div className="col-span-2 text-right">Qty</div>
                                            <div className="col-span-2 text-right">%</div>
                                            <div className="col-span-3 text-right">Est. Cost</div>
                                        </div>

                                        {item.ingredients_snapshot?.map((ing, idx) => {
                                            const mat = materials.find(m => m.id === ing.materialId);
                                            // Fallback to snapshot price if needed, but simplified here to current price
                                            const pricePerUnit = (mat?.price_per_qty_amount && mat.price_per_qty_amount > 0) 
                                                ? (mat.price / mat.price_per_qty_amount) 
                                                : (mat?.price || 0);

                                            const rowCost = parseFloat(ing.quantity) * pricePerUnit;
                                            
                                            // Calculate percentage relative to total batch volume
                                            const divisor = totalVolume > 0 ? totalVolume : 1;
                                            const percentage = (parseFloat(ing.quantity) / divisor) * 100;

                                            return (
                                                <div key={idx} className="grid grid-cols-12 gap-2 text-sm p-3 rounded bg-[#1e293b]/50 border border-slate-800/50 hover:bg-[#1e293b] items-center">
                                                    <div className="col-span-5 text-slate-200 font-medium">
                                                        {ing.materialName}
                                                    </div>
                                                    <div className="col-span-2 text-right text-slate-400">
                                                        {parseFloat(ing.quantity).toFixed(2)} <span className="text-[10px]">{ing.unit}</span>
                                                    </div>
                                                    <div className="col-span-2 text-right text-indigo-400 font-mono text-xs">
                                                        {percentage.toFixed(1)}%
                                                    </div>
                                                    <div className="col-span-3 text-right text-emerald-500 font-mono text-xs">
                                                        Rp {rowCost.toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        <div className="grid grid-cols-12 gap-2 text-sm pt-3 mt-2 border-t border-slate-700 px-3">
                                            <div className="col-span-9 text-right font-bold text-slate-400">TOTAL BATCH COST</div>
                                            <div className="col-span-3 text-right font-bold text-emerald-400">Rp {estimatedCost.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        })}
        {history.length === 0 && !loading && (
             <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-lg">
                <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>Belum ada riwayat produksi.</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default ProductionHistory;