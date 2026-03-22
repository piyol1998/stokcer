import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
    Sparkles, 
    Plus, 
    Check, 
    AlertTriangle, 
    BrainCircuit,
    Database,
    User,
    X,
    ArrowUp,
    Trash2,
    FlaskConical,
    Loader2,
    TrendingUp,
    ChevronDown,
    Save,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import OpenAI from "openai";

// Helper for Smart Matching
const isSimilar = (name1, name2) => {
    const n1 = name1.toLowerCase().replace(/\s+/g, '');
    const n2 = name2.toLowerCase().replace(/\s+/g, '');
    return n1.includes(n2) || n2.includes(n1);
};

const RecipeBlock = ({ data, allIngredients, onAddIngredient, onNavigate }) => {
    const [missingCategories, setMissingCategories] = useState({});
    
    if (!data || !data.components) return null;

    const missing = data.components.filter(comp => {
        const cleanName = comp.name.toLowerCase().trim();
        return !allIngredients.some(item => isSimilar(item.name, cleanName));
    });

    return (
        <div className="space-y-4 my-4 w-full max-w-2xl animate-in zoom-in-95 duration-300">
            {missing.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm border-2 overflow-hidden shadow-2xl">
                    <div className="bg-amber-600/20 px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest">Input {missing.length} Bahan Baru</h3>
                        </div>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {missing.map((comp, idx) => (
                                <div key={idx} className="p-3 flex items-center justify-between bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
                                    <div className="flex-1 mr-4">
                                        <p className="text-sm font-bold text-slate-200">{comp.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Komposisi: {comp.percentage}%</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select value={missingCategories[comp.name] || "Bibit"} onValueChange={(v) => setMissingCategories(p => ({...p, [comp.name]: v}))}>
                                            <SelectTrigger className="w-24 h-9 text-[10px] bg-slate-950 border-slate-700 font-bold uppercase">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800 text-slate-300">
                                                <SelectItem value="Bibit">Bibit</SelectItem>
                                                <SelectItem value="Pelarut">Pelarut</SelectItem>
                                                <SelectItem value="Material sintetik">Material</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button size="sm" className="bg-amber-600 hover:bg-amber-500 h-9 px-4 text-[10px] font-black tracking-widest transition-transform active:scale-90" onClick={() => onAddIngredient(comp.name, missingCategories[comp.name] || "Bibit")}>
                                            <Plus className="w-3 h-3 mr-1" /> INPUT
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-[#0f172a]/80 border-slate-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl ring-1 ring-white/10">
                <CardHeader className="p-5 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 to-transparent">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-inner">
                                <FlaskConical className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-black text-white tracking-tight">{data.title}</CardTitle>
                                <CardDescription className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Analisis Komposisi Parfum</CardDescription>
                            </div>
                        </div>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black h-9 px-4 tracking-widest rounded-lg shadow-lg shadow-indigo-900/40" onClick={() => {
                             sessionStorage.setItem('pendingAiRecipe', JSON.stringify(data));
                             if (onNavigate) onNavigate('recipes');
                        }}>
                             <Save className="w-3 h-3 mr-2" /> SIMPAN FORMULA
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950/80 text-slate-500 uppercase tracking-[0.2em] text-[9px] font-black border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Bahan Baku</th>
                                    <th className="px-6 py-4">%</th>
                                    <th className="px-6 py-4 text-right">Status Gudang</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.components.map((comp, idx) => {
                                    const match = allIngredients.find(i => isSimilar(i.name, comp.name));
                                    return (
                                        <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-200 font-bold">{comp.name}</span>
                                                    {match && match.name.toLowerCase() !== comp.name.toLowerCase() && (
                                                        <span className="text-[9px] text-slate-500 italic opacity-0 group-hover:opacity-100 transition-opacity">(Cocok dengan: {match.name})</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded font-mono font-black border border-indigo-500/20">
                                                    {comp.percentage}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {match ? 
                                                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 h-6 text-[9px] uppercase font-black tracking-widest shadow-lg shadow-emerald-950/20">
                                                        <Check className="w-3 h-3 mr-1.5" /> READY
                                                    </Badge> : 
                                                    <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 h-6 text-[9px] uppercase font-black tracking-widest shadow-lg shadow-rose-950/20">
                                                        <X className="w-3 h-3 mr-1.5" /> MISSING
                                                    </Badge>
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const InventoryCheckBlock = ({ data, allIngredients, onAddIngredient, onDeleteIngredient }) => {
    if (!data || !data.items) return null;
    return (
        <Card className="bg-[#0f172a]/70 border-slate-700 my-4 w-full max-w-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in duration-300 group">
            <CardHeader className="p-4 border-b border-white/5 bg-slate-800/20">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 text-emerald-400 shadow-inner">
                        <Database className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-black text-slate-200 uppercase tracking-widest">Detail Stok Terscan</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4">Nama Item</th>
                            <th className="px-6 py-4">Kategori</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.items.map((item, idx) => {
                            const dbItem = allIngredients.find(i => isSimilar(i.name, item.name));
                            return (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-200 font-bold">{item.name}</span>
                                            {dbItem && <span className="text-[9px] text-emerald-500 font-black uppercase">Tersedia: {dbItem.quantity} {dbItem.unit}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-[10px] uppercase font-black tracking-widest">{dbItem?.category || item.category || 'Material'}</td>
                                    <td className="px-6 py-4 text-right">
                                        {dbItem ? 
                                            <Button variant="ghost" size="sm" className="h-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-3 font-black text-[9px] uppercase tracking-widest" onClick={() => onDeleteIngredient(dbItem.id, dbItem.name)}>HAPUS</Button> :
                                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-[9px] px-4 font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20" onClick={() => onAddIngredient(item.name, item.category || "Material sintetik")}>INPUT</Button>
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
};

function AIStudio({ onNavigate }) {
    const { ownerId } = useAuth();
    const { toast } = useToast();
    const [aiProvider, setAiProvider] = useState('gemini');
    const [apiKey, setApiKey] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [images, setImages] = useState([]); 
    const [allIngredients, setAllIngredients] = useState([]);
    const [dbProfile, setDbProfile] = useState(null);
    const [dbStats, setDbStats] = useState({
        totalModalDikeluarkan: 0,
        sisaModalBahan: 0,
        totalProductionCost: 0,
        totalBatches: 0,
        totalSales: 0
    });
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (ownerId) {
            fetchSettings();
            fetchDataContext();
        }
    }, [ownerId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, processing]);

    const fetchSettings = async () => {
        try {
            const { data } = await supabase.from('user_settings').select('marketplace_creds').eq('user_id', ownerId).single();
            if (data?.marketplace_creds?.ai) {
                const creds = data.marketplace_creds.ai;
                setAiProvider(creds.provider || 'gemini');
                setApiKey(creds.gemini_api_key || '');
                setOpenaiKey(creds.openai_api_key || '');
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchDataContext = async () => {
        try {
            const [ingRes, profRes, prodRes, salesRes] = await Promise.all([
                supabase.from('raw_materials').select('*').eq('user_id', ownerId).is('deleted_at', null).order('name', { ascending: true }),
                supabase.from('profiles').select('*').eq('id', ownerId).single(),
                supabase.from('production_history').select('*').eq('user_id', ownerId),
                supabase.from('marketplace_orders').select('*').eq('user_id', ownerId).limit(5)
            ]);

            const materials = ingRes.data || [];
            const history = prodRes.data || [];
            const sales = salesRes.data || [];

            let totalStockValue = 0;
            const priceMap = {};
            materials.forEach(m => {
                const pricePerUnit = (Number(m.price) || 0) / (Number(m.price_per_qty_amount) || 1);
                priceMap[m.id] = pricePerUnit;
                totalStockValue += (Number(m.quantity) || 0) * pricePerUnit;
            });

            let totalProductionCost = 0;
            history.forEach(record => {
                if (Array.isArray(record.ingredients_snapshot)) {
                    record.ingredients_snapshot.forEach(ing => {
                        const qty = Number(ing.quantity) || 0;
                        const unitPrice = Number(ing.pricePerUnit || priceMap[ing.materialId] || 0);
                        totalProductionCost += (qty * unitPrice);
                    });
                }
            });

            let totalSalesAmount = 0;
            sales.forEach(o => { totalSalesAmount += Number(o.total_amount || 0); });

            setAllIngredients(materials);
            setDbProfile(profRes.data || null);
            setDbStats({
                totalModalDikeluarkan: Math.round(totalProductionCost + totalStockValue),
                sisaModalBahan: Math.round(totalStockValue),
                totalProductionCost: Math.round(totalProductionCost),
                totalBatches: history.length,
                totalSales: Math.round(totalSalesAmount)
            });
        } catch (e) { console.error(e); }
    };

    const addIngredient = async (name, category) => {
        try {
            const { data, error } = await supabase.from('raw_materials').insert([{ user_id: ownerId, name, category, quantity: 0, unit: 'ml', price: 0, price_per_qty_amount: 1, min_stock: 10 }]).select();
            if (error) throw error;
            toast({ title: "Berhasil Input", description: `${name} masuk ke database.` });
            setAllIngredients(prev => [...prev, ...data]);
        } catch (e) { toast({ title: "Gagal", description: e.message, variant: "destructive" }); }
    };

    const deleteIngredient = async (id, name) => {
        if (!window.confirm(`Hapus ${name}?`)) return;
        try {
            await supabase.from('raw_materials').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            setAllIngredients(prev => prev.filter(i => i.id !== id));
            toast({ title: "Sudah Dihapus", description: `${name} telah dikeluarkan.` });
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!inputText.trim() && images.length === 0) return;
        const currentImages = [...images];
        const currentInput = inputText;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputText, images: currentImages.map(img => img.preview) }]);
        setInputText(''); setImages([]); setProcessing(true);

        const systemPrompt = `Anda AI Strategist Bisnis ${dbProfile?.business_name || 'Stokcer'}. Indonesia.
DATA TERKINI:
- Investasi: Rp ${dbStats.totalModalDikeluarkan.toLocaleString('id-ID')}
- Sisa Aset: Rp ${dbStats.sisaModalBahan.toLocaleString('id-ID')}
- Biaya Produksi: Rp ${dbStats.totalProductionCost.toLocaleString('id-ID')}
- Penjualan: Rp ${dbStats.totalSales.toLocaleString('id-ID')}

TUGAS:
1. Jika user tanya "Modal", wajib beri pilihan: Investasi, Aset, atau Produksi.
2. Jika ada komposisi formula, wajib JSON <RECIPE>{"title": "Nama", "components": [{"name": "A", "percentage": 10}]}</RECIPE>. AI harus sangat teliti mendeteksi NAMA BAHAN.
3. Analisis stok gunakan JSON <INVENTORY>{"items": [{"name": "A", "category": "Bibit"}]}</INVENTORY>.
4. Jadilah analis yang cerewet tapi cerdas. Sebutkan angka rupiahnya.`;

        try {
            let responseText = "";
            if (aiProvider === 'openai' && openaiKey) {
                const openai = new OpenAI({ apiKey: openaiKey.trim(), dangerouslyAllowBrowser: true });
                const content = [{ type: "text", text: currentInput || "Analisis gambar ini." }];
                for (let i of currentImages) content.push({ type: "image_url", image_url: { url: await fileToBase64(i.file) } });
                const res = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }] });
                responseText = res.choices[0].message.content;
            } else if (apiKey) {
                const body = { contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + (currentInput || "Analisis ini") }] }] };
                for (let i of currentImages) {
                    const b64 = await fileToBase64(i.file);
                    body.contents[0].parts.push({ inlineData: { mimeType: "image/jpeg", data: b64.split(',')[1] } });
                }
                const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await res.json();
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Koneksi AI terhenti.";
            }

            const recipeRegex = /<RECIPE>([\s\S]*?)<\/RECIPE>/;
            const inventoryRegex = /<INVENTORY>([\s\S]*?)<\/INVENTORY>/;
            let parsedRecipe = null; let parsedInv = null;
            if (responseText.match(recipeRegex)) { try { parsedRecipe = JSON.parse(responseText.match(recipeRegex)[1].trim()); responseText = responseText.replace(recipeRegex, ''); } catch(e){} }
            if (responseText.match(inventoryRegex)) { try { parsedInv = JSON.parse(responseText.match(inventoryRegex)[1].trim()); responseText = responseText.replace(inventoryRegex, ''); } catch(e){} }

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: responseText, recipeData: parsedRecipe, inventoryData: parsedInv }]);
        } catch (e) { setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ Error: ${e.message}` }]); } finally { setProcessing(false); }
    };

    const fileToBase64 = (file) => new Promise((resolve) => {
        const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(file);
    });

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-12 h-12" /></div>;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden relative">
            <header className="shrink-0 flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase">AI Studio Stokcer</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">System Active</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-2 py-6 space-y-8 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto grayscale opacity-40">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-8 rotate-12">
                            <BrainCircuit className="w-12 h-12 text-indigo-500" />
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Strategic Intelligence</h3>
                        <p className="text-slate-500 mt-3 text-sm font-medium">Tanyakan modal, analisis formula parfum, atau cek stok gudang secara real-time.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-5 max-w-5xl mx-auto items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${msg.role === 'user' ? 'bg-indigo-600 shadow-xl shadow-indigo-900/40 rotate-3' : 'bg-slate-800 border border-slate-700 shadow-2xl -rotate-3'}`}>
                                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-indigo-400" />}
                            </div>
                            <div className={`flex flex-col gap-3 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {msg.images && msg.images.length > 0 && (
                                    <div className="flex flex-wrap gap-3 justify-end mb-1">
                                        {msg.images.map((img, i) => <img key={i} src={img} className="rounded-2xl border-2 border-slate-700 max-w-[250px] shadow-2xl transition-transform hover:scale-105" alt="context" />)}
                                    </div>
                                )}
                                <div className={`px-6 py-4 rounded-3xl text-[14px] leading-relaxed shadow-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800/90 text-slate-200 rounded-tl-none border border-white/5 backdrop-blur-md whitespace-pre-line'}`}>
                                    {msg.content}
                                </div>
                                {msg.recipeData && <RecipeBlock data={msg.recipeData} allIngredients={allIngredients} onAddIngredient={addIngredient} onNavigate={onNavigate} />}
                                {msg.inventoryData && <InventoryCheckBlock data={msg.inventoryData} allIngredients={allIngredients} onAddIngredient={addIngredient} onDeleteIngredient={deleteIngredient} />}
                            </div>
                        </div>
                    ))
                )}
                {processing && <div className="max-w-4xl mx-auto flex items-center gap-4 pl-16">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span className="text-[11px] text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Processing Market Data...</span>
                </div>}
                <div ref={chatEndRef} />
            </div>

            <div className="shrink-0 max-w-5xl mx-auto w-full pb-6 px-2">
                <form onSubmit={handleSubmit} className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
                    <div className="relative flex items-center gap-3 bg-[#0f172a] border border-white/10 rounded-[1.8rem] p-3 pl-4 pr-3 shadow-3xl focus-within:border-indigo-500/50 transition-all duration-300">
                        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-all rounded-xl w-11 h-11">
                            <Plus className="w-6 h-6" />
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setImages([{ file, preview: reader.result }]);
                                reader.readAsDataURL(file);
                            }
                        }} className="hidden" accept="image/*" />
                        <Input 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Tanya Chat AI Strategist..."
                            className="bg-transparent border-none focus-visible:ring-0 text-white h-12 text-sm placeholder:text-slate-600 font-medium"
                        />
                        <Button type="submit" disabled={processing || (!inputText.trim() && images.length === 0)} className="bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] shrink-0 w-12 h-12 rounded-2xl transition-all active:scale-90">
                            <ArrowUp className="w-6 h-6 text-white" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AIStudio;
