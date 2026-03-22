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
    Save
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

const SYNONYMS = {
    'ambroxan': ['ambroxide', 'cetalox', 'ambrofix', 'ambrox'],
    'galaxolide': ['abbalide', 'musk 50'],
    'hedione': ['methyl dihydrojasmonate', 'khariane'],
    'iso e super': ['sylvamber', 'timbersilk', 'iso e'],
    'ethylene brassylate': ['musk t', 'astratone'],
    'habanolide': ['globalide'],
    'musk ketone': ['mk'],
    'lilial': ['lysaldehyde', 'butylphenyl methylpropional']
};

const isSimilar = (name1, name2) => {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    if (n1 === n2) return true;
    const cleanN1 = n1.replace(/[^a-z0-9]/g, '');
    const cleanN2 = n2.replace(/[^a-z0-9]/g, '');
    if (cleanN1.includes(cleanN2) || cleanN2.includes(cleanN1)) return true;
    for (const [key, aliases] of Object.entries(SYNONYMS)) {
        const isN1Match = n1.includes(key) || aliases.some(a => n1.includes(a));
        const isN2Match = n2.includes(key) || aliases.some(a => n2.includes(a));
        if (isN1Match && isN2Match) return true;
    }
    return false;
};

const RecipeBlock = ({ data, allIngredients, onAddIngredient, onNavigate }) => {
    const [missingCategories, setMissingCategories] = useState({});
    const existingCats = Array.from(new Set(allIngredients.map(i => i.category))).filter(Boolean);
    const defaultCat = existingCats.find(c => c.toLowerCase().includes('material')) || existingCats[0] || "Material sintetik";

    if (!data || !data.components) return null;

    const missing = data.components.filter(comp => {
        return !allIngredients.some(item => isSimilar(item.name, comp.name));
    });

    const handleSaveFormula = () => {
        // Prepare data for the Recipe Page - ABSOLUTE VALUE FIX
        const preparedData = {
            ...data,
            // Flag to tell the New Recipe page to NOT normalize these values
            isAiGenerated: true,
            totalConcentration: 100, 
            components: data.components.map(c => {
                const match = allIngredients.find(i => isSimilar(i.name, c.name));
                return {
                    ...c,
                    // Use exact ID from database for proper linking
                    materialId: match?.id,
                    // Ensure category matches exactly what's in the DB
                    category: match ? match.category : (c.category || defaultCat),
                    // Send exact percentage from AI
                    percentage: Number(c.percentage)
                };
            })
        };
        sessionStorage.setItem('pendingAiRecipe', JSON.stringify(preparedData));
        if (onNavigate) onNavigate('recipes');
    };

    return (
        <div className="space-y-5 my-4 w-full max-w-4xl animate-in fade-in slide-in-from-top-4 duration-500">
            {missing.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-md border-2 overflow-hidden shadow-2xl">
                    <div className="bg-amber-600/20 px-6 py-3 border-b border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest">Input {missing.length} Bahan Baru Ke Gudang :</h3>
                        </div>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {missing.map((comp, idx) => (
                                <div key={idx} className="px-6 py-4 flex items-center justify-between bg-slate-900/40">
                                    <span className="text-sm font-bold text-slate-200">{comp.name}</span>
                                    <div className="flex items-center gap-3">
                                        <Select value={missingCategories[comp.name] || defaultCat} onValueChange={(v) => setMissingCategories(p => ({...p, [comp.name]: v}))}>
                                            <SelectTrigger className="w-44 h-9 text-[10px] bg-slate-950 border-slate-700 font-bold uppercase"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800 text-slate-300">
                                                {existingCats.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                {!existingCats.includes("Material sintetik") && <SelectItem value="Material sintetik">Material sintetik</SelectItem>}
                                            </SelectContent>
                                        </Select>
                                        <Button size="sm" className="bg-amber-600 hover:bg-amber-500 h-9 px-6 text-[10px] font-black uppercase tracking-widest transition-transform active:scale-90" onClick={() => onAddIngredient(comp.name, missingCategories[comp.name] || defaultCat)}>
                                            <Plus className="w-4 h-4 mr-1.5" /> + INPUT
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-[#0f172a]/90 border-slate-700 shadow-2xl overflow-hidden backdrop-blur-2xl ring-1 ring-white/10">
                <CardHeader className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 to-transparent flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-inner"><FlaskConical className="w-6 h-6 text-indigo-400" /></div>
                        <div>
                            <CardTitle className="text-lg font-black text-white leading-none uppercase tracking-tight">Resep Parfum Terdeteksi</CardTitle>
                            <CardDescription className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Data Presisi 100% Sesuai Analisis AI</CardDescription>
                        </div>
                    </div>
                    <Button size="sm" className="bg-[#4143e2] hover:bg-[#4143e2]/90 text-[11px] font-black h-10 px-6 tracking-widest rounded-xl shadow-xl shadow-indigo-900/40 border border-indigo-500/50" onClick={handleSaveFormula}>
                         <Check className="w-4 h-4 mr-2" /> SIMPAN FORMULA
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950/80 text-slate-500 uppercase tracking-[0.2em] text-[10px] font-black border-b border-white/5">
                                <tr><th className="px-6 py-5">Bahan Baku</th><th className="px-6 py-5">%</th><th className="px-6 py-5">Kategori</th><th className="px-6 py-5 text-right">Status Gudang</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.components.map((comp, idx) => {
                                    const match = allIngredients.find(i => isSimilar(i.name, comp.name));
                                    return (
                                        <tr key={idx} className="group hover:bg-white/[0.03] transition-all duration-200">
                                            <td className="px-6 py-5 font-bold tracking-tight text-slate-200 text-sm">
                                                <div className="flex flex-col">
                                                    <span>{comp.name}</span>
                                                    {match && match.name.toLowerCase() !== comp.name.toLowerCase() && (
                                                        <span className="text-[9px] text-indigo-400 font-black tracking-widest uppercase mt-1">Stok: {match.name}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5"><span className="text-indigo-400 font-mono font-black text-sm bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">{comp.percentage}%</span></td>
                                            <td className="px-6 py-5"><Badge className="bg-slate-800/80 text-slate-300 border border-white/5 font-black uppercase text-[9px] px-2 h-6 tracking-widest">{match ? match.category : (comp.category || defaultCat)}</Badge></td>
                                            <td className="px-6 py-5 text-right">
                                                {match ? <span className="text-emerald-500 font-black flex items-center justify-end gap-2 text-[10px] uppercase tracking-widest"><Check className="w-4 h-4 bg-emerald-500/10 p-0.5 rounded-full" /> Ready</span> : <span className="text-rose-500 font-black flex items-center justify-end gap-2 text-[10px] uppercase tracking-widest"><X className="w-4 h-4 bg-rose-500/10 p-0.5 rounded-full" /> Missing</span>}
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
        <Card className="bg-[#0f172a]/80 border-slate-700 my-4 w-full max-w-4xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in duration-300">
            <CardHeader className="p-5 border-b border-white/5 bg-slate-800/20 font-black uppercase tracking-widest text-sm text-slate-200">Hasil Scan Inventaris</CardHeader>
            <CardContent className="p-0">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950/50 text-slate-500 uppercase tracking-widest text-[10px] font-black border-b border-white/5">
                        <tr><th className="px-6 py-5">Nama Item</th><th className="px-6 py-5">Kategori</th><th className="px-6 py-5 text-right">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.items.map((item, idx) => {
                            const dbItem = allIngredients.find(i => isSimilar(i.name, item.name));
                            return (
                                <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                    <td className="px-6 py-5 font-bold tracking-tight text-slate-200 text-sm">{item.name}</td>
                                    <td className="px-6 py-5 text-slate-400 text-[10px] uppercase font-black tracking-widest">{dbItem?.category || item.category || 'Material sintetik'}</td>
                                    <td className="px-6 py-5 text-right">
                                        {dbItem ? <Button variant="ghost" size="sm" className="h-9 text-rose-500 hover:text-rose-400 font-black text-[10px] uppercase tracking-widest" onClick={() => onDeleteIngredient(dbItem.id, dbItem.name)}>HAPUS</Button> : <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-500 text-[10px] px-6 font-black uppercase shadow-lg shadow-emerald-900/40" onClick={() => onAddIngredient(item.name, item.category || "Material sintetik")}>INPUT</Button>}
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
    const [dbStats, setDbStats] = useState({ totalModalDikeluarkan: 0, sisaModalBahan: 0, totalProductionCost: 0, totalBatches: 0, totalSales: 0 });
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    useEffect(() => { if (ownerId) { fetchSettings(); fetchDataContext(); } }, [ownerId]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, processing]);

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
            setAllIngredients(materials);
            setDbProfile(profRes.data || null);
            setDbStats({
                totalModalDikeluarkan: Math.round(totalProductionCost + totalStockValue),
                sisaModalBahan: Math.round(totalStockValue),
                totalProductionCost: Math.round(totalProductionCost),
                totalBatches: history.length,
                totalSales: Math.round(sales.reduce((acc, o) => acc + Number(o.total_amount || 0), 0))
            });
        } catch (e) { console.error(e); }
    };

    const addIngredient = async (name, category) => {
        try {
            const { data, error } = await supabase.from('raw_materials').insert([{ user_id: ownerId, name, category, quantity: 0, unit: 'ml', price: 0, price_per_qty_amount: 1, min_stock: 10 }]).select();
            if (error) throw error;
            toast({ title: "Berhasil Input", description: `${name} telah masuk ke gudang Stokcer.` });
            setAllIngredients(prev => [...prev, ...data]);
        } catch (e) { toast({ title: "Gagal", description: e.message, variant: "destructive" }); }
    };

    const deleteIngredient = async (id, name) => {
        if (!window.confirm(`Hapus ${name}?`)) return;
        try {
            await supabase.from('raw_materials').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            setAllIngredients(prev => prev.filter(i => i.id !== id));
            toast({ title: "Terhapus", description: `${name} telah dikeluarkan.` });
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!inputText.trim() && images.length === 0) return;
        const currentImages = [...images];
        const currentInput = inputText;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputText, images: currentImages.map(img => img.preview) }]);
        setInputText(''); setImages([]); setProcessing(true);
        const systemPrompt = `Anda AI Ahli Kimia & Strategis Parfum Cleith. Bahasa: Indonesia.
Daftar Kategori Anda: ${Array.from(new Set(allIngredients.map(i => i.category))).join(', ')}.
Wajib JSON <RECIPE>{"title": "Nama", "components": [{"name": "A", "percentage": 10, "category": "Kategori Sesuai Database", "note": "Top Note"}]}</RECIPE>.`;
        try {
            let responseText = "";
            if (aiProvider === 'openai' && openaiKey) {
                const openai = new OpenAI({ apiKey: openaiKey.trim(), dangerouslyAllowBrowser: true });
                const content = [{ type: "text", text: currentInput || "Analisis resep ini." }];
                for (let i of currentImages) content.push({ type: "image_url", image_url: { url: await fileToBase64(i.file) } });
                const res = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content }] });
                responseText = res.choices[0].message.content;
            } else if (apiKey) {
                const body = { contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + (currentInput || "Analisis resep parfum ini") }] }] };
                for (let i of currentImages) { const b64 = await fileToBase64(i.file); body.contents[0].parts.push({ inlineData: { mimeType: "image/jpeg", data: b64.split(',')[1] } }); }
                const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await res.json();
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI sedang offline.";
            }
            const recipeRegex = /<RECIPE>([\s\S]*?)<\/RECIPE>/;
            const inventoryRegex = /<INVENTORY>([\s\S]*?)<\/INVENTORY>/;
            let parsedRecipe = null; let parsedInv = null;
            if (responseText.match(recipeRegex)) { try { parsedRecipe = JSON.parse(responseText.match(recipeRegex)[1].trim()); responseText = responseText.replace(recipeRegex, ''); } catch(e){} }
            if (responseText.match(inventoryRegex)) { try { parsedInv = JSON.parse(responseText.match(inventoryRegex)[1].trim()); responseText = responseText.replace(inventoryRegex, ''); } catch(e){} }
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: responseText, recipeData: parsedRecipe, inventoryData: parsedInv }]);
        } catch (e) { setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ Error: ${e.message}` }]); } finally { setProcessing(false); }
    };
    const fileToBase64 = (file) => new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(file); });
    if (loading) return <div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin text-indigo-500 w-12 h-12" /></div>;
    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden relative">
            <header className="shrink-0 flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 shadow-inner"><Sparkles className="w-6 h-6 text-indigo-400" /></div>
                    <div><h2 className="text-xl font-black text-white leading-none uppercase tracking-tight">AI Studio Stokcer</h2><span className="text-[10px] text-indigo-500 font-black tracking-widest uppercase mt-2 block tracking-widest">Perfume Intelligence Deep Analysis</span></div>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto px-2 py-8 space-y-10 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto grayscale opacity-40"><BrainCircuit className="w-20 h-20 text-indigo-500 mb-8" /><h3 className="text-3xl font-black text-white uppercase tracking-tighter">Strategic Intelligence</h3><p className="text-slate-500 mt-3 text-sm font-medium italic">Ready to analyze your perfume formula & financial data.</p></div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-6 max-w-5xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}><div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all ${msg.role === 'user' ? 'bg-indigo-600 rotate-3' : 'bg-slate-800 border border-slate-700 -rotate-3'}`}>{msg.role === 'user' ? <User className="w-6 h-6 text-white" /> : <Sparkles className="w-6 h-6 text-indigo-400" />}</div><div className={`flex flex-col gap-4 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>{msg.images && msg.images.length > 0 && (<div className="flex flex-wrap gap-4 justify-end mb-1">{msg.images.map((img, i) => <img key={i} src={img} className="rounded-2xl border-2 border-slate-700 max-w-[300px] shadow-3xl" alt="upload" />)}</div>)}<div className={`px-6 py-4 rounded-3xl text-[14px] leading-relaxed shadow-3xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800/90 text-slate-200 rounded-tl-none border border-white/5 backdrop-blur-md whitespace-pre-line'}`}>{msg.content}</div>{msg.recipeData && <RecipeBlock data={msg.recipeData} allIngredients={allIngredients} onAddIngredient={addIngredient} onNavigate={onNavigate} />}{msg.inventoryData && <InventoryCheckBlock data={msg.inventoryData} allIngredients={allIngredients} onAddIngredient={addIngredient} onDeleteIngredient={deleteIngredient} />}</div></div>
                    ))
                )}
                {processing && <div className="max-w-4xl mx-auto flex items-center gap-4 pl-20 animate-pulse text-indigo-400 font-bold uppercase tracking-widest text-[10px]">AI is analyzing...</div>}
                <div ref={chatEndRef} />
            </div>
            <div className="shrink-0 max-w-5xl mx-auto w-full pb-8 px-2">
                <form onSubmit={handleSubmit} className="relative"><div className="flex items-center gap-3 bg-[#0f172a] border border-white/10 rounded-[2rem] p-3 pl-5 pr-3 shadow-3xl focus-within:border-indigo-500/50 transition-all duration-300"><Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-all rounded-2xl w-12 h-12"><Plus className="w-7 h-7" /></Button><input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setImages([{ file, preview: reader.result }]); reader.readAsDataURL(file); } }} className="hidden" accept="image/*" />
                <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Tanya tentang modal atau input formula baru..." className="bg-transparent border-none focus-visible:ring-0 text-white h-12 text-sm placeholder:text-slate-600 font-medium" />
                <Button type="submit" disabled={processing || (!inputText.trim() && images.length === 0)} className="bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/50 shrink-0 w-12 h-12 rounded-2xl transition-all active:scale-95"><ArrowUp className="w-6 h-6 text-white" /></Button></div></form>
            </div>
        </div>
    );
}
export default AIStudio;
