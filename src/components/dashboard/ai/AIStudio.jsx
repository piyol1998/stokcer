import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
    Sparkles, 
    Plus, 
    Check, 
    AlertTriangle, 
    RefreshCw,
    BrainCircuit,
    Database,
    User,
    X,
    ArrowUp,
    Trash2,
    FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    const detectedIngredients = data?.components?.map(c => c.name) || [];
    const missing = detectedIngredients.filter(name => {
        const cleanName = name.toLowerCase().trim();
        return !allIngredients.some(item => item.name.toLowerCase().trim() === cleanName);
    });

    return (
        <div className="space-y-4 my-4 w-full max-w-2xl">
            {missing.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5 border-2">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <p className="text-xs font-bold text-amber-500 uppercase">Input {missing.length} Bahan Baru</p>
                        </div>
                        <div className="space-y-2">
                            {missing.map((name, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg">
                                    <span className="text-xs text-slate-200">{name}</span>
                                    <Button size="sm" className="h-7 text-[10px] bg-amber-600" onClick={() => onAddIngredient(name, "Bibit")}>Tambah</Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="p-4 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-200">{data?.title || 'Formula AI'}</CardTitle>
                        <Button size="sm" className="h-7 text-[10px]" onClick={() => {
                             sessionStorage.setItem('pendingAiRecipe', JSON.stringify(data));
                             if (onNavigate) onNavigate('recipes');
                        }}>Simpan Formula</Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-950 text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-2">Bahan</th>
                                <th className="px-4 py-2">%</th>
                                <th className="px-4 py-2 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {data?.components?.map((comp, idx) => (
                                <tr key={idx}>
                                    <td className="px-4 py-2 text-slate-200">{comp.name}</td>
                                    <td className="px-4 py-2 text-indigo-400">{comp.percentage}%</td>
                                    <td className="px-4 py-2 text-right">
                                        {allIngredients.some(i => i.name.toLowerCase().trim() === comp.name.toLowerCase().trim()) ? 
                                            <Badge className="bg-emerald-500/10 text-emerald-500 h-4 text-[9px]">Ready</Badge> : 
                                            <Badge className="bg-amber-500/10 text-amber-500 h-4 text-[9px]">Missing</Badge>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
};

const InventoryCheckBlock = ({ data, allIngredients, onAddIngredient, onDeleteIngredient }) => {
    const items = data?.items || [];
    return (
        <Card className="bg-slate-900/50 border-slate-800 my-4 w-full max-w-2xl">
            <CardHeader className="p-4 border-b border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-200">Deteksi Stokcer</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-950 text-slate-500 uppercase">
                        <tr>
                            <th className="px-4 py-2">Item</th>
                            <th className="px-4 py-2 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {items.map((item, idx) => {
                            const dbItem = allIngredients.find(i => i.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                            return (
                                <tr key={idx}>
                                    <td className="px-4 py-2 text-slate-200 font-medium">{item.name}</td>
                                    <td className="px-4 py-2 text-right space-x-2">
                                        {dbItem ? 
                                            <Button variant="ghost" size="sm" className="h-6 text-red-500 text-[10px]" onClick={() => onDeleteIngredient(dbItem.id, dbItem.name)}>Hapus</Button> :
                                            <Button size="sm" className="h-6 text-[10px] bg-amber-600" onClick={() => onAddIngredient(item.name, "Material sintetik")}>Input</Button>
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
        totalSales: 0,
        employees: []
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
            const [ingRes, profRes, prodRes, empRes, salesRes] = await Promise.all([
                supabase.from('raw_materials').select('*').eq('user_id', ownerId).is('deleted_at', null),
                supabase.from('profiles').select('*').eq('id', ownerId).single(),
                supabase.from('production_history').select('*').eq('user_id', ownerId),
                supabase.from('employees').select('*').eq('owner_id', ownerId),
                supabase.from('marketplace_orders').select('*').eq('user_id', ownerId).limit(10)
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
                totalSales: Math.round(totalSales),
                employees: empRes.data || []
            });
        } catch (e) { console.error(e); }
    };

    const addIngredient = async (name, category) => {
        try {
            const { data, error } = await supabase.from('raw_materials').insert([{ user_id: ownerId, name, category, quantity: 0, unit: 'ml', price: 0, price_per_qty_amount: 1, min_stock: 10 }]).select();
            if (error) throw error;
            toast({ title: "Berhasil", description: `${name} sudah masuk database.` });
            setAllIngredients(prev => [...prev, ...data]);
        } catch (e) { toast({ title: "Gagal", description: e.message, variant: "destructive" }); }
    };

    const deleteIngredient = async (id, name) => {
        if (!window.confirm(`Hapus ${name}?`)) return;
        try {
            await supabase.from('raw_materials').update({ deleted_at: new Date().toISOString() }).eq('id', id);
            setAllIngredients(prev => prev.filter(i => i.id !== id));
        } catch (e) { console.error(e); }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!inputText.trim() && images.length === 0) return;
        const currentImages = [...images];
        const currentInput = inputText;
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputText, images: currentImages.map(img => img.preview) }]);
        setInputText(''); setImages([]); setProcessing(true);

        const systemPrompt = `Anda adalah AI Strategist Bisnis ${dbProfile?.business_name || 'Stokcer'}. Bahasa: Indonesia.
Data: Investasi Rp ${dbStats.totalModalDikeluarkan.toLocaleString('id-ID')}, Aset Rp ${dbStats.sisaModalBahan.toLocaleString('id-ID')}, Produksi Rp ${dbStats.totalProductionCost.toLocaleString('id-ID')}, Penjualan Rp ${dbStats.totalSales.toLocaleString('id-ID')}.
Wajib: Jika tanya "Modal", tanyakan balik: Mau tahu Total Investasi (Rp ${dbStats.totalModalDikeluarkan}), Aset (Rp ${dbStats.sisaModalBahan}), atau Produksi (Rp ${dbStats.totalProductionCost})?`;

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
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal AI";
            }

            const recipeRegex = /<RECIPE>([\s\S]*?)<\/RECIPE>/;
            const inventoryRegex = /<INVENTORY>([\s\S]*?)<\/INVENTORY>/;
            let parsedRecipe = null; let parsedInv = null;
            if (responseText.match(recipeRegex)) { try { parsedRecipe = JSON.parse(responseText.match(recipeRegex)[1]); responseText = responseText.replace(recipeRegex, ''); } catch(e){} }
            if (responseText.match(inventoryRegex)) { try { parsedInv = JSON.parse(responseText.match(inventoryRegex)[1]); responseText = responseText.replace(inventoryRegex, ''); } catch(e){} }

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: responseText, recipeData: parsedRecipe, inventoryData: parsedInv }]);
        } catch (e) { setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ Error: ${e.message}` }]); } finally { setProcessing(false); }
    };

    const fileToBase64 = (file) => new Promise((resolve) => {
        const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.readAsDataURL(file);
    });

    if (loading) return <div className="flex h-full items-center justify-center p-20"><RefreshCw className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] overflow-hidden">
            <header className="pb-4 border-b border-slate-800 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-slate-200">AI Studio Stokcer</h2>
            </header>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <BrainCircuit className="w-12 h-12 text-slate-700 mb-4" />
                        <h3 className="text-xl font-bold text-slate-300">Ada yang bisa bantu?</h3>
                        <p className="text-slate-500 text-sm mt-2">Tanya tentang modal atau upload foto resep.</p>
                    </div>
                ) : messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-700' : 'bg-indigo-600/20 text-indigo-400'}`}>
                            {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        </div>
                        <div className="max-w-[85%] space-y-2">
                            <div className={`p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-slate-800 text-slate-200' : 'text-slate-300 whitespace-pre-line'}`}>{msg.content}</div>
                            {msg.recipeData && <RecipeBlock data={msg.recipeData} allIngredients={allIngredients} onAddIngredient={addIngredient} onNavigate={onNavigate} />}
                            {msg.inventoryData && <InventoryCheckBlock data={msg.inventoryData} allIngredients={allIngredients} onAddIngredient={addIngredient} onDeleteIngredient={deleteIngredient} />}
                        </div>
                    </div>
                ))}
                {processing && <div className="text-indigo-400 text-xs animate-pulse text-center">AI sedang berpikir...</div>}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-xl mt-4">
                <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current.click()}><Plus /></Button>
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setImages([{ file, preview: reader.result }]);
                            reader.readAsDataURL(file);
                        }
                    }} className="hidden" accept="image/*" />
                    <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Tanya Chat AI..." className="bg-transparent border-slate-700 focus:ring-indigo-500" />
                    <Button type="submit" disabled={processing}><ArrowUp /></Button>
                </div>
            </form>
        </div>
    );
}

export default AIStudio;
