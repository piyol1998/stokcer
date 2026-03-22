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
    Trash2
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
                                // Enrich data with current matches from DB
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
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Note</th>
                                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {data.components.map((comp, idx) => {
                                    const matchedItem = allIngredients.find(i => i.name.toLowerCase().trim() === comp.name.toLowerCase().trim());
                                    const exists = !!matchedItem;
                                    const category = matchedItem ? matchedItem.category : '-';
                                    return (
                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-200">{comp.name}</td>
                                            <td className="px-4 py-3 text-indigo-400">{comp.percentage}%</td>
                                            <td className="px-4 py-3 text-slate-400 text-[10px] uppercase font-semibold tracking-wider">{category}</td>
                                            <td className="px-4 py-3 text-slate-500">{comp.type}</td>
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
                                    <div>
                                        <p className="font-bold text-slate-200 text-sm">{item.name}</p>
                                        {item.quantity !== undefined && (
                                            <p className="text-xs text-slate-500">Kuantitas deteksi: {item.quantity} {item.unit}</p>
                                        )}
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
                                                <SelectItem value="Botol">Botol</SelectItem>
                                                <SelectItem value="Box">Box</SelectItem>
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
                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Status Stokcer</th>
                                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Link</th>
                                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {existingItems.map((item, idx) => {
                                        const dbItem = allIngredients.find(i => i.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                                        return (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-200">{dbItem?.name || item.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                                                        {dbItem?.category || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] h-5">
                                                        <Check className="w-2 h-2 mr-1" /> Tersedia ({dbItem?.quantity || 0} {dbItem?.unit})
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {dbItem?.purchase_link ? (
                                                        <a 
                                                            href={dbItem.purchase_link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-400 hover:text-indigo-300 underline font-bold"
                                                        >
                                                            Beli
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
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
    const [apiKey, setApiKey] = useState(''); // Gemini
    const [openaiKey, setOpenaiKey] = useState('');
    const [deepseekKey, setDeepseekKey] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    
    // Content States
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [images, setImages] = useState([]); // Array of { file, preview }
    
    const [allIngredients, setAllIngredients] = useState([]);
    const [dbStocks, setDbStocks] = useState([]);
    
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (ownerId) {
            fetchSettings();
            fetchIngredients();
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

    const fetchIngredients = async () => {
        try {
            const [ingRes, stockRes] = await Promise.all([
                supabase.from('raw_materials').select('id, name, category, quantity, unit, purchase_link').eq('user_id', ownerId).is('deleted_at', null).order('name', { ascending: true }),
                supabase.from('stocks').select('name, quantity, status').eq('user_id', ownerId).order('name', { ascending: true })
            ]);
            setAllIngredients(ingRes.data || []);
            setDbStocks(stockRes.data || []);
        } catch (error) {
            console.error("Fetch DB context error:", error);
        }
    };

    const addFiles = (files) => {
        const validFiles = files.filter(f => f && f.type.startsWith('image/'));
        if (!validFiles.length) return;
        
        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, { file, preview: reader.result }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        addFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = (e) => {
        const items = Array.from(e.clipboardData.items || []);
        const files = [];
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                files.push(item.getAsFile());
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            addFiles(files);
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const fileToBase64 = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    const fileToGenerativePart = async (file) => {
        const base64EncodedDataPromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
        };
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
You are Stokcer AI, an advanced AI business assistant for users of the "Stokcer" platform. You help the user manage their business inventory, define production recipes, and analyze elements. Use a professional, highly intelligent, and friendly Indonesian language.

Here is the real-time actual database context of THIS SPECIFIC USER's business that you are currently analyzing:
<DATA_PRODUK_JADI>
${dbStocks.length > 0 ? dbStocks.map(s => `- ${s.name}: ${s.quantity} botol (Status: ${s.status || 'Ready'})`).join('\n') : "Belum ada produk jadi."}
</DATA_PRODUK_JADI>

<DATA_BAHAN_BAKU>
${allIngredients.length > 0 ? allIngredients.map(i => `- ${i.name} [${i.category}]: ${i.quantity || 0} ${i.unit || 'ml'}`).join('\n') : "Belum ada bahan baku."}
</DATA_BAHAN_BAKU>

ATURAN PENTING (CRITICAL):
- Jika pengguna bertanya tentang data stok, produk, atau bahan baku, gunakan data di atas untuk menjawab dengan akurat.
- If the user uploads an image of a perfume formulation, or explicitly asks you to parse a recipe, you MUST detect all the components.
- STRICT VOCABULARY MAPPING: When extracting the "name" of an ingredient for the JSON block, YOU MUST STRICTLY MATCH the name with one of the exact names from <DATA_BAHAN_BAKU> if it refers to the same material! For example, if the user's recipe says "Bergamot accord" or "Bergamot (citrus)", but the database only has "Bergamot", you MUST use EXACTLY "Bergamot" as the name in your JSON. Only use new names if the ingredient completely missing from the database.
IMPORTANT: When you detect a recipe or formulation, you MUST format the recipe as a structured JSON block inside <RECIPE> tags like this:
<RECIPE>
{
    "title": "Detected Recipe Name",
    "components": [
        { "name": "Ingredient Name", "percentage": 10, "type": "Top Note" },
        { "name": "Another Ingredient", "percentage": 90, "type": "Base Note" }
    ]
}
</RECIPE>

IMPORTANT: Jika pengguna meminta untuk menambah, mengecek ketersediaan, mendata bahan baku (BUKAN RESEP), atau mensinkronisasi stok (baik melalui ketikan teks seperti "tambahkan bahan plum", "cek bahan X", maupun dengan mengunggah gambar), Anda WAJIB memformatnya sebagai blok JSON terstruktur di dalam tag <INVENTORY> seperti ini:
<INVENTORY>
{
    "title": "Pengecekan Stok & Bahan",
    "items": [
        { "name": "Nama Bahan", "quantity": 0, "unit": "ml" }
    ]
}
</INVENTORY>

MANDATORY INSTRUCTION (SANGAT PENTING): 
Baik dari input teks maupun gambar, JIKA berhubungan dengan DAFTAR BAHAN atau CEK INVENTARIS, JANGAN PERNAH membuat daftar markdown biasa! SELALU gunakan blok <INVENTORY> XML di atas agar sistem bisa merender widget UI secara interaktif! Jika Anda membuat teks biasa (markdown), sistem tidak akan bisa mendeteksinya dan pengguna tidak akan bisa menekan tombol input UI.

Jika pertanyaan pengguna benar-benar BUKAN tentang mendata/menambah/mengecek bahan maupun mendeteksi resep (contoh: "halo", "apa itu stokcer?", "bagaimana cara..."), barulah balas dengan teks markdown biasa.
Do not use markdown inside the <RECIPE> or <INVENTORY> block tags.
        `.trim();

        try {
            let responseText = "";

            if (aiProvider === 'openai') {
                if (!openaiKey) throw new Error("API Key OpenAI tidak ditemukan. Silakan atur di menu Integrasi.");
                const cleanKey = openaiKey.trim();
                const openai = new OpenAI({ apiKey: cleanKey, dangerouslyAllowBrowser: true });
                
                const messagesPayload = [
                    { role: 'system', content: systemPrompt }
                ];
                
                // Add short history context
                messages.slice(-4).forEach(m => {
                    messagesPayload.push({
                        role: m.role,
                        content: m.content || "Uploaded an image."
                    });
                });

                // Add current message
                const currentContent = [];
                if (currentInput) currentContent.push({ type: "text", text: currentInput });
                
                for (let imgObj of currentImages) {
                    const b64 = await fileToBase64(imgObj.file);
                    currentContent.push({ type: "image_url", image_url: { url: b64 } });
                }

                if (currentContent.length === 0) currentContent.push({ type: "text", text: "Please process these images." });

                messagesPayload.push({
                    role: 'user',
                    content: currentContent
                });

                const response = await openai.chat.completions.create({
                    model: currentImages.length > 0 ? "gpt-4o" : "gpt-4o-mini",
                    messages: messagesPayload
                });

                responseText = response.choices[0].message.content;

            } else if (aiProvider === 'deepseek') {
                if (!deepseekKey) throw new Error("API Key DeepSeek tidak ditemukan. Silakan atur di menu Integrasi.");
                if (currentImages.length > 0) {
                    throw new Error("DeepSeek belum mendukung upload gambar (Vision). Silakan gunakan Gemini atau OpenAI, atau hapus gambar dan ketik pesan.");
                }
                
                const cleanKey = deepseekKey.trim();
                const openai = new OpenAI({ apiKey: cleanKey, baseURL: 'https://api.deepseek.com', dangerouslyAllowBrowser: true });
                
                const messagesPayload = [
                    { role: 'system', content: systemPrompt }
                ];
                
                messages.slice(-4).forEach(m => {
                    messagesPayload.push({
                        role: m.role,
                        content: m.content || ""
                    });
                });

                messagesPayload.push({
                    role: 'user',
                    content: currentInput || "Hello"
                });

                const response = await openai.chat.completions.create({
                    model: "deepseek-chat",
                    messages: messagesPayload
                });

                responseText = response.choices[0].message.content;

            } else {
                // Gemini Fallback via Native Fetch (Bypassing v1beta SDK 404 Bugs)
                if (!apiKey) throw new Error("API Key Gemini tidak ditemukan. Silakan atur di menu Integrasi.");
                
                const cleanKey = apiKey.trim();
                
                const requestBody = {
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: systemPrompt + "\n\n" + (currentInput || "Tolong analisa gambar berikut.") }
                            ]
                        }
                    ]
                };

                for (let imgObj of currentImages) {
                    const base64Data = await fileToBase64(imgObj.file);
                    const b64Parts = base64Data.split(',');
                    const mimeType = b64Parts[0].match(/:(.*?);/)[1];
                    const data = b64Parts[1];
                    
                    requestBody.contents[0].parts.push({
                        inlineData: { mimeType, data }
                    });
                }

                const apiModelsToTry = currentImages.length > 0
                    ? ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
                    : ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"];

                let finalResponse = null;
                let lastFetchError = null;

                for (const modelId of apiModelsToTry) {
                    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${cleanKey}`;
                    
                    try {
                        const tmpResponse = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestBody)
                        });

                        if (tmpResponse.ok) {
                            finalResponse = tmpResponse;
                            break; 
                        } else if (tmpResponse.status === 404) {
                            lastFetchError = new Error(`Model ${modelId} 404`);
                            continue; // Skip and try the next legacy/newer model
                        } else {
                            const errorJson = await tmpResponse.json().catch(() => ({}));
                            throw new Error(`Google API: ${errorJson.error?.message || tmpResponse.statusText} (${tmpResponse.status})`);
                        }
                    } catch (e) {
                        lastFetchError = e;
                        if (!e.message.includes('404')) throw e; // Break loop on 400, 403, CORS
                    }
                }

                if (!finalResponse) {
                    throw lastFetchError || new Error(`Seluruh generasi model Gemini tidak dikenali (404 Error). Pastikan Akun Anda mendukung API ini.`);
                }

                const data = await finalResponse.json();
                responseText = data.candidates[0]?.content?.parts[0]?.text || "Gagal mendapatkan respon (Kosong).";
            }

            // Parse response for <RECIPE> tag
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
                } catch(e) {
                    console.error("Failed to parse recipe json", e);
                }
            } else if (invMatch) {
                try {
                    invParsedData = JSON.parse(invMatch[1].trim());
                    displayContent = responseText.replace(inventoryRegex, '').trim();
                } catch(e) {
                    console.error("Failed to parse inventory json", e);
                }
            }

            const assistantMsg = {
                id: Date.now().toString(),
                role: 'assistant',
                content: displayContent || "Berikut adalah hasil analisis resep atau bahan yang terdeteksi.",
                recipeData: parsedData,
                inventoryData: invParsedData
            };

            setMessages(prev => [...prev, assistantMsg]);

        } catch (error) {
            console.error("AI Analysis Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `⚠️ Error: ${error.message}`
            }]);
            toast({ title: "Gagal Analisis", description: error.message, variant: "destructive" });
        } finally {
            setProcessing(false);
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
                            {aiProvider === 'gemini' ? 'Google Gemini Engine' : aiProvider === 'openai' ? 'OpenAI GPT-4o' : 'DeepSeek Engine'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto mt-10">
                        <div className="w-20 h-20 rounded-3xl bg-slate-800/30 border border-slate-700/50 flex items-center justify-center mb-6 ring-4 ring-slate-900/50">
                            <BrainCircuit className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">Apa yang bisa Stokcer bantu?</h3>
                        <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                            Ketik pesan Anda atau upload foto resep. 
                            AI akan secara cerdas memproses data tersebut berdasarkan informasi dari gudang maupun inventaris rak khusus Anda tanpa bocor kemana-mana.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {/* Avatar */}
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-700' : 'bg-indigo-600/20 border border-indigo-500/30'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
                            </div>

                            {/* Bubble */}
                            <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                
                                {msg.images && msg.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-end">
                                        {msg.images.map((imgPreview, idx) => (
                                            <div key={idx} className="rounded-xl overflow-hidden border-2 border-slate-700 max-w-[200px] shrink-0">
                                                <img src={imgPreview} alt="Uploaded" className="w-full h-auto object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {msg.content && (
                                    <div className={`px-5 py-3 rounded-2xl text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-slate-800 text-slate-200 rounded-tr-sm' 
                                            : msg.role === 'assistant' && msg.content.startsWith('⚠️') 
                                                ? 'bg-red-500/10 text-red-400 rounded-tl-sm border border-red-500/20'
                                                : 'bg-transparent text-slate-300 p-0 leading-relaxed max-w-2xl whitespace-pre-line' 
                                    }`}>
                                        {msg.content}
                                    </div>
                                )}

                                {msg.recipeData && (
                                    <RecipeBlock 
                                        data={msg.recipeData} 
                                        allIngredients={allIngredients} 
                                        onAddIngredient={addIngredient} 
                                        onNavigate={onNavigate}
                                    />
                                )}

                                {msg.inventoryData && (
                                    <InventoryCheckBlock 
                                        data={msg.inventoryData} 
                                        allIngredients={allIngredients} 
                                        onAddIngredient={addIngredient} 
                                        onDeleteIngredient={deleteIngredient}
                                    />
                                )}
                            </div>
                        </div>
                    ))
                )}
                
                {processing && (
                    <div className="flex gap-4 max-w-4xl mx-auto flex-row">
                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600/20 border border-indigo-500/30">
                            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                        </div>
                        <div className="flex items-center bg-transparent px-5 py-3 h-11">
                            <span className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '0ms'}} />
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '150ms'}} />
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{animationDelay: '300ms'}} />
                            </span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0 max-w-4xl mx-auto w-full pb-4 px-2">
                <form onSubmit={handleSubmit} className="relative mt-2">
                    
                    {/* Image Previews attachment */}
                    {images.length > 0 && (
                        <div className="absolute -top-[100px] left-2 right-2 flex gap-3 overflow-x-auto pb-4 pt-2 z-10 custom-scrollbar pointer-events-auto">
                            {images.map((imgObj, idx) => (
                                <div key={idx} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
                                    <img src={imgObj.preview} className="w-full h-full object-cover" alt="Preview" />
                                    <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-black/80 rounded-full flex items-center justify-center text-white hover:bg-black hover:text-red-400 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end bg-slate-900/80 border border-slate-700 focus-within:border-slate-500 rounded-3xl p-2 shadow-sm transition-all shadow-black/20">
                        
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            className="hidden" 
                            accept="image/*"
                            multiple
                        />
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full w-10 h-10 text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" sideOffset={8} className="bg-slate-900 border-slate-800 text-slate-300 w-48 shadow-2xl rounded-xl">
                                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="py-2.5 px-3 focus:bg-slate-800 focus:text-slate-100 cursor-pointer rounded-lg">
                                    <ImagePlus className="w-4 h-4 mr-3" />
                                    Upload Gambar/Foto
                                </DropdownMenuItem>
                                <DropdownMenuItem className="py-2.5 px-3 focus:bg-slate-800 focus:text-slate-100 cursor-pointer rounded-lg">
                                    <FileText className="w-4 h-4 mr-3" />
                                    Upload File Teks/PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onPaste={handlePaste}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            placeholder="Tanya Chat AI, paste gambar langsung (Ctrl+V), atau ketik pesan..."
                            className="flex-1 bg-transparent border-none text-slate-200 placeholder:text-slate-500 focus:ring-0 resize-none min-h-[44px] max-h-[150px] overflow-y-auto px-3 py-3 text-[15px] outline-none"
                            style={{ height: '44px', fieldSizing: "content" }}
                        />

                        <Button 
                            type="submit" 
                            disabled={processing || (!inputText.trim() && images.length === 0)}
                            size="icon" 
                            className={`shrink-0 rounded-full w-10 h-10 mb-0.5 mr-0.5 transition-colors ${inputText.trim() || images.length > 0 ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md' : 'bg-slate-800 text-slate-500'}`}
                        >
                            <ArrowUp className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    <div className="text-center mt-3">
                        <p className="text-[10px] text-slate-500">
                            Stokcer AI dapat melakukan kesalahan. Pastikan untuk selalu memverifikasi ulang data analisis.
                        </p>
                    </div>
                </form>
            </div>
            
        </div>
    );
}

export default AIStudio;
