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
    AlertCircle
} from 'lucide-react';
import { getColorForString } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

const ProductionBatchModal = ({ isOpen, onClose, ownerId }) => {
    const { toast } = useToast();
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // View State: 'list' | 'detail'
    const [view, setView] = useState('list');
    const [selectedBatch, setSelectedBatch] = useState(null);

    // Form State for Bottling
    const [bottlingForm, setBottlingForm] = useState({
        size: '', // ml per bottle
        count: '', // number of bottles
        date: new Date().toISOString().split('T')[0]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && ownerId) {
            setView('list');
            setSelectedBatch(null);
            fetchBatches();
        }
    }, [isOpen, ownerId]);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('production_history')
                .select('*')
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
        setBottlingForm({
            size: '',
            count: '',
            date: new Date().toISOString().split('T')[0]
        });
    };

    const handleBack = () => {
        setView('list');
        setSelectedBatch(null);
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

            // Get current logs or initialize empty array
            const currentLogs = selectedBatch.bottling_log || [];

            // Create new log entry
            const newLog = {
                id: Date.now().toString(), // simple ID
                date: new Date().toISOString(),
                user_date: bottlingForm.date,
                bottle_size: size,
                bottle_count: count,
                total_ml: totalUsed
            };

            const updatedLogs = [newLog, ...currentLogs];

            // Optimistic update for UI
            const updatedBatch = { ...selectedBatch, bottling_log: updatedLogs };
            setSelectedBatch(updatedBatch);
            setBatches(batches.map(b => b.id === selectedBatch.id ? updatedBatch : b));

            // Save to DB
            // NOTE: This assumes 'bottling_log' column exists. If strictly not allowed to change schema, 
            // we'd need another way. But assuming standard dev flow, we try to update.
            const { error } = await supabase
                .from('production_history')
                .update({ bottling_log: updatedLogs })
                .eq('id', selectedBatch.id);

            if (error) {
                // If column doesn't exist, we might get an error.
                if (error.code === '42703') { // Undefined Column
                    throw new Error("Kolom 'bottling_log' belum dibuat di database. Mohon kontak admin database.");
                }
                throw error;
            }

            toast({ title: "Berhasil", description: `Tercatat: ${count} botol @ ${size}ml` });

            // Reset form (keep date)
            setBottlingForm(prev => ({ ...prev, size: '', count: '' }));

        } catch (error) {
            console.error("Bottling Error:", error);
            toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });

            // Revert optimistic update if needed (simplified here just by re-fetching or keeping dirty state)
            fetchBatches();
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate derived stats
    const getBatchStats = (batch) => {
        const totalVolume = parseFloat(batch.quantity) || 0;
        const logs = batch.bottling_log || [];
        const totalBottled = logs.reduce((acc, curr) => acc + (parseFloat(curr.total_ml) || 0), 0);
        const remaining = totalVolume - totalBottled;
        return { totalVolume, totalBottled, remaining, logs };
    };

    const filteredBatches = batches.filter(batch => {
        const searchLower = searchTerm.toLowerCase();
        const batchId = `BATCH${batch.id.substring(0, 8).toUpperCase()}`;
        return (
            batch.recipe_name?.toLowerCase().includes(searchLower) ||
            batchId.toLowerCase().includes(searchLower)
        );
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
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-opacity-10 ${getColorForString(batch.recipe_name)} border border-white/5`}>
                                                        <Beaker className="w-6 h-6 opacity-70" />
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(() => {
                                    const stats = getBatchStats(selectedBatch);
                                    return (
                                        <>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Volume Awal</p>
                                                <p className="text-2xl font-bold text-white">{stats.totalVolume.toLocaleString()} <span className="text-sm font-normal text-slate-500">ml</span></p>
                                            </div>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Sudah Dibotolkan</p>
                                                <p className="text-2xl font-bold text-indigo-400">{stats.totalBottled.toLocaleString()} <span className="text-sm font-normal text-slate-500">ml</span></p>
                                            </div>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Sisa Volume</p>
                                                <p className={`text-2xl font-bold ${stats.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
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
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 font-medium">Tanggal Pengerjaan</label>
                                            <Input
                                                type="date"
                                                className="bg-slate-800 border-slate-700 focus-visible:ring-pink-500"
                                                value={bottlingForm.date}
                                                onChange={e => setBottlingForm({ ...bottlingForm, date: e.target.value })}
                                                required
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
                                                {selectedBatch.bottling_log.map((log, idx) => (
                                                    <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-200">
                                                                {log.bottle_count} botol x {log.bottle_size} ml
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1">
                                                                {format(new Date(log.user_date || log.date), 'dd MMM yyyy')}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-pink-400">
                                                                -{log.total_ml.toLocaleString()} ml
                                                            </div>
                                                            <div className="text-[10px] text-slate-600 uppercase tracking-wider mt-1">
                                                                TERCATAT
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
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
