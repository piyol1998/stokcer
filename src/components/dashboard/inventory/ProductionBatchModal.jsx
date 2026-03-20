import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Search,
    History,
    Wine,
    ArrowRight,
    ArrowLeft,
    Plus,
    MoreHorizontal,
    Beaker,
    Save,
    AlertCircle,
    Trash2,
    Calculator,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { getColorForString } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const ProductionBatchModal = ({ isOpen, onClose, ownerId }) => {
    const { toast } = useToast();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [materials, setMaterials] = useState([]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
    };

    // View State: 'list' | 'detail'
    const [view, setView] = useState('list');
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [expandedLogId, setExpandedLogId] = useState(null);

    // Form State for Bottling
    const [bottlingForm, setBottlingForm] = useState({
        size: '', // ml per bottle
        count: '', // number of bottles
        description: '', // optional description
        date: new Date().toISOString().split('T')[0],
        bottleMaterialId: '',
        boxMaterialId: '',
        extraMaterialId: '',
        manualExtraCost: '',
        type: 'ready' // 'ready' (stock) or 'sold' (direct out)
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && ownerId) {
            setView('list');
            setSelectedBatch(null);
            fetchBatches();
            fetchMaterials();
        }
    }, [isOpen, ownerId]);

    const fetchMaterials = async () => {
        try {
            const { data, error } = await supabase
                .from('raw_materials')
                .select('*')
                .eq('user_id', ownerId)
                .is('deleted_at', null);
            if (!error) {
                setMaterials(data || []);
            }
        } catch (error) {
            console.error("Error fetching materials:", error);
        }
    };

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('production_history')
                .select(`
                    *,
                    recipe:recipes(image_url)
                `)
                .eq('user_id', ownerId)
                .order('date', { ascending: false });

            if (error) throw error;
            setBatches(data || []);
        } catch (error) {
            console.error("Error fetching batches:", error);
            toast({ title: "Gagal memuat data", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleBatchClick = (batch) => {
        setSelectedBatch(batch);
        setView('detail');
        setExpandedLogId(null);
        setBottlingForm({
            size: '',
            count: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            bottleMaterialId: '',
            boxMaterialId: '',
            extraMaterialId: '',
            manualExtraCost: ''
        });
    };

    const handleBack = () => {
        setView('list');
        setSelectedBatch(null);
        setExpandedLogId(null);
    };

    const handleSaveBottling = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        setIsSubmitting(true);
        try {
            const size = parseFloat(bottlingForm.size);
            const count = parseFloat(bottlingForm.count);

            if (!size || !count || size <= 0 || count <= 0) {
                throw new Error("Mohon isi ukuran dan jumlah botol dengan benar.");
            }

            const totalUsed = size * count;

            // Cost extraction and calculation for logging
            const stats = getBatchStats(selectedBatch);
            let bottleUnitCost = 0;
            if (bottlingForm.bottleMaterialId) {
                const botMat = materials.find(m => m.id === bottlingForm.bottleMaterialId);
                if (botMat) bottleUnitCost = (botMat.price || 0) / (botMat.price_per_qty_amount || 1);
            }
            let boxUnitCost = 0;
            if (bottlingForm.boxMaterialId) {
                const boxMat = materials.find(m => m.id === bottlingForm.boxMaterialId);
                if (boxMat) boxUnitCost = (boxMat.price || 0) / (boxMat.price_per_qty_amount || 1);
            }
            let extraUnitCost = 0;
            if (bottlingForm.extraMaterialId) {
                const extraMat = materials.find(m => m.id === bottlingForm.extraMaterialId);
                if (extraMat) extraUnitCost = (extraMat.price || 0) / (extraMat.price_per_qty_amount || 1);
            }
            const manualExtraCostTotal = parseFloat(bottlingForm.manualExtraCost) || 0;

            const batchCost = selectedBatch?.metadata?.totalCost || 0;
            const batchVol = stats.totalVolume || 1;
            const liquidCostPerMl = batchCost / batchVol;
            const liquidCostTotal = liquidCostPerMl * totalUsed;

            // Get current logs or initialize empty array
            const currentLogs = selectedBatch.bottling_log || [];

            // Create new log entry
            const newLog = {
                id: Date.now().toString(), // simple ID
                date: new Date().toISOString(),
                user_date: bottlingForm.date,
                type: bottlingForm.type,
                bottle_size: size,
                bottle_count: count,
                total_ml: totalUsed,
                description: bottlingForm.description || '',
                bottle_material_id: bottlingForm.bottleMaterialId || null,
                box_material_id: bottlingForm.boxMaterialId || null,
                extra_material_id: bottlingForm.extraMaterialId || null,
                bottle_unit_cost: bottleUnitCost,
                box_unit_cost: boxUnitCost,
                extra_unit_cost: extraUnitCost,
                manual_extra_cost: manualExtraCostTotal,
                liquid_cost_total: liquidCostTotal
            };

            const updatedLogs = [newLog, ...currentLogs];

            // Optimistic update for UI
            const updatedBatch = { ...selectedBatch, bottling_log: updatedLogs };
            setSelectedBatch(updatedBatch);
            setBatches(batches.map(b => b.id === selectedBatch.id ? updatedBatch : b));

            // Save to DB
            const { error } = await supabase
                .from('production_history')
                .update({ bottling_log: updatedLogs })
                .eq('id', selectedBatch.id);

            if (error) {
                if (error.code === '42703') { // Undefined Column
                    throw new Error("Kolom 'bottling_log' belum dibuat di database. Mohon kontak admin database.");
                }
                throw error;
            }

            // Deduct raw materials if selected
            const updates = [];
            const localMatUpdates = [...materials];
            if (newLog.bottle_material_id) {
                const mat = materials.find(m => m.id === newLog.bottle_material_id);
                if (mat) {
                    const newQty = (parseFloat(mat.quantity) || 0) - count;
                    updates.push(supabase.from('raw_materials').update({ quantity: newQty }).eq('id', mat.id));
                    const lIdx = localMatUpdates.findIndex(m => m.id === mat.id);
                    if (lIdx > -1) localMatUpdates[lIdx].quantity = newQty;
                }
            }
            if (newLog.box_material_id) {
                const box = materials.find(m => m.id === newLog.box_material_id);
                if (box) {
                    const newQty = (parseFloat(box.quantity) || 0) - count;
                    updates.push(supabase.from('raw_materials').update({ quantity: newQty }).eq('id', box.id));
                    const lIdx = localMatUpdates.findIndex(m => m.id === box.id);
                    if (lIdx > -1) localMatUpdates[lIdx].quantity = newQty;
                }
            }
            if (newLog.extra_material_id) {
                const xtra = materials.find(m => m.id === newLog.extra_material_id);
                if (xtra) {
                    const newQty = (parseFloat(xtra.quantity) || 0) - count;
                    updates.push(supabase.from('raw_materials').update({ quantity: newQty }).eq('id', xtra.id));
                    const lIdx = localMatUpdates.findIndex(m => m.id === xtra.id);
                    if (lIdx > -1) localMatUpdates[lIdx].quantity = newQty;
                }
            }
            if (updates.length > 0) {
                await Promise.all(updates);
                setMaterials(localMatUpdates);
            }

            // ADD / UPDATE STOCKS (PRODUK JADI) - ONLY IF READY STOCK
            if (bottlingForm.type === 'ready') {
                const productName = `${selectedBatch.recipe_name} ${size}ml`;
                
                // Get recipe image if available
                const { data: recipeData } = await supabase
                    .from('recipes')
                    .select('image_url, metadata')
                    .eq('id', selectedBatch.recipe_id)
                    .single();
                
                const recipeImage = recipeData?.image_url || recipeData?.metadata?.photo_url || null;

                const { data: stockData, error: stockFetchError } = await supabase
                    .from('stocks')
                    .select('id, quantity')
                    .eq('name', productName)
                    .eq('user_id', ownerId)
                    .single();

                if (stockFetchError && stockFetchError.code !== 'PGRST116') {
                    throw new Error(`Gagal memuat status Etalase: ${stockFetchError.message}`);
                }

                if (stockData) {
                    const newStockQty = (parseFloat(stockData.quantity) || 0) + count;
                    const { error: stockUpdateErr } = await supabase.from('stocks').update({ 
                        quantity: newStockQty,
                        image_url: recipeImage // Sync image on update too
                    }).eq('id', stockData.id);
                    if (stockUpdateErr) throw new Error(`Gagal update stok Produk Jadi: ${stockUpdateErr.message}`);
                } else {
                    const { error: stockInsertErr } = await supabase.from('stocks').insert([{ 
                        name: productName, 
                        category: 'Produk Jadi', 
                        quantity: count, 
                        selling_price: 0,
                        user_id: ownerId,
                        image_url: recipeImage // Set image on create
                    }]);
                    if (stockInsertErr) throw new Error(`Gagal menyimpan produk baru di Etalase: ${stockInsertErr.message}`);
                }
            }
            // --- STOCKS AUTOMATION END ---

            toast({ title: "Berhasil", description: `Tercatat: ${count} botol @ ${size}ml` });

            // Reset form (keep date)
            setBottlingForm(prev => ({ ...prev, size: '', count: '', description: '', bottleMaterialId: '', boxMaterialId: '', extraMaterialId: '', manualExtraCost: '', type: 'ready' }));

        } catch (error) {
            console.error("Bottling Error:", error);
            toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });

            // Revert optimistic update if needed (simplified here just by re-fetching or keeping dirty state)
            fetchBatches();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLog = async (logId) => {
        if (!selectedBatch) return;
        if (!window.confirm("Hapus riwayat botoling ini? Stok akan dikembalikan.")) return;

        try {
            const currentLogs = selectedBatch.bottling_log || [];
            const logToDelete = currentLogs.find(l => l.id === logId);
            const updatedLogs = currentLogs.filter(log => log.id !== logId);

            // Optimistic update
            const updatedBatch = { ...selectedBatch, bottling_log: updatedLogs };
            setSelectedBatch(updatedBatch);
            setBatches(batches.map(b => b.id === selectedBatch.id ? updatedBatch : b));

            // Save to DB
            const { error } = await supabase
                .from('production_history')
                .update({ bottling_log: updatedLogs })
                .eq('id', selectedBatch.id);

            if (error) throw error;

            // Restore stock
            if (logToDelete) {
                const updates = [];
                const localMatUpdates = [...materials];
                const count = parseFloat(logToDelete.bottle_count) || 0;

                if (logToDelete.bottle_material_id) {
                    const mat = materials.find(m => m.id === logToDelete.bottle_material_id);
                    if (mat) {
                        const newQty = (parseFloat(mat.quantity) || 0) + count;
                        updates.push(supabase.from('raw_materials').update({ quantity: newQty }).eq('id', mat.id));
                        const lIdx = localMatUpdates.findIndex(m => m.id === mat.id);
                        if (lIdx > -1) localMatUpdates[lIdx].quantity = newQty;
                    }
                }
                if (logToDelete.box_material_id) {
                    const box = materials.find(m => m.id === logToDelete.box_material_id);
                    if (box) {
                        const newQty = (parseFloat(box.quantity) || 0) + count;
                        updates.push(supabase.from('raw_materials').update({ quantity: newQty }).eq('id', box.id));
                        const lIdx = localMatUpdates.findIndex(m => m.id === box.id);
                        if (lIdx > -1) localMatUpdates[lIdx].quantity = newQty;
                    }
                }
                if (logToDelete.extra_material_id) {
                    const xtra = materials.find(m => m.id === logToDelete.extra_material_id);
                    if (xtra) {
                        const newQty = (parseFloat(xtra.quantity) || 0) + count;
                        updates.push(supabase.from('raw_materials').update({ quantity: newQty }).eq('id', xtra.id));
                        const lIdx = localMatUpdates.findIndex(m => m.id === xtra.id);
                        if (lIdx > -1) localMatUpdates[lIdx].quantity = newQty;
                    }
                }
                if (updates.length > 0) {
                    await Promise.all(updates);
                    setMaterials(localMatUpdates);
                }

                // --- REVERT STOCKS START ---
                try {
                    const productName = `${selectedBatch.recipe_name} ${logToDelete.bottle_size}ml`;
                    const qtyToRemove = parseFloat(logToDelete.bottle_count) || 0;
                    
                    const { data: stockData } = await supabase
                        .from('stocks')
                        .select('id, quantity')
                        .eq('name', productName)
                        .eq('user_id', ownerId)
                        .single();
                        
                    if (stockData) {
                        const newStockQty = Math.max(0, (parseFloat(stockData.quantity) || 0) - qtyToRemove);
                        await supabase.from('stocks').update({ quantity: newStockQty }).eq('id', stockData.id);
                    }
                } catch (err) {
                    console.error("Revert Stocks error:", err);
                }
                // --- REVERT STOCKS END ---
            }

            toast({ title: "Berhasil dihapus", description: "Stok telah dikembalikan." });

        } catch (error) {
            console.error("Delete Error:", error);
            toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
            fetchBatches(); // Revert
        }
    };

    const getBatchStats = (batch) => {
        const totalVolume = parseFloat(batch.quantity) || 0;
        const logs = batch.bottling_log || [];
        const totalBottled = logs.reduce((acc, curr) => acc + (parseFloat(curr.total_ml) || 0), 0);
        const totalBottlesCount = logs.reduce((acc, curr) => acc + (parseFloat(curr.bottle_count) || 0), 0);
        const remaining = totalVolume - totalBottled;
        return { totalVolume, totalBottled, remaining, logs, totalBottlesCount };
    };

    const filteredBatches = batches.filter(batch => {
        const searchLower = searchTerm.toLowerCase();
        const batchId = `BATCH${batch.id.substring(0, 8).toUpperCase()}`;
        return (
            batch.recipe_name?.toLowerCase().includes(searchLower) ||
            batchId.toLowerCase().includes(searchLower)
        );
    });

    const bottleMaterials = materials.filter(m => (m.category || '').toLowerCase().includes('botol') || (m.name || '').toLowerCase().includes('botol'));
    const boxMaterials = materials.filter(m => (m.category || '').toLowerCase().includes('box') || (m.category || '').toLowerCase().includes('kardus') || (m.name || '').toLowerCase().includes('box'));
    const extraMaterials = materials.filter(m => {
        const cat = (m.category || '').toLowerCase();
        const nm = (m.name || '').toLowerCase();

        const isCore = cat.includes('botol') || nm.includes('botol') ||
            cat.includes('box') || cat.includes('kardus') || nm.includes('box') ||
            cat.includes('bibit') || cat.includes('pelarut') || cat.includes('biang') || cat.includes('alkohol');

        return !isCore;
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#0f172a] text-slate-100 border-slate-700 max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                    {view === 'detail' ? (
                        <div className="flex items-center gap-4">
                            <Button size="icon" variant="ghost" onClick={handleBack} className="h-8 w-8 hover:bg-slate-800">
                                <ArrowLeft className="w-5 h-5 text-slate-400" />
                            </Button>
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    Batch {`BATCH-${selectedBatch?.id.substring(0, 8).toUpperCase()}`}
                                </DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Detail produksi dan manajemen stok botol
                                </DialogDescription>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <History className="w-5 h-5 text-purple-400" />
                                    Riwayat & Stok Batch Produksi
                                </DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Klik pada batch untuk mencatat pembotolan dan melihat sisa stok.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Cari Batch ID atau Nama Resep..."
                                    className="bg-slate-800/50 border-slate-700 pl-10 text-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1 bg-[#020617]/50">
                    {loading && view === 'list' ? (
                        <div className="text-center py-20 text-slate-500 animate-pulse">Memuat data produksi...</div>
                    ) : view === 'list' ? (
                        filteredBatches.length === 0 ? (
                            <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-lg m-6">
                                <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Tidak ada data produksi ditemukan.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 p-6">
                                {filteredBatches.map((batch) => {
                                    const stats = getBatchStats(batch);
                                    const percentageLeft = (stats.remaining / stats.totalVolume) * 100;
                                    const batchId = `BATCH-${batch.id.substring(0, 8).toUpperCase()}`;

                                    return (
                                        <div
                                            key={batch.id}
                                            onClick={() => handleBatchClick(batch)}
                                            className="group bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 rounded-xl p-4 cursor-pointer transition-all active:scale-[0.99]"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden bg-opacity-10 ${getColorForString(batch.recipe_name)} border border-white/5 flex-shrink-0`}>
                                                        {batch.recipe?.image_url ? (
                                                            <img 
                                                                src={batch.recipe.image_url} 
                                                                alt={batch.recipe_name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.parentElement.innerHTML = '<span class="beaker-fallback"></span>';
                                                                }}
                                                            />
                                                        ) : (
                                                            <Beaker className="w-6 h-6 opacity-70" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-mono text-xs text-slate-500 font-bold tracking-wider">{batchId}</span>
                                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-800 text-slate-300">
                                                                {batch.recipe_name}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                                            <span className="flex items-center gap-1">
                                                                Total: <span className="text-slate-200 font-semibold">{stats.totalVolume.toLocaleString()} ml</span>
                                                            </span>
                                                            <span className="w-px h-3 bg-slate-700"></span>
                                                            <span className={`flex items-center gap-1 ${percentageLeft < 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                                Sisa: <span className="font-bold">{stats.remaining.toLocaleString()} ml</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <div className="text-xs text-slate-500 mb-1">Tanggal Produksi</div>
                                                        <div className="text-sm text-slate-300 font-medium">
                                                            {format(new Date(batch.date), 'dd MMM yyyy')}
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                                </div>
                                            </div>
                                            {/* Mini Progress Bar */}
                                            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${percentageLeft < 20 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${Math.max(percentageLeft, 0)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : selectedBatch ? (
                        <div className="p-6 space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {(() => {
                                    const stats = getBatchStats(selectedBatch);
                                    return (
                                        <>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Modal Batch</p>
                                                <p className="text-xl font-bold text-white">
                                                    {selectedBatch?.metadata?.totalCost ? formatCurrency(selectedBatch.metadata.totalCost) : <span className="text-sm font-normal text-slate-500 italic">Belum Tercatat (Data Lama)</span>}
                                                </p>
                                            </div>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Volume Awal</p>
                                                <p className="text-xl font-bold text-white">{stats.totalVolume.toLocaleString()} <span className="text-sm font-normal text-slate-500">ml</span></p>
                                            </div>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Sudah Dibotolkan</p>
                                                <p className="text-xl font-bold text-indigo-400">
                                                    {stats.totalBottled.toLocaleString()} <span className="text-sm font-normal text-slate-500">ml</span>
                                                    {stats.totalBottlesCount > 0 && (
                                                        <span className="text-sm font-normal text-slate-500 ml-1.5 opacity-80">
                                                            ({stats.totalBottlesCount.toLocaleString()} botol)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Sisa Volume</p>
                                                <p className={`text-xl font-bold ${stats.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {stats.remaining.toLocaleString()} <span className="text-sm font-normal text-slate-500">ml</span>
                                                </p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Form Section */}
                                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Wine className="w-5 h-5 text-pink-400" />
                                        <h3 className="font-semibold text-white">Catat Pembotolan Baru</h3>
                                    </div>
                                    <div className="mb-4">
                                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-lg border border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => setBottlingForm({ ...bottlingForm, type: 'ready' })}
                                                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${bottlingForm.type === 'ready' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                                            >
                                                <Wine className="w-3.5 h-3.5" />
                                                Ready Stock
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBottlingForm({ ...bottlingForm, type: 'sold' })}
                                                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${bottlingForm.type === 'sold' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                                            >
                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                                Terjual / Sample
                                            </button>
                                        </div>
                                    </div>
                                    <form onSubmit={handleSaveBottling} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 font-medium">Ukuran Botol (ml)</label>
                                                <Input
                                                    type="number"
                                                    placeholder="30"
                                                    className="bg-slate-800 border-slate-700 focus-visible:ring-pink-500"
                                                    value={bottlingForm.size}
                                                    onChange={e => setBottlingForm({ ...bottlingForm, size: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 font-medium">Jumlah Botol (pcs)</label>
                                                <Input
                                                    type="number"
                                                    placeholder="100"
                                                    className="bg-slate-800 border-slate-700 focus-visible:ring-pink-500"
                                                    value={bottlingForm.count}
                                                    onChange={e => setBottlingForm({ ...bottlingForm, count: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 font-medium">Material Botol (Opsional)</label>
                                                <select
                                                    className="w-full bg-slate-800 border-slate-700 text-sm text-slate-200 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                                    value={bottlingForm.bottleMaterialId}
                                                    onChange={e => {
                                                        const botId = e.target.value;
                                                        const updates = { bottleMaterialId: botId };
                                                        if (botId) {
                                                            const chosen = bottleMaterials.find(m => m.id === botId);
                                                            const match = chosen?.name.match(/ \[(\d+(?:\.\d+)?)\s*(?:ml|gr)\]$/i);
                                                            if (match) {
                                                                updates.size = match[1];
                                                            }
                                                        }
                                                        setBottlingForm({ ...bottlingForm, ...updates });
                                                    }}
                                                >
                                                    <option value="">-- Pilih Botol --</option>
                                                    {bottleMaterials.map(mat => (
                                                        <option key={mat.id} value={mat.id}>{mat.name} ({mat.quantity} {mat.unit})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-slate-400 font-medium">Material Box (Opsional)</label>
                                                <select
                                                    className="w-full bg-slate-800 border-slate-700 text-sm text-slate-200 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                                    value={bottlingForm.boxMaterialId}
                                                    onChange={e => setBottlingForm({ ...bottlingForm, boxMaterialId: e.target.value })}
                                                >
                                                    <option value="">-- Pilih Box --</option>
                                                    {boxMaterials.map(mat => (
                                                        <option key={mat.id} value={mat.id}>{mat.name} ({mat.quantity} {mat.unit})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 font-medium">Bahan Tambahan (Opsional)</label>
                                            <select
                                                className="w-full bg-slate-800 border-slate-700 text-sm text-slate-200 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                                value={bottlingForm.extraMaterialId}
                                                onChange={e => setBottlingForm({ ...bottlingForm, extraMaterialId: e.target.value })}
                                            >
                                                <option value="">-- Pilih Aksesoris / Material Lain --</option>
                                                {extraMaterials.map(mat => (
                                                    <option key={mat.id} value={mat.id}>{mat.name} ({mat.quantity} {mat.unit})</option>
                                                ))}
                                            </select>
                                            <p className="text-[10px] text-slate-500">Contoh: Shieldtag, Lakban, Bubble Wrap, dll</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 font-medium">Biaya Tambahan Lainnya (Opsional Rp)</label>
                                            <Input
                                                type="number"
                                                placeholder="Contoh: 5000"
                                                className="bg-slate-800 border-slate-700 focus-visible:ring-indigo-500"
                                                value={bottlingForm.manualExtraCost}
                                                onChange={e => setBottlingForm({ ...bottlingForm, manualExtraCost: e.target.value })}
                                            />
                                            <p className="text-[10px] text-slate-500 italic">Biaya jasa atau biaya lain yang bukan material stok.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 font-medium">Tanggal Pengerjaan</label>
                                            <Input
                                                type="date"
                                                className="bg-slate-800 border-slate-700 focus-visible:ring-pink-500"
                                                value={bottlingForm.date}
                                                onChange={e => setBottlingForm({ ...bottlingForm, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 font-medium">Deskripsi (Opsional)</label>
                                            <Input
                                                placeholder="Contoh: Pesanan untuk Cafe A"
                                                className="bg-slate-800 border-slate-700 focus-visible:ring-pink-500"
                                                value={bottlingForm.description}
                                                onChange={e => setBottlingForm({ ...bottlingForm, description: e.target.value })}
                                            />
                                        </div>

                                        {/* Preview Calc */}
                                        {bottlingForm.size && bottlingForm.count && (
                                            <div className="bg-slate-800/50 rounded-lg p-3 text-xs flex justify-between items-center border border-slate-700/50">
                                                <span className="text-slate-400">Total Penggunaan:</span>
                                                <span className="text-pink-400 font-bold text-sm">
                                                    {(parseFloat(bottlingForm.size) * parseFloat(bottlingForm.count)).toLocaleString()} ml
                                                </span>
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Menyimpan...' : 'Simpan Data Botoling'}
                                        </Button>
                                    </form>
                                </div>

                                {/* History Section */}
                                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[400px]">
                                    <div className="p-4 border-b border-slate-800 bg-slate-950/30">
                                        <h3 className="font-semibold text-slate-300 text-sm">Riwayat Botoling Batch Ini</h3>
                                    </div>
                                    <ScrollArea className="flex-1">
                                        {selectedBatch.bottling_log && selectedBatch.bottling_log.length > 0 ? (
                                            <div className="divide-y divide-slate-800">
                                                {selectedBatch.bottling_log.map((log, idx) => {
                                                    const liquidCost = log.liquid_cost_total || 0;
                                                    const botCost = (log.bottle_unit_cost || 0) * (log.bottle_count || 1);
                                                    const bxCost = (log.box_unit_cost || 0) * (log.bottle_count || 1);
                                                    const xtraCost = (log.extra_unit_cost || 0) * (log.bottle_count || 1);
                                                    const manualXtra = log.manual_extra_cost || 0;
                                                    const totalModalBotoling = liquidCost + botCost + bxCost + xtraCost + manualXtra;
                                                    const hargaPerBotol = totalModalBotoling / (log.bottle_count || 1);

                                                    return (
                                                        <div key={idx} className="flex flex-col border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                                                            {/* Header Row (Clickable) */}
                                                            <div
                                                                className="p-4 flex justify-between items-start group cursor-pointer"
                                                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="text-sm font-medium text-slate-200">
                                                                        {log.bottle_count} botol x {log.bottle_size} ml
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                                        <span>{format(new Date(log.user_date || log.date), 'dd MMM yyyy')}</span>
                                                                        <span className="text-slate-800">•</span>
                                                                        <Badge variant="outline" className={`text-[9px] px-1 py-0 leading-none ${log.type === 'sold' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                                            {log.type === 'sold' ? 'Terjual / Keluar' : 'Ready Stock'}
                                                                        </Badge>
                                                                    </div>
                                                                    {log.description && (
                                                                        <div className="text-xs text-slate-400 mt-1 italic">
                                                                            "{log.description}"
                                                                        </div>
                                                                    )}
                                                                    {(log.bottle_material_id || log.box_material_id || log.extra_material_id) && (
                                                                        <div className="flex flex-wrap gap-1 mt-2 mb-2">
                                                                            {log.bottle_material_id && <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/20">Botol</Badge>}
                                                                            {log.box_material_id && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/20">Box</Badge>}
                                                                            {log.extra_material_id && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">Tambahan</Badge>}
                                                                        </div>
                                                                    )}

                                                                    {/* Summarized Cost Hint */}
                                                                    {log.liquid_cost_total !== undefined && expandedLogId !== log.id && (
                                                                        <div className="mt-2 text-[10px] flex items-center gap-2 text-slate-400 font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                                                            <Calculator className="w-3 h-3 text-emerald-500" />
                                                                            <span>Modal: <span className="text-slate-300">{formatCurrency(totalModalBotoling)}</span></span>
                                                                            <span className="text-slate-600 px-1">•</span>
                                                                            <span className="text-indigo-400 flex items-center gap-0.5">Lihat Detail <ChevronDown className="w-3 h-3" /></span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col items-end gap-3 justify-start min-w-[100px]">
                                                                    <div className="text-right flex-1 pt-1">
                                                                        <div className="text-sm font-bold text-pink-400">
                                                                            -{log.total_ml.toLocaleString()} ml
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-600 uppercase tracking-wider mt-1">
                                                                            TERCATAT
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteLog(log.id); }}
                                                                        className="h-8 w-8 mt-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity self-end"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {/* Expanded Detailed Cost breakdown */}
                                                            {expandedLogId === log.id && log.liquid_cost_total !== undefined && (
                                                                <div className="px-4 pb-4 pt-1 flex justify-center">
                                                                    <div className="w-full flex flex-col gap-2 p-3 bg-slate-950/80 shadow-inner border border-slate-700/50 rounded-lg cursor-text" onClick={e => e.stopPropagation()}>
                                                                        <div className="text-[11px] flex items-center gap-1.5 text-indigo-300 font-semibold mb-1">
                                                                            <Calculator className="w-3.5 h-3.5" />
                                                                            Rincian Harga Modal
                                                                            <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto text-slate-500 hover:text-white" onClick={() => setExpandedLogId(null)}>
                                                                                <ChevronUp className="w-3 h-3" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="bg-slate-900 rounded p-2 border border-slate-800">
                                                                            <div className="text-[11px] flex justify-between gap-4 border-b border-slate-700/50 pb-2 mb-2">
                                                                                <span className="text-slate-400 font-medium">BIAYA MODAL 1 BOTOL</span>
                                                                                <span className="text-emerald-400 font-bold">{formatCurrency(hargaPerBotol)}</span>
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                <div className="text-[11px] flex justify-between gap-4">
                                                                                    <span className="text-slate-500">- Liquid Isi <span className="opacity-70">({log.bottle_size} ml)</span>:</span>
                                                                                    <span className="text-slate-300">{formatCurrency(liquidCost / (log.bottle_count || 1))}</span>
                                                                                </div>
                                                                                {(log.bottle_material_id) && (
                                                                                    <div className="text-[11px] flex justify-between gap-4">
                                                                                        <span className="text-slate-500">- Fisik Botol <span className="opacity-70">(1 pcs)</span>:</span>
                                                                                        <span className="text-slate-300">{log.bottle_unit_cost ? formatCurrency(log.bottle_unit_cost) : 'Rp 0'}</span>
                                                                                    </div>
                                                                                )}
                                                                                {(log.box_material_id) && (
                                                                                    <div className="text-[11px] flex justify-between gap-4">
                                                                                        <span className="text-slate-500">- Fisik Box <span className="opacity-70">(1 pcs)</span>:</span>
                                                                                        <span className="text-slate-300">{log.box_unit_cost ? formatCurrency(log.box_unit_cost) : 'Rp 0'}</span>
                                                                                    </div>
                                                                                )}
                                                                                {(log.extra_material_id) && (
                                                                                    <div className="text-[11px] flex justify-between gap-4">
                                                                                        <span className="text-slate-500">- Bahan Tambahan <span className="opacity-70">(1 pcs)</span>:</span>
                                                                                        <span className="text-slate-300">{log.extra_unit_cost ? formatCurrency(log.extra_unit_cost) : 'Rp 0'}</span>
                                                                                    </div>
                                                                                )}
                                                                                {(log.manual_extra_cost > 0) && (
                                                                                    <div className="text-[11px] flex justify-between gap-4">
                                                                                        <span className="text-slate-500">- Biaya Lain <span className="opacity-70">(Manual)</span>:</span>
                                                                                        <span className="text-slate-300">{formatCurrency(log.manual_extra_cost / (log.bottle_count || 1))}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-xs flex justify-between items-center gap-4 bg-indigo-500/10 border border-indigo-500/20 p-2 rounded mt-1">
                                                                            <span className="text-indigo-300 font-medium">TOTAL PENGELUARAN <span className="opacity-75">(x{log.bottle_count} botol)</span></span>
                                                                            <span className="text-indigo-100 font-bold">{formatCurrency(totalModalBotoling)}</span>
                                                                        </div>

                                                                        {!selectedBatch?.metadata?.totalCost && log.liquid_cost_total === 0 && (
                                                                            <div className="text-[10px] text-slate-500 italic mt-1 text-center">
                                                                                *Modal Liquid 0 karena Batch lawas ini direkam tanpa fitur pelacak harga.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                                                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                                                    <History className="w-6 h-6 opacity-30" />
                                                </div>
                                                <p className="text-sm">Belum ada riwayat botoling.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default ProductionBatchModal;
