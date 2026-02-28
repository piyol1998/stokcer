import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Database, Plus, Search, ShoppingCart, Edit, ExternalLink, Calendar as CalendarIcon, DollarSign, Package, Trash2, Lock, AlertTriangle, Filter, ChevronDown, Check, Droplets, FlaskConical, Layers, Component, Box, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { logNotification } from '@/lib/notificationUtils';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

function MaterialsList({ onUpdate }) {
    const { user, ownerId } = useAuth();
    const { toast } = useToast();
    const { getFeatureLimit } = useSubscription();
    const navigate = useNavigate();

    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Feature Limits
    const maxMaterials = getFeatureLimit ? getFeatureLimit('max_materials') : 5;
    const isLimited = maxMaterials !== Infinity;
    const currentCount = materials.length;
    const canAddMore = !isLimited || currentCount < maxMaterials;

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        quantity: '',
        unit: 'pcs',
        category: '', // Empty by default for custom input
        price: '',
        price_per_qty_amount: '1',
        min_stock: '10',
        purchase_link: ''
    });

    // Autocomplete State
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    const [isRestockOpen, setIsRestockOpen] = useState(false);
    const [restockItem, setRestockItem] = useState(null);
    const [restockData, setRestockData] = useState({
        addedQuantity: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (ownerId) {
            fetchMaterials();
        }
    }, [ownerId]);

    // Close suggestions when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const fetchMaterials = async () => {
        try {
            const { data, error } = await supabase
                .from('raw_materials')
                .select('*')
                .eq('user_id', ownerId)
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            setMaterials(data || []);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Gagal memuat data bahan baku", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Strict Limit Check for Free Accounts
        if (!editingItem && !canAddMore) {
            toast({
                title: "Limit Bahan Baku Tercapai",
                description: `Akun Free Trial dibatasi maksimal ${maxMaterials} bahan baku. Upgrade ke Premium untuk akses tanpa batas.`,
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            const payload = {
                user_id: ownerId,
                name: formData.name,
                quantity: parseFloat(formData.quantity),
                unit: formData.unit,
                category: formData.category || 'General',
                price: parseFloat(formData.price),
                price_per_qty_amount: parseFloat(formData.price_per_qty_amount) || 1,
                min_stock: parseFloat(formData.min_stock),
                purchase_link: formData.purchase_link,
                ...(editingItem ? {} : { initial_stock: parseFloat(formData.quantity) })
            };

            let error;
            if (editingItem) {
                const { error: updateError } = await supabase.from('raw_materials').update(payload).eq('id', editingItem.id);
                error = updateError;
                if (!error) {
                    // Log detailed update
                    const changes = [];
                    if (editingItem.quantity !== payload.quantity) {
                        changes.push({ field: 'Quantity', old: editingItem.quantity, new: payload.quantity, unit: payload.unit });
                    }
                    if (editingItem.price !== payload.price) {
                        changes.push({ field: 'Price', old: editingItem.price, new: payload.price, isCurrency: true });
                    }
                    if (editingItem.name !== payload.name) {
                        changes.push({ field: 'Name', old: editingItem.name, new: payload.name });
                    }

                    await logNotification(
                        ownerId,
                        "Bahan Updated",
                        `Updated ${payload.name}`,
                        "info",
                        {
                            type: 'material_update',
                            details: {
                                materialName: payload.name,
                                changes: changes
                            }
                        }
                    );
                    toast({ title: "Berhasil", description: `Data ${payload.name} berhasil diperbarui.` });
                }
            } else {
                const { error: insertError } = await supabase.from('raw_materials').insert(payload);
                error = insertError;
                if (!error) {
                    await logNotification(ownerId, "Bahan Added", `Added ${payload.name}`, "success");
                    toast({ title: "Berhasil", description: `Bahan ${payload.name} berhasil ditambahkan.` });
                }
            }

            if (error) throw error;

            setIsDialogOpen(false);
            resetForm();
            fetchMaterials();
            if (onUpdate) onUpdate();

        } catch (error) {
            toast({ title: "Gagal Menyimpan", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Yakin ingin menghapus bahan baku "${name}"?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('raw_materials')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            await logNotification(ownerId, "Bahan Dihapus", `Menghapus bahan baku: ${name}`, "warning");
            toast({ title: "Berhasil", description: `Bahan ${name} telah dihapus.` });
            fetchMaterials();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            toast({ title: "Gagal Menghapus", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleRestockSubmit = async (e) => {
        e.preventDefault();
        if (!restockItem) return;
        setLoading(true);

        try {
            const addedQty = parseFloat(restockData.addedQuantity);
            const oldQty = parseFloat(restockItem.quantity) || 0;
            const newTotalQty = oldQty + addedQty;
            const purchasePrice = parseFloat(restockData.purchasePrice);

            const { error } = await supabase
                .from('raw_materials')
                .update({
                    quantity: newTotalQty,
                    price: purchasePrice || restockItem.price,
                    updated_at: new Date().toISOString()
                })
                .eq('id', restockItem.id);

            if (error) throw error;

            await logNotification(
                ownerId,
                "Stok Ditambahkan",
                `Menambahkan ${addedQty} ${restockItem.unit} ke ${restockItem.name}`,
                "success",
                {
                    type: 'material_restock',
                    details: {
                        materialName: restockItem.name,
                        addedQty: addedQty,
                        price: purchasePrice || restockItem.price,
                        oldStock: oldQty,
                        newStock: newTotalQty,
                        unit: restockItem.unit
                    }
                }
            );
            toast({ title: "Stok Berhasil Ditambahkan", description: `Stok ${restockItem.name} bertambah menjadi ${newTotalQty} ${restockItem.unit}.` });

            setIsRestockOpen(false);
            setRestockItem(null);
            fetchMaterials();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast({ title: "Gagal Restock", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            quantity: '',
            unit: 'pcs',
            category: '',
            price: '',
            price_per_qty_amount: '1',
            min_stock: '10',
            purchase_link: ''
        });
        setEditingItem(null);
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category || '',
            price: item.price || '',
            price_per_qty_amount: item.price_per_qty_amount || '1',
            min_stock: item.min_stock || 10,
            purchase_link: item.purchase_link || ''
        });
        setIsDialogOpen(true);
    };

    const openRestock = (item) => {
        setRestockItem(item);
        setRestockData({
            addedQuantity: '',
            purchasePrice: item.price || '',
            purchaseDate: new Date().toISOString().split('T')[0]
        });
        setIsRestockOpen(true);
    };

    const filtered = materials.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
        return matchSearch && matchCategory;
    });

    const totalModalKeseluruhan = materials.reduce((acc, curr) => {
        const pricePerUnit = curr.price && curr.price_per_qty_amount ? curr.price / curr.price_per_qty_amount : (curr.price || 0);
        return acc + (pricePerUnit * (curr.quantity || 0));
    }, 0);

    const existingCategories = [...new Set(materials.map(m => m.category).filter(Boolean))].sort();

    const suggestions = existingCategories.filter(cat =>
        cat.toLowerCase().includes((formData.category || '').toLowerCase())
    );

    const groupedCategories = materials.reduce((acc, curr) => {
        const cat = curr.category || 'Lainnya';
        if (!acc[cat]) {
            acc[cat] = { count: 0, totalValue: 0 };
        }
        const pricePerUnit = curr.price && curr.price_per_qty_amount ? curr.price / curr.price_per_qty_amount : (curr.price || 0);
        acc[cat].totalValue += (pricePerUnit * (curr.quantity || 0));
        acc[cat].count += 1;
        return acc;
    }, {});

    const getCategoryStyles = (catName) => {
        const lower = (catName || '').toLowerCase();
        if (lower.includes('bibit')) return {
            icon: <Droplets className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform duration-300" />,
            bg: "bg-gradient-to-br from-purple-900/20 to-slate-900 border-purple-500/20 hover:border-purple-500/50",
            shadowHover: "hover:shadow-2xl hover:shadow-purple-500/20",
            blob: "bg-purple-600",
            iconWrapper: "bg-purple-500/10 border-purple-500/30",
            text: "text-purple-400",
            titleHover: "group-hover:text-purple-300"
        };
        if (lower.includes('pelarut') || lower.includes('alkohol')) return {
            icon: <FlaskConical className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform duration-300" />,
            bg: "bg-gradient-to-br from-blue-900/20 to-slate-900 border-blue-500/20 hover:border-blue-500/50",
            shadowHover: "hover:shadow-2xl hover:shadow-blue-500/20",
            blob: "bg-blue-600",
            iconWrapper: "bg-blue-500/10 border-blue-500/30",
            text: "text-blue-400",
            titleHover: "group-hover:text-blue-300"
        };
        if (lower.includes('botol')) return {
            icon: <Layers className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />,
            bg: "bg-gradient-to-br from-cyan-900/20 to-slate-900 border-cyan-500/20 hover:border-cyan-500/50",
            shadowHover: "hover:shadow-2xl hover:shadow-cyan-500/20",
            blob: "bg-cyan-600",
            iconWrapper: "bg-cyan-500/10 border-cyan-500/30",
            text: "text-cyan-400",
            titleHover: "group-hover:text-cyan-300"
        };
        if (lower.includes('box') || lower.includes('kardus')) return {
            icon: <Box className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform duration-300" />,
            bg: "bg-gradient-to-br from-amber-900/20 to-slate-900 border-amber-500/20 hover:border-amber-500/50",
            shadowHover: "hover:shadow-2xl hover:shadow-amber-500/20",
            blob: "bg-amber-600",
            iconWrapper: "bg-amber-500/10 border-amber-500/30",
            text: "text-amber-400",
            titleHover: "group-hover:text-amber-300"
        };
        return {
            icon: <Component className="w-8 h-8 text-slate-400 group-hover:scale-110 transition-transform duration-300" />,
            bg: "bg-gradient-to-br from-slate-800/50 to-slate-900 border-slate-700/50 hover:border-slate-500/50",
            shadowHover: "hover:shadow-2xl hover:shadow-slate-500/20",
            blob: "bg-slate-600",
            iconWrapper: "bg-slate-800 border-slate-600",
            text: "text-slate-300",
            titleHover: "group-hover:text-slate-200"
        };
    };

    return (
        <div className="space-y-6">
            {/* Stats Summary Card */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-xl p-6 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <DollarSign className="w-32 h-32 text-indigo-400" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8">
                    <div>
                        <p className="text-slate-400 text-sm font-medium mb-1">Total Modal Keseluruhan</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalModalKeseluruhan)}</h3>
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm font-medium mb-1">Total Item Bahan</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight">{materials.length} <span className="text-lg font-normal text-slate-500">Items</span></h3>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Data Bahan Baku</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-end md:items-center">

                    {isLimited && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                <span>Free Plan Limit:</span>
                                <span className={`${canAddMore ? 'text-emerald-400' : 'text-red-400 font-bold'}`}>{currentCount}/{maxMaterials}</span>
                            </div>
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${canAddMore ? 'bg-indigo-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min((currentCount / maxMaterials) * 100, 100)}%` }}
                                />
                            </div>
                            {!canAddMore && (
                                <div className="text-xs text-red-400 animate-pulse">
                                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                                    Full
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative w-full md:w-40">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            className="w-full bg-[#1e293b] border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {existingCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari bahan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1e293b] border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        if (open && !canAddMore && !editingItem) {
                            return;
                        }
                        setIsDialogOpen(open);
                    }}>
                        <DialogTrigger asChild>
                            {canAddMore ? (
                                <Button onClick={resetForm} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tambah Bahan
                                </Button>
                            ) : (
                                <Button onClick={() => navigate('/pricing')} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30">
                                    <Lock className="w-4 h-4 mr-2" />
                                    Upgrade to Add More
                                </Button>
                            )}
                        </DialogTrigger>
                        <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700 max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{editingItem ? 'Edit Bahan' : 'Tambah Bahan Baru'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSave} className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <Label>Nama Bahan</Label>
                                        <Input className="bg-slate-800 border-slate-600 focus-visible:ring-indigo-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>

                                    <div className="space-y-2 relative" ref={wrapperRef}>
                                        <Label>Kategori</Label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                className="bg-slate-800 border-slate-600 focus-visible:ring-indigo-500 pr-8"
                                                placeholder="Ketik atau pilih kategori..."
                                                value={formData.category}
                                                onChange={e => {
                                                    setFormData({ ...formData, category: e.target.value });
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                            />
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>

                                        {showSuggestions && (
                                            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                {suggestions.length > 0 ? (
                                                    suggestions.map((cat, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-between group"
                                                            onClick={() => {
                                                                setFormData({ ...formData, category: cat });
                                                                setShowSuggestions(false);
                                                            }}
                                                        >
                                                            {cat}
                                                            {formData.category === cat && <Check className="w-3 h-3 text-emerald-400 group-hover:text-white" />}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-2 text-xs text-slate-500 italic">
                                                        Kategori baru akan dibuat...
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Satuan</Label>
                                        <select className="w-full h-10 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                            <option value="pcs">pcs</option>
                                            <option value="ml">ml</option>
                                            <option value="liter">liter</option>
                                            <option value="gr">gr</option>
                                            <option value="kg">kg</option>
                                            <option value="pack">pack</option>
                                            <option value="roll">roll</option>
                                            <option value="meter">meter</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stok Saat Ini</Label>
                                        <Input type="number" step="0.01" className="bg-slate-800 border-slate-600 focus-visible:ring-indigo-500" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Min. Stok</Label>
                                        <Input type="number" step="0.01" className="bg-slate-800 border-slate-600 focus-visible:ring-indigo-500" value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })} />
                                    </div>

                                    <div className="space-y-2 col-span-2 border-t border-slate-700 pt-4 mt-2">
                                        <Label className="text-indigo-400 font-semibold mb-2 block">Informasi Pembelian</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Harga (Rp)</Label>
                                                <Input type="number" className="bg-slate-800 border-slate-600 focus-visible:ring-indigo-500" placeholder="Contoh: 750000" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Per Jumlah (Qty)</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" className="bg-slate-800 border-slate-600 focus-visible:ring-indigo-500" placeholder="Contoh: 1000" value={formData.price_per_qty_amount} onChange={e => setFormData({ ...formData, price_per_qty_amount: e.target.value })} />
                                                    <span className="text-sm text-slate-400 whitespace-nowrap">{formData.unit}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            *Contoh: Masukkan Harga 750000 per 1000 {formData.unit}, maka sistem akan mencatat harga dasar per unit.
                                        </p>
                                    </div>

                                    <div className="space-y-2 col-span-2">
                                        <Label>Link Pembelian (URL)</Label>
                                        <Input
                                            type="url"
                                            placeholder="https://tokopedia.com/..."
                                            className="bg-slate-800 border-slate-600 focus-visible:ring-indigo-500"
                                            value={formData.purchase_link}
                                            onChange={e => setFormData({ ...formData, purchase_link: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end gap-2">
                                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 w-full">{editingItem ? 'Simpan Perubahan' : 'Tambah Bahan'}</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Restock Dialog */}
            <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
                <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-emerald-400" />
                            Tambah Stok: <span className="text-emerald-400">{restockItem?.name}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleRestockSubmit} className="space-y-4 mt-2">
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>Jumlah Stok Dibeli ({restockItem?.unit})</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="bg-slate-800 border-slate-600 focus-visible:ring-emerald-500 font-bold text-lg"
                                    placeholder="0"
                                    value={restockData.addedQuantity}
                                    onChange={e => setRestockData({ ...restockData, addedQuantity: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Harga Beli (Rp)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                                    <Input
                                        type="number"
                                        className="bg-slate-800 border-slate-600 focus-visible:ring-emerald-500 pl-8"
                                        value={restockData.purchasePrice}
                                        onChange={e => setRestockData({ ...restockData, purchasePrice: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">*Harga ini akan mengupdate harga dasar bahan baku.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Tanggal Pembelian</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="date"
                                        className="bg-slate-800 border-slate-600 focus-visible:ring-emerald-500 pl-10"
                                        value={restockData.purchaseDate}
                                        onChange={e => setRestockData({ ...restockData, purchaseDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setIsRestockOpen(false)} className="hover:bg-slate-800 hover:text-white">Batal</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Simpan Stok</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {categoryFilter === 'all' && !searchTerm ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {Object.entries(groupedCategories).map(([catName, data]) => {
                        const style = getCategoryStyles(catName);

                        return (
                            <div
                                key={catName}
                                onClick={() => setCategoryFilter(catName)}
                                className={`cursor-pointer group relative overflow-hidden rounded-2xl border ${style.bg} ${style.shadowHover} p-6 transition-all duration-300 hover:scale-[102%]`}
                            >
                                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${style.blob} blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />

                                <div className="relative z-10 flex flex-col h-full gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className={`p-3 rounded-xl border ${style.iconWrapper} transition-colors duration-300`}>
                                            {style.icon}
                                        </div>
                                        <span className="text-xs font-semibold text-slate-300 px-2.5 py-1 bg-slate-950/50 rounded-full border border-slate-800">
                                            {data.count} items
                                        </span>
                                    </div>

                                    <div className="mt-4">
                                        <h3 className={`text-xl font-bold text-white mb-2 ${style.titleHover} transition-colors`}>{catName}</h3>
                                        <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-slate-700/50">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Nilai Asset</span>
                                            <span className={`text-lg font-bold ${style.text}`}>{formatCurrency(data.totalValue)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#1e293b] p-4 rounded-xl border border-slate-700/50 shadow-sm gap-4">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => { setCategoryFilter('all'); setSearchTerm(''); }} className="text-slate-400 hover:text-white hover:bg-slate-800">
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Kembali ke Kategori
                            </Button>
                            <div className="hidden sm:block h-4 w-[1px] bg-slate-700" />
                            {categoryFilter !== 'all' && <span className="text-indigo-400 font-bold uppercase tracking-wider">{categoryFilter}</span>}
                            {searchTerm && <span className="text-sm text-slate-400">Pencarian: "{searchTerm}"</span>}
                        </div>
                        <span className="text-sm font-medium text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">{filtered.length} items ditemukan</span>
                    </div>

                    <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-[#0f172a] border-b border-slate-700 text-slate-400">
                                        <th className="px-6 py-4 font-medium">Nama Bahan</th>
                                        <th className="px-6 py-4 font-medium">Kategori</th>
                                        <th className="px-6 py-4 font-medium">Stok</th>
                                        <th className="px-6 py-4 font-medium">Satuan</th>
                                        <th className="px-6 py-4 font-medium">Harga / Unit</th>
                                        <th className="px-6 py-4 font-medium text-right">Total Nilai</th>
                                        <th className="px-6 py-4 font-medium">Link Pembelian</th>
                                        <th className="px-6 py-4 font-medium text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filtered.map(item => {
                                        const pricePerUnit = item.price && item.price_per_qty_amount ? item.price / item.price_per_qty_amount : (item.price || 0);
                                        const displayPrice = item.price ? formatCurrency(item.price) : '-';
                                        const displayQty = item.price_per_qty_amount && item.price_per_qty_amount > 1 ? ` per ${item.price_per_qty_amount} ${item.unit}` : ` / ${item.unit}`;
                                        const totalVal = pricePerUnit * (item.quantity || 0);

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    {item.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                        {item.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-white">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">{item.unit}</td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {displayPrice}
                                                    <span className="text-xs text-slate-500 block">{displayQty}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-emerald-400">
                                                    {item.price ? formatCurrency(totalVal) : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.purchase_link ? (
                                                        <a
                                                            href={item.purchase_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline text-xs"
                                                        >
                                                            Buka Link <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openRestock(item)}
                                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all shadow-sm hover:shadow-emerald-500/20"
                                                            title="Tambah Stok (Belanja)"
                                                        >
                                                            <ShoppingCart className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openEdit(item)}
                                                            className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all"
                                                            title="Edit Detail"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id, item.name)}
                                                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                                                            title="Hapus Bahan"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Package className="w-10 h-10 opacity-20" />
                                                    <p>Data bahan baku kosong atau tidak ditemukan</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MaterialsList;