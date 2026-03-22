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
    ChevronRight,
    Camera,
    RefreshCw,
    Search,
    BrainCircuit,
    Wand2,
    Database,
    Table,
    FileJson
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

function AIStudio() {
    const { ownerId } = useAuth();
    const { toast } = useToast();
    const [aiProvider, setAiProvider] = useState('gemini');
    const [apiKey, setApiKey] = useState(''); // Gemini
    const [openaiKey, setOpenaiKey] = useState('');
    const [deepseekKey, setDeepseekKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [result, setResult] = useState(null);
    const [missingIngredients, setMissingIngredients] = useState([]);
    const [allIngredients, setAllIngredients] = useState([]);
    const [recipeData, setRecipeData] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (ownerId) {
            fetchSettings();
            fetchIngredients();
        }
    }, [ownerId]);

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
            const { data } = await supabase
                .from('ingredients') // Assuming 'ingredients' table exists for raw materials
                .select('*')
                .order('name', { ascending: true });
            setAllIngredients(data || []);
        } catch (error) {
            // If table doesn't exist, we'll handle it during processing
            console.error("Fetch ingredients error:", error);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
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

    const runAnalysis = async () => {
        if (!image) {
            toast({ title: "Gambar diperlukan", description: "Silakan upload foto resep parfum Anda.", variant: "destructive" });
            return;
        }

        setProcessing(true);
        try {
            const prompt = `
                Analyze this perfume composition image. 
                1. Extract the ingredients (Top Notes, Heart Notes, Base Notes).
                2. Extract the percentages for each ingredient.
                3. Return the result in a JSON format:
                {
                    "title": "Detected Recipe Name",
                    "components": [
                        { "name": "Ingredient Name", "percentage": 10, "type": "Top Note/Heart Note/Base Note" }
                    ]
                }
                Wait! Only return the JSON. No other text.
            `;

            let parsed = null;

            if (aiProvider === 'openai') {
                if (!openaiKey) throw new Error("API Key OpenAI tidak ditemukan. Silakan atur di menu Integrasi.");
                const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
                const base64Image = await fileToBase64(image);

                const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: base64Image } }
                            ]
                        }
                    ],
                    response_format: { type: "json_object" }
                });

                const content = response.choices[0].message.content;
                parsed = JSON.parse(content);
            } else if (aiProvider === 'deepseek') {
                if (!deepseekKey) throw new Error("API Key DeepSeek tidak ditemukan. Silakan atur di menu Integrasi.");
                toast({ 
                    title: "Vision Belum Didukung", 
                    description: "DeepSeek API saat ini belum secara native mendukung analisis gambar/foto. Silakan ganti ke Gemini atau OpenAI di pengaturan Integrasi AI.",
                    variant: "destructive" 
                });
                setProcessing(false);
                return;
            } else {
                // Gemini Fallback
                if (!apiKey) throw new Error("API Key Gemini tidak ditemukan. Silakan atur di menu Integrasi.");
                const genAI = new GoogleGenerativeAI(apiKey);
                
                const modelsToTry = [
                    "gemini-1.5-flash", 
                    "gemini-1.5-pro",
                    "gemini-1.5-flash-latest",
                    "gemini-1.0-pro-vision-latest",
                    "gemini-pro-vision"
                ];
                
                let result = null;
                let lastError = null;
                const imagePart = await fileToGenerativePart(image);

                for (const modelName of modelsToTry) {
                    try {
                        console.log("Trying Gemini model:", modelName);
                        const model = genAI.getGenerativeModel({ model: modelName });
                        result = await model.generateContent([prompt, imagePart]);
                        break; 
                    } catch (err) {
                        console.warn(`Model ${modelName} failed:`, err.message);
                        lastError = err;
                        if (!err.message.includes('404')) {
                            throw err; 
                        }
                    }
                }

                if (!result) {
                    try {
                        const diagRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                        const diagData = await diagRes.json();
                        const availableModels = diagData.models ? diagData.models.map(m => m.name.replace('models/', '')).join(', ') : 'Tidak ada model';
                        throw new Error(`[Diagnosis] API Key valid, tapi model tidak ditemukan. Model yang tersedia di API Key Anda: ${availableModels}. Error Asli: ${lastError?.message}`);
                    } catch (diagErr) {
                        throw lastError || new Error(`Failed to generate content: ${diagErr.message}`);
                    }
                }

                const responseText = result.response.text();
                const cleanJson = responseText.replace(/```json|```/g, '').trim();
                parsed = JSON.parse(cleanJson);
            }
            
            processRecipe(parsed);
        } catch (error) {
            console.error("AI Analysis Error:", error);
            toast({ title: "Gagal Analisis", description: error.message, variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const processRecipe = async (parsed) => {
        setRecipeData(parsed);
        const detectedIngredients = parsed.components.map(c => c.name);
        
        // Find missing ingredients
        const missing = detectedIngredients.filter(name => 
            !allIngredients.some(item => item.name.toLowerCase() === name.toLowerCase())
        );
        
        setMissingIngredients(missing.map(name => ({ name, category: 'Bibit' })));
        setResult(parsed);
    };

    const addIngredient = async (name, category) => {
        try {
            const { data, error } = await supabase
                .from('ingredients')
                .insert([{ 
                    user_id: ownerId, 
                    name, 
                    category,
                    stock: 0,
                    unit: 'ml'
                }])
                .select();

            if (error) throw error;

            toast({ title: "Berhasil", description: `${name} telah ditambahkan ke database.` });
            setMissingIngredients(prev => prev.filter(m => m.name !== name));
            setAllIngredients(prev => [...prev, ...data]);
        } catch (error) {
            toast({ title: "Gagal", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
                        <Sparkles className="w-8 h-8 text-indigo-400" />
                        AI Lab Cleith
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Pindai resep parfum dan biarkan AI Gemini mengelola bahan baku Anda.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300 gap-2">
                        <FileJson className="w-4 h-4" />
                        Histori Formula
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Upload & Process */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-slate-900/50 border-slate-800 border-dashed overflow-hidden group hover:border-indigo-500/50 transition-all">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-lg">Upload Resep</CardTitle>
                            <CardDescription>Pilih foto atau ambil gambar resep formulasi</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="relative aspect-[3/4] rounded-2xl border-4 border-slate-800/50 flex flex-col items-center justify-center bg-slate-950/50 cursor-pointer overflow-hidden group-hover:bg-slate-900/50 transition-colors"
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-500">
                                        <div className="w-16 h-16 rounded-full bg-slate-800/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Camera className="w-8 h-8" />
                                        </div>
                                        <p className="text-sm font-medium">Klik untuk upload foto</p>
                                        <p className="text-xs mt-1 opacity-50">Saran: Background gelap & teks terbaca</p>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    className="hidden" 
                                    accept="image/*"
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                onClick={runAnalysis}
                                disabled={processing || !image}
                                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/20"
                            >
                                {processing ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Menganalisis...
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuit className="w-4 h-4 mr-2" />
                                        Analisis Sekarang
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="bg-indigo-600/5 border-indigo-500/20">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Informasi Sistem</span>
                            </div>
                        </CardHeader>
                        <CardContent className="text-[11px] text-slate-400 space-y-2">
                            <p>1. Rekomendasi model: <strong>Gemini 1.5 Flash</strong> (Cepat & Akurat).</p>
                            <p>2. AI akan mengecek ketersediaan bahan di database secara otomatis.</p>
                            <p>3. Jika bahan belum ada, Anda bisa langsung menginputnya dari sini.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Results & Mapping */}
                <div className="lg:col-span-8 space-y-6">
                    {result ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            {/* Missing Ingredients Warning */}
                            {missingIngredients.length > 0 && (
                                <Card className="border-amber-500/30 bg-amber-500/5 backdrop-blur-sm overflow-hidden border-2">
                                    <div className="bg-amber-500/10 px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                                            <h3 className="text-sm font-bold text-amber-500">Bahan Belum Ada di Stokcer</h3>
                                        </div>
                                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                            {missingIngredients.length} Bahan Baru
                                        </Badge>
                                    </div>
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-amber-500/10">
                                            {missingIngredients.map((ing, idx) => (
                                                <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50">
                                                    <div>
                                                        <p className="font-bold text-slate-200">{ing.name}</p>
                                                        <p className="text-[10px] text-slate-500">Dideteksi dari resep sebagai bahan baru</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Select 
                                                            value={ing.category}
                                                            onValueChange={(val) => {
                                                                setMissingIngredients(prev => prev.map(m => m.name === ing.name ? { ...m, category: val } : m));
                                                            }}
                                                        >
                                                            <SelectTrigger className="w-[140px] bg-slate-950 border-slate-800 text-xs h-9">
                                                                <SelectValue placeholder="Pilih Kategori" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-slate-950 border-slate-800 text-white">
                                                                <SelectItem value="Bibit">Bibit</SelectItem>
                                                                <SelectItem value="Pelarut">Pelarut</SelectItem>
                                                                <SelectItem value="Material sintetik">Material sintetik</SelectItem>
                                                                <SelectItem value="Material tambahan">Material tambahan</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button 
                                                            size="sm"
                                                            className="bg-amber-600 hover:bg-amber-700 h-9"
                                                            onClick={() => addIngredient(ing.name, ing.category)}
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" />
                                                            Tambah
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Formula Recap */}
                            <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
                                <CardHeader className="border-b border-slate-800 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20">
                                                <FlaskConical className="w-6 h-6 text-indigo-400" />
                                            </div>
                                            <div>
                                                <CardTitle>{result.title}</CardTitle>
                                                <CardDescription>Draft Formula yang dideteksi oleh AI</CardDescription>
                                            </div>
                                        </div>
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                                            <Check className="w-4 h-4" />
                                            Simpan Sebagai Formula
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[400px]">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-950 text-slate-500 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Bahan Baku</th>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Persentase</th>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Tipe Note</th>
                                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {result.components.map((comp, idx) => {
                                                    const exists = allIngredients.some(i => i.name.toLowerCase() === comp.name.toLowerCase());
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-6 py-4 font-medium text-slate-200">{comp.name}</td>
                                                            <td className="px-6 py-4">
                                                                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                                                    {comp.percentage}%
                                                                </Badge>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-[10px] text-slate-500">{comp.type}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {exists ? (
                                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                                                        <Check className="w-3 h-3 mr-1" /> Ready
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">
                                                                         Missing
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                            <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-6">
                                <Wand2 className="w-10 h-10 text-slate-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-400">Belum Ada Analisis</h3>
                            <p className="text-slate-500 max-w-sm mt-2">
                                Upload foto resep parfum Anda di kolom kiri untuk mulai proses otomatisasi bahan baku dan formula.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AIStudio;
