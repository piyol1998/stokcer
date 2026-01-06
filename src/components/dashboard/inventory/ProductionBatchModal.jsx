import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from '@/components/ui/dialog';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, History, Wine, ArrowRight } from 'lucide-react';
import { getColorForString } from '@/lib/utils';
import { format } from 'date-fns';

const ProductionBatchModal = ({ isOpen, onClose, ownerId }) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Local state for the "Bottling Calculator"
    // Format: { [batchId]: { bottledAmount: 0 } }
    const [calculators, setCalculators] = useState({});

    useEffect(() => {
        if (isOpen && ownerId) {
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
        } finally {
            setLoading(false);
        }
    };

    const handleBottlingChange = (batchId, value) => {
        setCalculators(prev => ({
            ...prev,
            [batchId]: { ...prev[batchId], bottledAmount: value }
        }));
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
            <DialogContent className="bg-[#0f172a] text-slate-100 border-slate-700 max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 border-b border-slate-700 space-y-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <History className="w-5 h-5 text-purple-400" />
                            Riwayat & Stok Batch Produksi
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Lihat detail batch produksi, total volume, dan kalkulasi sisa stok setelah pembotolan.
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

                <ScrollArea className="flex-1 p-6">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Memuat data...</div>
                    ) : filteredBatches.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                            <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Tidak ada data produksi ditemukan.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredBatches.map((batch) => {
                                const batchId = `BATCH-${batch.id.substring(0, 8).toUpperCase()}`;
                                const totalVolume = parseFloat(batch.quantity) || 0;
                                const bottled = parseFloat(calculators[batch.id]?.bottledAmount) || 0;
                                const remaining = totalVolume - bottled;
                                const isWarning = remaining < (totalVolume * 0.2); // Low stock warning visual

                                return (
                                    <div key={batch.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                                        <div className="flex flex-col md:flex-row justify-between gap-4">
                                            {/* Batch Info */}
                                            <div className="space-y-2 min-w-[200px]">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-slate-500">{batchId}</span>
                                                    <Badge variant="outline" className={`${getColorForString(batch.recipe_name)} bg-opacity-10 border-opacity-20`}>
                                                        {batch.recipe_name}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {format(new Date(batch.date), 'dd MMM yyyy, HH:mm')}
                                                </div>
                                            </div>

                                            {/* Volume Calculator */}
                                            <div className="flex-1 bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                                    
                                                    {/* Total Volume */}
                                                    <div>
                                                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total Volume</span>
                                                        <div className="text-lg font-bold text-slate-200">
                                                            {totalVolume.toLocaleString()} <span className="text-xs font-normal text-slate-500">ml</span>
                                                        </div>
                                                    </div>

                                                    {/* Bottling Input */}
                                                    <div className="flex bg-slate-900 rounded-md border border-slate-700 items-center overflow-hidden">
                                                        <div className="px-3 bg-slate-800 border-r border-slate-700 h-full flex items-center justify-center">
                                                            <Wine className="w-4 h-4 text-pink-400" />
                                                        </div>
                                                        <Input 
                                                            type="number" 
                                                            className="border-0 bg-transparent focus-visible:ring-0 h-10 w-full text-right font-mono text-sm"
                                                            placeholder="0"
                                                            value={calculators[batch.id]?.bottledAmount || ''}
                                                            onChange={(e) => handleBottlingChange(batch.id, e.target.value)}
                                                        />
                                                        <div className="px-2 text-xs text-slate-500">ml</div>
                                                    </div>

                                                    {/* Remaining (Sisa) */}
                                                    <div className="text-right">
                                                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Sisa Volume</span>
                                                        <div className={`text-xl font-bold font-mono ${remaining < 0 ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                            {remaining.toLocaleString()} <span className="text-xs font-normal text-slate-500">ml</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
                
                <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-between items-center text-xs text-slate-500">
                    <p>* Kalkulasi "Sisa Volume" saat ini hanya bersifat visual dan belum disimpan ke database permanen.</p>
                    <Button onClick={onClose} variant="secondary">Tutup</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ProductionBatchModal;
