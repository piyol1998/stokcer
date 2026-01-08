import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { FlaskConical, ArrowRight, CheckCircle2, RefreshCw, Beaker, FileSpreadsheet, Calculator, Coins, HelpCircle, Layers, Droplets, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { logNotification } from '@/lib/notificationUtils';
import { getColorForString } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function NewProduction({ onUpdate }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [recipes, setRecipes] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState('');

    // Production Inputs
    const [quantity, setQuantity] = useState(''); // Total Quantity in ml/unit
    const [bottleSize, setBottleSize] = useState('30'); // Default bottle size 30ml

    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const [r, m] = await Promise.all([
                supabase.from('recipes').select('*, recipe_ingredients!recipe_id(*)'),
                supabase.from('raw_materials').select('*')
            ]);

            if (r.error) throw r.error;
            if (m.error) throw m.error;

            if (r.data) setRecipes(r.data);
            if (m.data) setMaterials(m.data);
        } catch (error) {
            console.error("Error fetching production data:", error);
            toast({
                title: "Gagal Memuat Data",
                description: "Tidak dapat mengambil data resep. " + error.message,
                variant: "destructive"
            });
        } finally {
            setDataLoading(false);
        }
    };

    const getRecipeDetails = () => {
        const r = recipes.find(x => x.id === selectedRecipe);
        if (!r) return null;

        const baseOutput = r.output_quantity || 100;
        const totalBatch = quantity ? parseFloat(quantity) : 0;
        const ratio = totalBatch / baseOutput;

        // 1. Map Ingredients to simplified objects
        const ingredients = r.recipe_ingredients.map(ing => {
            const mat = materials.find(m => m.id === ing.material_id);
            const reqQty = ratio * ing.quantity;

            if (!mat && ing.ingredient_recipe_id) {
                const subRecipe = recipes.find(sr => sr.id === ing.ingredient_recipe_id);
                return {
                    name: subRecipe?.name || 'Sub-Recipe',
                    unit: 'unit',
                    reqQty: reqQty,
                    stock: 999999,
                    isEnough: true,
                    category: 'Sub-Recipe',
                    isRecipe: true,
                    isDeleted: false,
                    cost: 0
                };
            }

            const isDeleted = !!mat?.deleted_at;

            // Price Calculation
            const pricePerUnitBase = (mat?.price_per_qty_amount && mat.price_per_qty_amount > 0)
                ? (mat.price / mat.price_per_qty_amount)
                : (mat?.price || 0);

            let category = mat?.category || 'General';
            if (r.method === 'wizard' && r.metadata) {
                const meta = r.metadata;
                if (meta.fixativeId === mat?.id) category = 'Fixative';
                else if (meta.alcoholId === mat?.id) category = 'Pelarut';
                else if (meta.bibitMaterials?.some(b => b.id === mat?.id)) category = 'Bibit';
            } else {
                const lowerName = (mat?.name || '').toLowerCase();
                if (category === 'General' || !category) {
                    if (lowerName.includes('alkohol') || lowerName.includes('absolute') || lowerName.includes('solvent')) category = 'Pelarut';
                    else if (lowerName.includes('fixative')) category = 'Fixative';
                    else category = 'Bibit';
                }
            }

            return {
                name: mat?.name || 'Unknown Material',
                unit: mat?.unit,
                reqQty: reqQty,
                stock: mat?.quantity || 0,
                isEnough: (mat?.quantity || 0) >= reqQty && !isDeleted,
                category: category,
                isDeleted: isDeleted,
                cost: reqQty * pricePerUnitBase
            };
        });

        const totalVolume = ingredients.reduce((sum, item) => sum + item.reqQty, 0);
        const enrichedIngredients = ingredients.map(item => ({
            ...item,
            percentage: totalVolume > 0 ? (item.reqQty / totalVolume) * 100 : 0
        }));

        const grouped = enrichedIngredients.reduce((acc, item) => {
            const cat = item.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});

        const preferredOrder = ['Bibit', 'Fixative', 'Pelarut', 'Sub-Recipe'];
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            const idxA = preferredOrder.indexOf(a);
            const idxB = preferredOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        const groups = sortedKeys.map(key => {
            const items = grouped[key];
            const categoryTotalQty = items.reduce((sum, i) => sum + i.reqQty, 0);
            const categoryTotalPercentage = items.reduce((sum, i) => sum + i.percentage, 0);

            const itemsWithInnerPercentage = items.map(item => ({
                ...item,
                innerPercentage: categoryTotalQty > 0 ? (item.reqQty / categoryTotalQty) * 100 : 0
            }));

            return {
                category: key,
                items: itemsWithInnerPercentage,
                totalPercentage: categoryTotalPercentage,
                itemCount: items.length
            };
        });

        return {
            rawIngredients: enrichedIngredients,
            groupedIngredients: groups,
            totalCost: enrichedIngredients.reduce((sum, i) => sum + i.cost, 0),
            isEnoughTotal: enrichedIngredients.every(i => i.isEnough)
        };
    };

    const calculationData = getRecipeDetails();
    const currentRecipe = recipes.find(r => r.id === selectedRecipe);
    const isWizard = currentRecipe?.method === 'wizard';

    // Output Calculation
    const totalBottles = (quantity && bottleSize) ? Math.floor(parseFloat(quantity) / parseFloat(bottleSize)) : 0;
    const costPerBottle = totalBottles > 0 && calculationData ? calculationData.totalCost / totalBottles : 0;

    const handleProduce = async () => {
        if (!calculationData?.isEnoughTotal || !selectedRecipe) return;
        setLoading(true);

        try {
            const r = recipes.find(x => x.id === selectedRecipe);
            const baseOutput = r.output_quantity || 100;
            const ratio = parseFloat(quantity) / baseOutput;

            const ingredientsPayload = r.recipe_ingredients.map(ing => {
                const mat = materials.find(m => m.id === ing.material_id);
                return {
                    materialId: ing.material_id,
                    quantity: ratio * ing.quantity,
                    materialName: mat?.name,
                    unit: mat?.unit
                }
            });

            const { error } = await supabase.rpc('produce_item', {
                p_recipe_id: selectedRecipe,
                p_batch_quantity: ratio,
                p_user_id: user.id,
                p_ingredients_json: ingredientsPayload,
                p_metadata: {}
            });

            if (error) throw error;

            // Fetch the actual created batch ID
            const { data: latestBatch } = await supabase
                .from('production_history')
                .select('id')
                .eq('user_id', user.id)
                .eq('recipe_id', selectedRecipe)
                .order('date', { ascending: false })
                .limit(1)
                .single();

            let batchRef = `BATCH-${Date.now().toString().slice(-6)}`;
            if (latestBatch && latestBatch.id) {
                batchRef = `BATCH-${latestBatch.id.substring(0, 8).toUpperCase()}`;
            }

            const userName = user.user_metadata?.full_name || user.email || 'Unknown User';

            await logNotification(
                user.id,
                "Produksi Berhasil",
                `Produced ${quantity} units of ${r.name}`,
                "success",
                {
                    type: 'production',
                    details: {
                        recipeName: r.name,
                        batchId: batchRef,
                        quantity: parseFloat(quantity),
                        unit: 'ml',
                        totalCost: calculationData.totalCost,
                        userName: userName
                    }
                }
            );

            toast({ title: "Produksi Berhasil", description: `Batch produksi ${r.name} selesai.` });
            setQuantity('');
            setSelectedRecipe('');
            fetchData(); // refresh stocks
            if (onUpdate) onUpdate();

        } catch (err) {
            console.error(err);
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <FlaskConical className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Produksi Baru</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchData} className="text-slate-400 hover:text-white">
                    <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Input Form */}
                <div className="bg-[#1e293b] p-8 rounded-xl border border-slate-700/50 shadow-xl h-fit">
                    <h3 className="text-lg font-semibold text-white mb-6">Input Produksi</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Pilih Resep Parfum</Label>
                            <select
                                className="w-full h-11 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedRecipe}
                                onChange={e => setSelectedRecipe(e.target.value)}
                                disabled={dataLoading}
                            >
                                <option value="">{dataLoading ? 'Memuat resep...' : '-- Pilih Resep --'}</option>
                                {recipes.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>

                            {currentRecipe && (
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className={`p-2 rounded text-xs flex items-center gap-2 border ${isWizard ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                                        {isWizard ? <Beaker className="w-3 h-3" /> : <FileSpreadsheet className="w-3 h-3" />}
                                        <span className="font-semibold">Terdeteksi: {isWizard ? 'Resep A (Formula)' : 'Resep B (Manual)'}</span>
                                    </div>
                                    <div className={`p-2 rounded text-xs flex items-center gap-2 border ${getColorForString(currentRecipe.name)}`}>
                                        <span className="font-bold tracking-wide uppercase">{currentRecipe.name}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Total Batch (ml)</Label>
                                <Input
                                    type="number"
                                    className="bg-slate-800 border-slate-600 h-11 text-white"
                                    placeholder="Contoh: 1000"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    disabled={!selectedRecipe}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Ukuran Botol (ml)</Label>
                                <Input
                                    type="number"
                                    className="bg-slate-800 border-slate-600 h-11 text-white"
                                    placeholder="Contoh: 30"
                                    value={bottleSize}
                                    onChange={e => setBottleSize(e.target.value)}
                                    disabled={!selectedRecipe}
                                />
                            </div>
                        </div>

                        {/* Calculator Result Box */}
                        {quantity && bottleSize && calculationData && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 flex flex-col justify-between">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calculator className="w-4 h-4 text-indigo-400" />
                                        <span className="text-xs text-indigo-300 font-medium uppercase tracking-wider">Hasil (Pcs)</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white">
                                        {totalBottles} <span className="text-sm font-normal text-slate-400">pcs</span>
                                    </div>
                                </div>
                                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 flex flex-col justify-between">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Coins className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs text-emerald-300 font-medium uppercase tracking-wider">Total Modal</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-xl font-bold text-white">
                                            Rp {calculationData.totalCost.toLocaleString('id-ID')}
                                        </div>
                                        <div className="text-[10px] text-emerald-300 mt-1 flex items-center gap-1">
                                            <span>@ Rp {costPerBottle.toLocaleString('id-ID', { maximumFractionDigits: 0 })} / botol</span>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <HelpCircle className="w-3 h-3 text-emerald-400 opacity-50 hover:opacity-100" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-slate-900 border-slate-700 text-slate-200">
                                                        <p>Modal bahan baku per botol {bottleSize}ml</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={handleProduce}
                            disabled={!selectedRecipe || !quantity || !calculationData?.isEnoughTotal || loading}
                            className={`w-full h-12 text-base font-medium transition-all ${calculationData?.isEnoughTotal ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >
                            {loading ? 'Memproses...' : (
                                <span className="flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    {calculationData?.isEnoughTotal ? 'Konfirmasi Produksi' : 'Stok Tidak Cukup'}
                                </span>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Right: Detailed Calculation */}
                <div className="bg-[#1e293b] p-8 rounded-xl border border-slate-700/50 shadow-xl overflow-hidden flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        Kalkulasi & Komposisi
                    </h3>

                    {!selectedRecipe ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 py-12 border-2 border-dashed border-slate-700 rounded-lg">
                            <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p>Pilih resep dan masukkan jumlah untuk melihat breakdown.</p>
                        </div>
                    ) : calculationData && (
                        <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar flex-1">

                            {/* Top Section: Main Category Percentages */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {calculationData.groupedIngredients.map((group) => {
                                    const getIcon = (cat) => {
                                        switch (cat) {
                                            case 'Bibit': return <Droplets className="w-5 h-5 text-purple-400" />;
                                            case 'Fixative': return <Layers className="w-5 h-5 text-amber-400" />;
                                            case 'Pelarut': return <FlaskConical className="w-5 h-5 text-blue-400" />;
                                            default: return <Box className="w-5 h-5 text-slate-400" />;
                                        }
                                    }
                                    const getColor = (cat) => {
                                        switch (cat) {
                                            case 'Bibit': return 'text-purple-400 border-purple-500/20 bg-purple-500/10';
                                            case 'Fixative': return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
                                            case 'Pelarut': return 'text-blue-400 border-blue-500/20 bg-blue-500/10';
                                            default: return 'text-slate-400 border-slate-500/20 bg-slate-500/10';
                                        }
                                    }

                                    return (
                                        <div key={group.category} className={`flex flex-col items-center justify-center p-4 rounded-xl border ${getColor(group.category)} transition-all`}>
                                            <div className="mb-2 p-2 bg-slate-950/30 rounded-full">
                                                {getIcon(group.category)}
                                            </div>
                                            <span className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">{group.category}</span>
                                            <span className="text-2xl font-bold">{Math.round(group.totalPercentage)}%</span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Detailed Breakdown Sections */}
                            <div className="space-y-6">
                                {calculationData.groupedIngredients.map((group) => (
                                    <div key={group.category} className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                                            <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                                                Komposisi {group.category} <span className="text-xs text-slate-500 normal-case ml-1">({group.items.length} materials)</span>
                                            </h4>
                                        </div>
                                        <div className="space-y-2">
                                            {group.items.map((item, idx) => (
                                                <div key={idx} className="bg-slate-800/40 rounded-lg p-3 flex justify-between items-center hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.isEnough ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
                                                            <p className={`text-sm font-medium truncate ${item.isDeleted ? 'line-through text-red-400' : 'text-slate-200'}`}>
                                                                {item.name}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                                            <span>Req: <span className="text-slate-400">{item.reqQty.toFixed(1)} {item.unit}</span></span>
                                                            {!item.isEnough && (
                                                                <span className="text-red-400 bg-red-500/10 px-1.5 rounded">Kurang: {(item.reqQty - item.stock).toFixed(1)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-lg font-bold text-white">{Math.round(item.innerPercentage)}%</span>
                                                        <span className="text-[10px] text-slate-500">of category</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Summary */}
                            <div className="mt-8 pt-4 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500">
                                <div className="flex gap-4">
                                    <span>Total Volume: <strong className="text-slate-300">{calculationData.rawIngredients.reduce((s, i) => s + i.reqQty, 0).toFixed(0)} {calculationData.rawIngredients[0]?.unit}</strong></span>
                                </div>
                                <div className="text-right">
                                    <span>Calculated for <strong className="text-slate-300">{totalBottles} bottles</strong></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default NewProduction;