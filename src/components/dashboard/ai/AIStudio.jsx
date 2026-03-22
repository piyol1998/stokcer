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
    TrendingUp
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

const RecipeBlock = ({ data, allIngredients, onAddIngredient, onNavigate }) => {
    const [missingCategories, setMissingCategories] = useState({});
    
    // Safety check for data structure
    if (!data || !data.components) return null;

    const detectedIngredients = data.components.map(c => c.name);
    const missing = detectedIngredients.filter(name => {
        const cleanName = name.toLowerCase().trim();
        return !allIngredients.some(item => item.name.toLowerCase().trim() === cleanName);
    });

    return (
        <div className="space-y-4 my-4 w-full max-w-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            {missing.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm border-2 overflow-hidden shadow-lg shadow-amber-900/10">
                    <div className="bg-amber-500/10 px-4 py-2 border-b border-amber-500/20 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Perlu Tambahan {missing.length} Bahan Baru</span>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y divide-amber-500/10">
                            {missing.map((name, idx) => (
                                <div key={idx} className="p-3 flex items-center justify-between bg-slate-900/40">
                                    <span className="text-sm font-medium text-slate-200">{name}</span>
                                    <div className="flex items-center gap-2">
                                        <Select value={missingCategories[name] || "Bibit"} onValueChange={(v) => setMissingCategories(p => ({...p, [name]: v}))}>
                                            <SelectTrigger className="w-24 h-8 text-[10px] bg-slate-950 border-slate-800">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800 text-slate-300">
                                                <SelectItem value="Bibit">Bibit</SelectItem>
                                                <SelectItem value="Pelarut">Pelarut</SelectItem>
                                                <SelectItem value="Material sintetik">Material</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button size="sm" className="bg-amber-600 hover:bg-amber-500 h-8 text-xs font-bold" onClick={() => onAddIngredient(name, missingCategories[name] || "Bibit")}>
                                            <Plus className="w-3 h-3 mr-1" /> INPUT
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-slate-900/50 border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
                <CardHeader className="p-4 border-b border-slate-800 bg-slate-800/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                <FlaskConical className="w-4 h-4 text-indigo-400" />
                            </div>
                            <CardTitle className="text-sm font-bold text-slate-200">{data.title}</CardTitle>
                        </div>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold h-8" onClick={() => {
                             sessionStorage.setItem('pendingAiRecipe', JSON.stringify(data));
                             if (onNavigate) onNavigate('recipes');
                        }}>
                             <Check className="w-3 h-3 mr-1" /> SIMPAN FORMULA
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950/50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-800">
                                <tr>
                                    <th className="px-5 py-3">Bahan Baku</th>
                                    <th className="px-5 py-3">%</th>
                                    <th className="px-5 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {data.components.map((comp, idx) => {
                                    const match = allIngredients.find(i => i.name.toLowerCase().trim() === comp.name.toLowerCase().trim());
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3 text-slate-200 font-medium">{comp.name}</td>
                                            <td className="px-5 py-3 text-indigo-400 font-mono font-bold">{comp.percentage}%</td>
                                            <td className="px-5 py-3 text-right">
                                                {match ? 
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-2 py-0.5 h-5 text-[9px] uppercase font-black tracking-wide"><Check className="w-2 h-2 mr-1" /> READY</Badge> : 
                                                    <Badge className="bg-rose-500/10 text-rose-500 border-none px-2 py-0.5 h-5 text-[9px] uppercase font-black tracking-wide">MISSING</Badge>
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
        <Card className="bg-slate-900/50 border-slate-800 my-4 w-full max-w-2xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in duration-300">
            <CardHeader className="p-4 border-b border-slate-800 bg-slate-800/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                        <Database className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-200 uppercase tracking-wider">Hasil Analisis Stok</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/50 text-slate-500 uppercase tracking-widest text-[9px] font-black border-b border-slate-800">
                        <tr>
                            <th className="px-5 py-3">Nama Item</th>
                            <th className="px-5 py-3">Kategori</th>
                            <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {data.items.map((item, idx) => {
                            const dbItem = allIngredients.find(i => i.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                            return (
                                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-5 py-3 text-slate-200 font-medium">{item.name}</td>
                                    <td className="px-5 py-3 text-slate-400 text-[10px] uppercase font-bold tracking-wider">{dbItem?.category || item.category || '-'}</td>
                                    <td className="px-5 py-3 text-right">
                                        {dbItem ? 
                                            <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-2 font-bold text-[10px] uppercase" onClick={() => onDeleteIngredient(dbItem.id, dbItem.name)}>HAPUS</Button> :
                                            <Button size="sm" className="h-7 bg-amber-600 hover:bg-amber-500 text-[10px] px-3 font-bold uppercase transition-transform active:scale-95" onClick={() => onAddIngredient(item.name, "Material sintetik")}>TAMBAH</Button>
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
                supabase.from('marketplace_orders').select('*').limit(5) // Just for context
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

            let totalSales = 0;
            sales.forEach(o => { totalSales += Number(o.total_amount || 0); });

            setAllIngredients(materials);
            setDbProfile(profRes.data || null);
            setDbStats({
                totalModalDikeluarkan: Math.round(totalProductionCost + totalStockValue),
                sisaModalBahan: Math.round(totalStockValue),
                totalProductionCost: Math.round(totalProductionCost),
                totalBatches: history.length,
                totalSales: Math.round(totalSales)
            });
        } catch (e) { console.error(e); }
    };

    const addIngredient = async (name, category) => {
        try {
            const { data, error } = await supabase.from('raw_materials').insert([{ user_id: ownerId, name, category, quantity: 0, unit: 'ml', price: 0, price_per_qty_amount: 1, min_stock: 10 }]).select();
            if (error) throw error;
            toast({ title: "Berhasil", description: `${name} masuk database.` });
            setAllIngredients(prev => [...prev, ...data]);
        } catch (e) { toast({ title: "Gagal", description: e.message, variant: "destructive" }); }
    };

    const deleteIngredient = async (id, name) => {
        if (!window.confirm(`Hapus ${name}?`)) return;
        try {
            await supabase.from('raw_materials').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            setAllIngredients(prev => prev.filter(i => i.id !== id));
            toast({ title: "Berhasil", description: `${name} dihapus.` });
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!inputText.trim() && images.length === 0) return;
        const currentImages = [...images];
        const currentInput = inputText;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputText, images: currentImages.map(img => img.preview) }]);
        setInputText(''); setImages([]); setProcessing(true);

        const systemPrompt = `Anda adalah AI Strategist Bisnis ${dbProfile?.business_name || 'Cleith'}. Bahasa: Indonesia.
DATA REAL-TIME:
- Total Investasi: Rp ${dbStats.totalModalDikeluarkan.toLocaleString('id-ID')}
- Aset Bahan: Rp ${dbStats.sisaModalBahan.toLocaleString('id-ID')}
- Biaya Produksi: Rp ${dbStats.totalProductionCost.toLocaleString('id-ID')}
- Total Penjualan: Rp ${dbStats.totalSales.toLocaleString('id-ID')}

TUGAS UTAMA:
- Jika user tanya "Modal", tanyakan balik: Mau tahu Total Investasi (Rp ${dbStats.totalModalDikeluarkan}), Sisa Aset (Rp ${dbStats.sisaModalBahan}), atau Biaya Produksi (Rp ${dbStats.totalProductionCost})?
- Jika mendeteksi formula, output harus mengandung JSON <RECIPE>{"title": "Nama", "components": [{"name": "A", "percentage": 10}]}</RECIPE>.
- Jika analisis stok, output JSON <INVENTORY>{"items": [{"name": "A", "category": "Bibit"}]}</INVENTORY>.
- Bandingkan dengan database dan beri saran taktis.`;

        try {
            let responseText = "";
            if (aiProvider === 'openai' && openaiKey) {
                const openai = new OpenAI({ apiKey: openaiKey.trim(), dangerouslyAllowBrowser: true });
                const content = [{ type: "text", text: currentInput || "Analisis ini." }];
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
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, AI sedang sibuk.";
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

    if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden relative">
            <header className="shrink-0 flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-200 leading-none">AI Studio Stokcer</h2>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-1">Real-time Analytics</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto opacity-50">
                        <BrainCircuit className="w-16 h-16 text-slate-700 mb-6" />
                        <h3 className="text-2xl font-bold text-slate-300">Bagaimana saya bisa membantu?</h3>
                        <p className="text-slate-500 mt-2 text-sm">Tanyakan tentang modal, upload resep parfum, atau analisis stok bahan baku Anda.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-700 shadow-lg shadow-black/20' : 'bg-indigo-600/20 border border-indigo-500/30'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
                            </div>
                            <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {msg.images && msg.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-end mb-1">
                                        {msg.images.map((img, i) => <img key={i} src={img} className="rounded-xl border border-slate-700 max-w-[200px] shadow-xl" alt="upload" />)}
                                    </div>
                                )}
                                <div className={`px-5 py-3 rounded-2xl text-[13px] leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700/50 whitespace-pre-line'}`}>
                                    {msg.content}
                                </div>
                                {msg.recipeData && <RecipeBlock data={msg.recipeData} allIngredients={allIngredients} onAddIngredient={addIngredient} onNavigate={onNavigate} />}
                                {msg.inventoryData && <InventoryCheckBlock data={msg.inventoryData} allIngredients={allIngredients} onAddIngredient={addIngredient} onDeleteIngredient={deleteIngredient} />}
                            </div>
                        </div>
                    ))
                )}
                {processing && <div className="max-w-4xl mx-auto flex items-center gap-2 pl-12">
                    <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">AI sedang menganalisis data bisnis Anda...</span>
                </div>}
                <div ref={chatEndRef} />
            </div>

            <div className="shrink-0 max-w-4xl mx-auto w-full pb-4 px-2">
                <form onSubmit={handleSubmit} className="relative z-10">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2 px-3 shadow-2xl focus-within:border-indigo-500/50 transition-all duration-300 group">
                        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-colors">
                            <Plus className="w-5 h-5 flex-shrink-0" />
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
                            placeholder="Tanya Chat AI Studio..."
                            className="bg-transparent border-none focus-visible:ring-0 text-slate-200 h-11 text-sm placeholder:text-slate-600"
                        />
                        <Button type="submit" disabled={processing || (!inputText.trim() && images.length === 0)} className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 shrink-0">
                            <ArrowUp className="w-5 h-5" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AIStudio;
