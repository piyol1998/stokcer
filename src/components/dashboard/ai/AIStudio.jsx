import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
    Sparkles, 
    Upload, 
    Image as ImageIcon, 
    Plus, 
    Check, 
    AlertTriangle, 
    Loader2, 
    FlaskConical, 
    Camera,
    RefreshCw,
    Search,
    BrainCircuit,
    Wand2,
    Database,
    Table,
    FileJson,
    Paperclip, 
    ImagePlus, 
    Send,
    User,
    X,
    FileText,
    ArrowUp,
    Bot,
    Trash2,
    TrendingUp,
    ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const RecipeBlock = ({ data, allIngredients, onAddIngredient, onNavigate }) => {
    const [missingCategories, setMissingCategories] = useState({});

    const detectedIngredients = data.components.map(c => c.name);
    const missing = detectedIngredients.filter(name => {
        const cleanName = name.toLowerCase().trim();
        return !allIngredients.some(item => item.name.toLowerCase().trim() === cleanName);
    });

    const handleCategoryChange = (name, cat) => {
        setMissingCategories(prev => ({...prev, [name]: cat}));
    };

    return (
        <div className="space-y-4 my-4 w-full max-w-2xl">
            {missing.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm overflow-hidden border-2">
                    <div className="bg-amber-500/10 px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-bold text-amber-500">Perlu Tambahan {missing.length} Bahan Baru</h3>
                        </div>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y divide-amber-500/10">
                            {missing.map((name, idx) => (
                                <div key={idx} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/50">
                                    <div>
                                        <p className="font-bold text-slate-200 text-sm">{name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select 
                                            value={missingCategories[name] || "Bibit"}
                                            onValueChange={(val) => handleCategoryChange(name, val)}
                                        >
                                            <SelectTrigger className="w-[120px] bg-slate-950 border-slate-800 text-xs h-8">
                                                <SelectValue placeholder="Kategori" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800 text-slate-300 border-2">
                                                <SelectItem value="Bibit">Bibit</SelectItem>
                                                <SelectItem value="Pelarut">Pelarut</SelectItem>
                                                <SelectItem value="Material sintetik">Material sintetik</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button 
                                            size="sm"
                                            className="bg-amber-600 hover:bg-amber-700 h-8 text-xs"
                                            onClick={() => onAddIngredient(name, missingCategories[name] || "Bibit")}
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Input
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
                <CardHeader className="border-b border-slate-800 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20">
                                <FlaskConical className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle className="text-base text-slate-200">{data.title}</CardTitle>
                            </div>
                        </div>
                        <Button 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs text-slate-100"
                            onClick={() => {
                                const enrichedData = {
                                    ...data,
                                    components: data.components.map(comp => {
                                        const match = allIngredients.find(i => i.name.toLowerCase().trim() === comp.name.toLowerCase().trim());
                                        return {
                                            ...comp,
                                            matchedId: match?.id,
                                            matchedCategory: match?.category
                                        };
                                    })
                                };
                                sessionStorage.setItem('pendingAiRecipe', JSON.stringify(enrichedData));
                                if (onNavigate) onNavigate('recipes');
                            }}
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Simpan Formula
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Bahan Baku</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider">%</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Kategori</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {data.components.map((comp, idx) => {
                                    const matchedItem = allIngredients.find(i => i.name.toLowerCase().trim() === comp.name.toLowerCase().trim());
                                    const exists = !!matchedItem;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-200">{comp.name}</td>
                                            <td className="px-4 py-3 text-indigo-400">{comp.percentage}%</td>
                                            <td className="px-4 py-3 text-slate-400 text-[10px] uppercase font-semibold tracking-wider">{matchedItem ? matchedItem.category : '-'}</td>
                                            <td className="px-4 py-3">
                                                {exists ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] h-5">
                                                        <Check className="w-2 h-2 mr-1" /> Ready
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-amber-500/10 text-amber-500 border-none text-[9px] h-5">
                                                         Missing
                                                    </Badge>
                                                )}
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
    const [missingCategories, setMissingCategories] = useState({});

    const missingItems = data.items.filter(item => {
        const cleanName = item.name.toLowerCase().trim();
        return !allIngredients.some(i => i.name.toLowerCase().trim() === cleanName);
    });

    const existingItems = data.items.filter(item => {
        const cleanName = item.name.toLowerCase().trim();
        return allIngredients.some(i => i.name.toLowerCase().trim() === cleanName);
    });

    const handleCategoryChange = (name, cat) => {
        setMissingCategories(prev => ({...prev, [name]: cat}));
    };

    return (
        <div className="space-y-4 my-4 w-full max-w-2xl">
            {missingItems.length > 0 && (
                <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm overflow-hidden border-2">
                    <div className="bg-amber-500/10 px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-bold text-amber-500">Perlu Tambahan {missingItems.length} Bahan Baru</h3>
                        </div>
                    </div>
                    <CardContent className="p-0">
                        <div className="divide-y divide-amber-500/10">
                            {missingItems.map((item, idx) => (
                                <div key={idx} className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/50">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-200 text-sm">{item.name}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select 
                                            value={missingCategories[item.name] || "Material sintetik"}
                                            onValueChange={(val) => handleCategoryChange(item.name, val)}
                                        >
                                            <SelectTrigger className="w-[120px] bg-slate-950 border-slate-800 text-xs h-8">
                                                <SelectValue placeholder="Kategori" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-950 border-slate-800 text-slate-300 border-2">
                                                <SelectItem value="Bibit">Bibit</SelectItem>
                                                <SelectItem value="Pelarut">Pelarut</SelectItem>
                                                <SelectItem value="Material sintetik">Material sintetik</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button 
                                            size="sm"
                                            className="bg-amber-600 hover:bg-amber-700 h-8 text-xs"
                                            onClick={() => onAddIngredient(item.name, missingCategories[item.name] || "Material sintetik")}
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Input
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {existingItems.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-800 shadow-xl">
                    <CardHeader className="border-b border-slate-800 pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center border border-emerald-500/20">
                                    <Database className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-base text-slate-200">Bahan Baku Terdeteksi</CardTitle>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-950 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Bahan Baku</th>
                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Kategori</th>
                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Stok Saat Ini</th>
                                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {existingItems.map((item, idx) => {
                                        const dbItem = allIngredients.find(i => i.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                                        return (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-200">{dbItem?.name || item.name}</td>
                                                <td className="px-4 py-3 text-slate-400">{dbItem?.category || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] h-5">
                                                        <Check className="w-2 h-2 mr-1" /> {dbItem?.quantity || 0} {dbItem?.unit}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-2"
                                                        onClick={() => onDeleteIngredient(dbItem?.id, dbItem?.name)}
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" /> Hapus
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

function AIStudio({ onNavigate }) {
    const { ownerId } = useAuth();
    const { toast } = useToast();
    
    // Config States
    const [aiProvider, setAiProvider] = useState('gemini');
    const [apiKey, setApiKey] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [deepseekKey, setDeepseekKey] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    
    // Content States
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [images, setImages] = useState([]); 
    
    const [allIngredients, setAllIngredients] = useState([]);
    const [dbStocks, setDbStocks] = useState([]);
    const [dbProfile, setDbProfile] = useState(null);
    const [dbStats, setDbStats] = useState({
        totalModalDikeluarkan: 0,
        sisaModalBahan: 0,
        totalProductionCost: 0,
        totalBatches: 0,
        totalProducts: 0,
        totalMaterials: 0,
        totalSales: 0,
        totalOrders: 0,
        recentSales: [],
        employees: []
    });
    
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (ownerId) {
            fetchSettings();
            fetchDataContext();
        }
    }, [ownerId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, processing]);

    const fetchSettings = async () => {
        try {
            const { data } = await supabase
                .from('user_settings')
                .select('marketplace_creds')
                .eq('user_id', ownerId)
                .single();
            
            if (data?.marketplace_creds?.ai) {
                const creds = data.marketplace_creds.ai;
                setAiProvider(creds.provider || 'gemini');
                setApiKey(creds.gemini_api_key || '');
                setOpenaiKey(creds.openai_api_key || '');
                setDeepseekKey(creds.deepseek_api_key || '');
            }
        } catch (error) {
            console.error("Fetch settings error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDataContext = async () => {
        try {
            // Fetch all data including marketplace_orders
            const [ingRes, stockRes, profRes, prodRes, empRes, salesRes] = await Promise.all([
                supabase.from('raw_materials').select('*').eq('user_id', ownerId).is('deleted_at', null).order('name', { ascending: true }),
                supabase.from('stocks').select('*').eq('user_id', ownerId).order('name', { ascending: true }),
                supabase.from('profiles').select('*').eq('id', ownerId).single(),
                supabase.from('production_history').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }),
                supabase.from('employees').select('*').eq('owner_id', ownerId),
                supabase.from('marketplace_orders').select('*').eq('user_id', ownerId).order('created_at', { ascending: false })
            ]);

            const materials = ingRes.data || [];
            const stocks = stockRes.data || [];
            const history = prodRes.data || [];
            const sales = salesRes.data || [];

            // 1. Calculate Sisa Modal Bahan (8M Asset)
            let totalStockValue = 0;
            const priceMap = {};
            materials.forEach(m => {
                const buyPrice = Number(m.price) || 0;
                const buyQty = Number(m.price_per_qty_amount) || 1;
                const pricePerUnit = buyPrice / buyQty;
                priceMap[m.id] = pricePerUnit;
                totalStockValue += (Number(m.quantity) || 0) * pricePerUnit;
            });

            // 2. Calculate Total Modal Produksi (2M Consumed) - 100% Dashboard Sync
            let totalProductionCost = 0;
            history.forEach(record => {
                if (Array.isArray(record.ingredients_snapshot)) {
                    record.ingredients_snapshot.forEach(ing => {
                        const qty = Number(ing.quantity) || 0;
                        let unitPrice = 0;
                        if (ing.pricePerUnit) {
                            unitPrice = Number(ing.pricePerUnit);
                        } else if (ing.materialId && priceMap[ing.materialId]) {
                            unitPrice = priceMap[ing.materialId];
                        }
                        totalProductionCost += (qty * unitPrice);
                    });
                }
            });

            // 3. Calculate Total Sales
            let totalSalesAmount = 0;
            sales.forEach(order => {
                totalSalesAmount += Number(order.total_amount || 0);
            });

            setAllIngredients(materials);
            setDbStocks(stocks);
            setDbProfile(profRes.data || null);
            setDbStats({
                totalModalDikeluarkan: Math.round(totalProductionCost + totalStockValue),
                sisaModalBahan: Math.round(totalStockValue),
                totalProductionCost: Math.round(totalProductionCost),
                totalBatches: history.length,
                totalProducts: stocks.length,
                totalMaterials: materials.length,
                totalSales: Math.round(totalSalesAmount),
                totalOrders: sales.length,
                recentSales: sales.slice(0, 5),
                employees: empRes.data || []
            });
        } catch (error) {
            console.error("Fetch DB context error:", error);
        }
    };

    const addIngredient = async (name, category) => {
        try {
            const { data, error } = await supabase
                .from('raw_materials')
                .insert([{ 
                    user_id: ownerId, 
                    name, 
                    category,
                    quantity: 0,
                    unit: 'ml',
                    price: 0,
                    price_per_qty_amount: 1,
                    min_stock: 10
                }])
                .select();

            if (error) throw error;
            toast({ title: "Berhasil Input", description: `${name} masuk ke database.` });
            setAllIngredients(prev => [...prev, ...data]);
        } catch (error) {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    };

    const deleteIngredient = async (id, name) => {
        if (!window.confirm(`Yakin ingin menghapus bahan baku "${name}"?`)) return;
        try {
            const { error } = await supabase
                .from('raw_materials')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            toast({ title: "Berhasil", description: `Bahan ${name} telah dihapus.` });
            setAllIngredients(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            toast({ title: "Gagal Menghapus", description: error.message, variant: "destructive" });
        }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        
        if (!inputText.trim() && images.length === 0) return;

        const currentImages = [...images];
        const currentInput = inputText;

        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText,
            images: currentImages.map(img => img.preview)
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setImages([]);
        setProcessing(true);

        const systemPrompt = `
You are Stokcer AI Strategist for "${dbProfile?.business_name || 'Cleith'}". 
BAHASA: INDONESIA. Tampil cerdas, teliti, dan menguasai angka.

DASHBOARD DATA REAL-TIME:
- Total Investasi (Harta Total): Rp ${dbStats.totalModalDikeluarkan.toLocaleString('id-ID')}
- Aset Bahan Saat Ini (Gudang): Rp ${dbStats.sisaModalBahan.toLocaleString('id-ID')}
- Total Biaya Produksi (Terpakai): Rp ${dbStats.totalProductionCost.toLocaleString('id-ID')}
- Total Penjualan (Revenue): Rp ${dbStats.totalSales.toLocaleString('id-ID')}
- Jumlah Pesanan: ${dbStats.totalOrders}
- Riwayat Produksi: ${dbStats.totalBatches} Batch

PESANAN TERAKHIR:
${dbStats.recentSales.length > 0 ? dbStats.recentSales.map(s => `- Rp ${Number(s.total_amount).toLocaleString('id-ID')} (${s.created_at})`).join('\n') : "Belum ada pesanan masuk."}

INSTRUKSI WAJIB:
- Jika user tanya "Modal", Anda HARUS bertanya balik: "Apakah maksud Anda Total Investasi (Rp ${dbStats.totalModalDikeluarkan.toLocaleString('id-ID')}), Aset Bahan (Rp ${dbStats.sisaModalBahan.toLocaleString('id-ID')}), atau Biaya Produksi (Rp ${dbStats.totalProductionCost.toLocaleString('id-ID')})?"
- Jika user tanya "Berapa Penjualan" atau "Laku berapa", jawab berdasarkan angka Total Penjualan.
- Pastikan Biaya Produksi selaras dengan Dashboard.
- Format resep gunakan <RECIPE> ... </RECIPE> JSON.
- Format cek stok gunakan <INVENTORY> ... </INVENTORY> JSON.
        `.trim();

        try {
            let responseText = "";

            if (aiProvider === 'openai') {
                if (!openaiKey) throw new Error("API Key OpenAI tidak ditemukan.");
                const openai = new OpenAI({ apiKey: openaiKey.trim(), dangerouslyAllowBrowser: true });
                const currentContent = [];
                if (currentInput) currentContent.push({ type: "text", text: currentInput });
                for (let imgObj of currentImages) {
                    const b64 = await fileToBase64(imgObj.file);
                    currentContent.push({ type: "image_url", image_url: { url: b64 } });
                }
                const response = await openai.chat.completions.create({
                    model: currentImages.length > 0 ? "gpt-4o" : "gpt-4o-mini",
                    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: currentContent }]
                });
                responseText = response.choices[0].message.content;
            } else {
                if (!apiKey) throw new Error("API Key Gemini tidak ditemukan.");
                const requestBody = {
                    contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + (currentInput || "Analisis gambar ini.") }] }]
                };
                for (let imgObj of currentImages) {
                    const b64 = await fileToBase64(imgObj.file);
                    const b64Parts = b64.split(',');
                    requestBody.contents[0].parts.push({ inlineData: { mimeType: b64Parts[0].match(/:(.*?);/)[1], data: b64Parts[1] } });
                }
                const modelToTry = currentImages.length > 0 ? "gemini-1.5-flash" : "gemini-2.0-flash";
                const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelToTry}:generateContent?key=${apiKey.trim()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
                const data = await res.json();
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal mendapatkan respon.";
            }

            const recipeRegex = /<RECIPE>([\s\S]*?)<\/RECIPE>/;
            const match = responseText.match(recipeRegex);
            const inventoryRegex = /<INVENTORY>([\s\S]*?)<\/INVENTORY>/;
            const invMatch = responseText.match(inventoryRegex);

            let parsedData = null;
            let invParsedData = null;
            let displayContent = responseText;

            if (match) {
                try {
                    parsedData = JSON.parse(match[1].trim());
                    displayContent = responseText.replace(recipeRegex, '').trim();
                } catch(e) { console.error(e); }
            } else if (invMatch) {
                try {
                    invParsedData = JSON.parse(invMatch[1].trim());
                    displayContent = responseText.replace(inventoryRegex, '').trim();
                } catch(e) { console.error(e); }
            }

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: displayContent,
                recipeData: parsedData,
                inventoryData: invParsedData
            }]);

        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ Error: ${error.message}` }]);
        } finally {
            setProcessing(false);
        }
    };

    const fileToBase64 = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    const removeImage = (index) => setImages(prev => prev.filter((_, i) => i !== index));

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        files.filter(f => f.type.startsWith('image/')).forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => setImages(prev => [...prev, { file, preview: reader.result }]);
            reader.readAsDataURL(file);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = (e) => {
        const items = Array.from(e.clipboardData.items || []);
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onloadend = () => setImages(prev => [...prev, { file, preview: reader.result }]);
                reader.readAsDataURL(file);
            }
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden relative">
            <header className="shrink-0 flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/30">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-200 leading-none">AI Studio Stokcer</h2>
                        <span className="text-xs text-indigo-400 flex items-center gap-1 mt-1">
                            Integrasi Bisnis Real-time
                        </span>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto mt-10">
                        <div className="w-20 h-20 rounded-3xl bg-slate-800/30 border border-slate-700/50 flex items-center justify-center mb-6 ring-4 ring-slate-900/50">
                            <BrainCircuit className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">Ada yang bisa Stokcer bantu?</h3>
                        <p className="text-slate-400 mt-3 text-sm">Tanyakan tentang modal, stok hari ini, atau upload foto resep/foto produk Anda.</p>
                        <div className="grid grid-cols-2 gap-2 mt-6 w-full">
                            <button onClick={() => setInputText("Laku berapa hari ini?")} className="p-2 bg-slate-800/50 rounded-lg text-[10px] text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Laku berapa hari ini?
                            </button>
                            <button onClick={() => setInputText("Berapa modal yang sudah terpakai?")} className="p-2 bg-slate-800/50 rounded-lg text-[10px] text-slate-400 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-2">
                                <Database className="w-3 h-3" /> Berapa modal terpakai?
                            </button>
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-700' : 'bg-indigo-600/20 border border-indigo-500/30'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
                            </div>
                            <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {msg.images && msg.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-end">
                                        {msg.images.map((img, i) => <img key={i} src={img} className="rounded-xl border border-slate-700 max-w-[150px]" />)}
                                    </div>
                                )}
                                <div className={`px-5 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-slate-800 text-slate-200' : 'text-slate-300 whitespace-pre-line'}`}>
                                    {msg.content}
                                </div>
                                {msg.recipeData && <RecipeBlock data={msg.recipeData} allIngredients={allIngredients} onAddIngredient={addIngredient} onNavigate={onNavigate} />}
                                {msg.inventoryData && <InventoryCheckBlock data={msg.inventoryData} allIngredients={allIngredients} onAddIngredient={addIngredient} onDeleteIngredient={deleteIngredient} />}
                            </div>
                        </div>
                    ))
                )}
                {processing && <div className="max-w-4xl mx-auto text-indigo-400 text-xs animate-pulse pl-12">Stokcer AI sedang menganalisis data bisnis Anda...</div>}
                <div ref={chatEndRef} />
            </div>

            <div className="shrink-0 max-w-4xl mx-auto w-full pb-4 px-2">
                <form onSubmit={handleSubmit} className="relative">
                    {images.length > 0 && (
                        <div className="flex gap-2 mb-2">
                            {images.map((img, i) => (
                                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                                    <img src={img.preview} className="w-full h-full object-cover" />
                                    <button onClick={() => removeImage(i)} className="absolute top-0 right-0 bg-black/50 text-white p-0.5"><X size={10} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-end bg-slate-900 border border-slate-700 rounded-2xl p-2 focus-within:border-indigo-500 transition-colors shadow-2xl">
                        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current.click()} className="text-slate-400 hover:text-white hover:bg-slate-800"><Plus /></Button>
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" multiple />
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onPaste={handlePaste}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                            placeholder="Tanya 'Laku berapa hari ini?'"
                            className="flex-1 bg-transparent border-none text-slate-200 placeholder:text-slate-500 focus:ring-0 resize-none min-h-[44px] outline-none px-2 text-sm py-2.5"
                        />
                        <Button type="submit" disabled={processing || (!inputText.trim() && images.length === 0)} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl h-10 w-10 p-0 shrink-0 shadow-lg shadow-indigo-900/40"><ArrowUp className="w-5 h-5" /></Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AIStudio;
