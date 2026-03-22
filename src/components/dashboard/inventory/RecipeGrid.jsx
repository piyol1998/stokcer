import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { BookOpen, Plus, Trash2, Edit2, FlaskConical, Component, Leaf, Info, Calculator, Wand2, RefreshCw, Beaker, FileSpreadsheet, ChevronDown, Search, Check, ChevronsUpDown, ImagePlus, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { logNotification } from '@/lib/notificationUtils';
import { getRecipeColor } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// --- Smart Matching Utilities (Sync with AIStudio) ---
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
    const n1 = (name1 || '').toLowerCase().trim();
    const n2 = (name2 || '').toLowerCase().trim();
    if (n1 === n2) return true;
    
    // Clean names from brand variations like (IFF), (Giv)
    const cleanN1 = n1.replace(/\s*\(.*\)\s*/g, '').trim();
    const cleanN2 = n2.replace(/\s*\(.*\)\s*/g, '').trim();
    if (cleanN1 === cleanN2) return true;

    // Direct synonym Check
    for (const [key, aliases] of Object.entries(SYNONYMS)) {
        const isN1Match = n1.includes(key) || aliases.some(a => n1.includes(a));
        const isN2Match = n2.includes(key) || aliases.some(a => n2.includes(a));
        if (isN1Match && isN2Match) return true;
    }
    
    return false;
};

// --- Customized View for Recipe A (Wizard Type) ---
const RecipeAWizardView = ({ recipe, allMaterials, colorTheme }) => {
    const meta = recipe.metadata || {};
    // Migration check: if no sections, use the old fields to render
    const sections = meta.sections || [
        { name: 'Bibit', percent: meta.bibitPercent || 0, materials: meta.bibitMaterials || [], type: 'multi' },
        { name: 'Fixative', percent: meta.fixativePercent || 0, materialId: meta.fixativeId || '', type: 'single' },
        { name: 'Alkohol', percent: meta.alcoholPercent || 0, materialId: meta.alcoholId || '', type: 'single' }
    ].filter(s => s.percent > 0 || (s.type === 'multi' && s.materials.length > 0) || (s.type === 'single' && s.materialId));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-1 text-sm">
                {sections.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-700/30">
                        <span className="text-slate-400 text-xs uppercase font-bold tracking-tight">{s.name}</span>
                        <span className={`font-bold ${colorTheme.text}`}>{s.percent}%</span>
                    </div>
                ))}
            </div>

            {sections.filter(s => s.type === 'multi').map((s, sIdx) => (
                <div key={sIdx} className={`rounded-lg p-3 border border-slate-700/50 bg-slate-900/50`}>
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Komposisi {s.name}</h4>
                    <div className="space-y-1.5">
                        {s.materials.map((mat, idx) => {
                            const material = allMaterials.find(m => m.id === mat.id);
                            const materialName = material?.name || 'Unknown Oil';
                            const isDeleted = material?.deleted_at;
                            return (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className={`text-slate-300 ${isDeleted ? 'line-through text-red-400 opacity-70' : ''}`}>
                                        {materialName}
                                    </span>
                                    <span className="text-slate-400 tabular-nums">{mat.percent_share}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {meta.additionalMaterials && meta.additionalMaterials.length > 0 && (
                <div className={`mt-3 rounded-lg p-3 border border-slate-700/50 bg-slate-900/50`}>
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Bahan Tambahan</h4>
                    <div className="space-y-1">
                        {meta.additionalMaterials.map((mat, idx) => {
                            const material = allMaterials.find(m => m.id === mat.id);
                            const materialName = material?.name || 'Unknown Material';
                            const isDeleted = material?.deleted_at;

                            return (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className={`text-slate-300 font-medium ${isDeleted ? 'line-through text-red-400 opacity-70' : ''}`}>
                                        {materialName} {isDeleted && '(Deleted)'}
                                    </span>
                                    <span className="text-slate-400">{mat.quantity} qty</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Recursive Tree Component for View Mode (Recipe B / Legacy) ---
const RecipeCompositionView = ({ ingredients, allRecipes, allMaterials, totalQty, colorTheme }) => {
    if (!ingredients || ingredients.length === 0) return <p className="text-slate-500 text-xs italic">Belum ada komposisi</p>;

    return (
        <div className="space-y-1">
            {ingredients.map((ing, idx) => {
                const isRecipe = !!ing.ingredient_recipe_id;
                const itemData = isRecipe
                    ? allRecipes.find(r => r.id === ing.ingredient_recipe_id)
                    : allMaterials.find(m => m.id === ing.material_id);

                const name = itemData?.name || 'Unknown Item';
                const isDeleted = !isRecipe && itemData?.deleted_at;
                const percentage = totalQty > 0 ? ((ing.quantity / totalQty) * 100) : 0;

                const subIngredients = isRecipe && itemData ? itemData.recipe_ingredients : [];
                const subTotalQty = subIngredients?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1;

                return (
                    <div key={idx} className="relative group">
                        <div className="flex items-center justify-between text-sm py-2 border-b border-slate-700/30">
                            <div className="flex items-center gap-2">
                                {isRecipe && <Component className={`w-3 h-3 ${colorTheme.text}`} />}
                                {!isRecipe && <Leaf className="w-3 h-3 text-slate-500" />}
                                <span className={`text-sm font-medium ${isRecipe ? colorTheme.text : 'text-slate-300'} ${isDeleted ? 'line-through text-red-400 opacity-70' : ''}`}>
                                    {name} {isDeleted && '(Deleted)'}
                                </span>
                            </div>
                            <div className="font-bold text-slate-400 text-xs tabular-nums">
                                {percentage.toFixed(0)}%
                            </div>
                        </div>

                        {isRecipe && subIngredients.length > 0 && (
                            <div className="mt-1 mb-2 ml-4 p-3 bg-[#0f172a]/80 rounded-lg border border-slate-700/50 relative">
                                <div className="absolute -left-4 top-4 w-4 h-[1px] bg-slate-700/50"></div>
                                <div className="absolute -left-4 top-0 h-4 w-[1px] bg-slate-700/50"></div>

                                <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-700/50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Komposisi {name}</p>
                                </div>

                                <div className="space-y-1.5">
                                    {subIngredients.map((sub, sIdx) => {
                                        const subItem = sub.ingredient_recipe_id
                                            ? allRecipes.find(r => r.id === sub.ingredient_recipe_id)
                                            : allMaterials.find(m => m.id === sub.material_id);

                                        const isSubDeleted = !sub.ingredient_recipe_id && subItem?.deleted_at;
                                        const localPct = subTotalQty > 0 ? ((sub.quantity / subTotalQty) * 100) : 0;

                                        return (
                                            <div key={sIdx} className="flex justify-between text-xs items-center group/sub">
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                                                    <span className={`${isSubDeleted ? 'line-through text-red-400 opacity-70' : ''}`}>
                                                        {subItem?.name || 'Unknown'} {isSubDeleted && '(Deleted)'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-slate-300 font-medium tabular-nums">{localPct.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- Custom Searchable Select Component ---
const SearchableSelect = ({ options, value, onChange, placeholder = "Pilih...", className = "", fallbackLabel = "" }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = React.useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => String(opt.value) === String(value));
    // Display name: use matched option label, or fallbackLabel for items not in filtered options
    const displayLabel = selectedOption?.label || (value && fallbackLabel) || null;
    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className={`relative flex-1 ${className}`} ref={wrapperRef}>
            <button
                type="button"
                className="w-full flex items-center justify-between h-8 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left shadow-sm group transition-all"
                onClick={() => { setOpen(!open); setSearch(''); }}
            >
                <div className="flex items-center flex-1 min-w-0 pr-2">
                    <Search className="w-3.5 h-3.5 text-indigo-400/70 mr-2 shrink-0 group-hover:text-indigo-400 transition-colors" />
                    <span className={`truncate text-xs ${displayLabel ? 'text-slate-200' : 'text-slate-500'}`}>
                        {displayLabel || placeholder}
                    </span>
                </div>
                <ChevronsUpDown className="w-3 h-3 text-slate-500 opacity-50 shrink-0" />
            </button>

            {open && (
                <div className="absolute z-[9999] top-full left-0 w-[240px] mt-1 bg-slate-900 border border-slate-700 rounded-md shadow-xl overflow-hidden flex flex-col">
                    <div className="flex items-center px-2 border-b border-slate-800 bg-slate-950">
                        <Search className="w-3.5 h-3.5 text-indigo-400 mr-2 shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Ketik untuk mencari bahan..."
                            className="flex-1 bg-transparent border-none h-8 text-xs text-slate-200 outline-none focus:ring-0 placeholder-slate-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-indigo-600 hover:text-white transition-colors ${String(value) === String(opt.value) ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-300'}`}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {String(value) === String(opt.value) && <Check className="w-3 h-3 shrink-0 ml-2" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-3 text-xs text-slate-500 text-center">Tidak ditemukan.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
function RecipeGrid({ onUpdate }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [recipes, setRecipes] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [activeTab, setActiveTab] = useState("manual");

    // Photo State
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
    const fileInputRef = useRef(null);

    // Form State
    const [generalInfo, setGeneralInfo] = useState({
        name: '',
        description: '',
    });

    const [manualIngredients, setManualIngredients] = useState([]);

    const [wizardData, setWizardData] = useState({
        sections: [
            { id: 'sec-1', name: 'Bibit', percent: 40, type: 'multi', materials: [{ id: '', percent_share: 100 }] },
            { id: 'sec-2', name: 'Fixative', percent: 4, type: 'single', materialId: '' },
            { id: 'sec-3', name: 'Alkohol', percent: 56, type: 'single', materialId: '' }
        ],
        additionalMaterials: []
    });

    const [sectionSearchTerms, setSectionSearchTerms] = useState({});

    const availableCategories = React.useMemo(() => {
        // Collect all categories preserving original case, deduplicate case-insensitively
        const seen = new Map();
        rawMaterials.forEach(m => {
            const cat = (m.category || '').trim();
            if (cat && !seen.has(cat.toUpperCase())) {
                seen.set(cat.toUpperCase(), cat);
            }
        });
        const cats = [...seen.values()];

        // Priority for standard categories (case-insensitive matching)
        const priority = ['BIBIT', 'ALKOHOL', 'FIXATIVE', 'BOTOL', 'BOX'];
        return cats.sort((a, b) => {
            const indexA = priority.indexOf(a.toUpperCase());
            const indexB = priority.indexOf(b.toUpperCase());
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [rawMaterials]);

    useEffect(() => {
        if (user) {
            fetchData().then((fetchedMaterials) => {
                const pendingAiRecipe = sessionStorage.getItem('pendingAiRecipe');
                if (pendingAiRecipe) {
                    sessionStorage.removeItem('pendingAiRecipe');
                    try {
                        const aiData = JSON.parse(pendingAiRecipe);
                        handleOpenDialog(null);

                        setGeneralInfo({ name: aiData.title || '', description: 'Hasil deteksi AI Studio Stokcer' });
                        
                        // Pass 1: Match all components against DB
                        const matchedComponents = (aiData.components || []).map(comp => {
                            const aiName = (comp.name || '').trim();
                            
                            // 1. Try exact ID if provided by AI Studio
                            let match = null;
                            const providedId = comp.materialId || comp.matchedId;
                            if (providedId) {
                                match = (fetchedMaterials || []).find(m => m.id === providedId);
                            }
                            
                            // 2. Fallback to Smart matching (isSimilar)
                            if (!match) {
                                match = (fetchedMaterials || []).find(m => isSimilar(m.name, aiName));
                            }
                            
                            return { comp, match };
                        });

                        // Pass 2: Group components BY THEIR ACTUAL CATEGORY
                        const categoryGroups = {};
                        const categoryDisplayNames = {};
                        
                        matchedComponents.forEach(({ comp, match }) => {
                            // PRIORITY: Database Category > AI Suggested Category > Fallback
                            const finalCategory = match ? match.category : (comp.category || comp.matchedCategory || 'Material sintetik');
                            const categoryKey = finalCategory.toUpperCase().trim();
                            
                            if (!categoryGroups[categoryKey]) {
                                categoryGroups[categoryKey] = [];
                                categoryDisplayNames[categoryKey] = finalCategory;
                            }
                            
                            categoryGroups[categoryKey].push({
                                id: match ? match.id : '',
                                percent_share: comp.percentage || 0,
                                name: match ? match.name : comp.name 
                            });
                        });

                        // Pass 3: Convert Groups to Wizard Sections
                        const sections = Object.entries(categoryGroups).map(([catKey, items], idx) => {
                            const catName = categoryDisplayNames[catKey];
                            const sectionTotalPercent = items.reduce((sum, item) => sum + (parseFloat(item.percent_share) || 0), 0);
                            
                            // Decide type: Section with multiple items is 'multi', otherwise check if it's naturally a multi-group (like Bibit)
                            const isMulti = items.length > 1 || catName.toLowerCase().includes('bibit') || catName.toLowerCase().includes('material sintetik');
                            
                            if (isMulti) {
                                return {
                                    id: `sec-ai-${idx}-${Date.now()}`,
                                    name: catName,
                                    percent: Math.round(sectionTotalPercent * 100) / 100,
                                    type: 'multi',
                                    materials: items.map(item => ({
                                        id: item.id,
                                        // Calculate share inside the section
                                        percent_share: sectionTotalPercent > 0 
                                            ? Math.round((item.percent_share / sectionTotalPercent) * 100 * 100) / 100 
                                            : 0
                                    }))
                                };
                            } else {
                                return {
                                    id: `sec-ai-${idx}-${Date.now()}`,
                                    name: catName,
                                    percent: Math.round(sectionTotalPercent * 100) / 100,
                                    type: 'single',
                                    materialId: items[0]?.id || '',
                                    materials: []
                                };
                            }
                        });

                        setWizardData({
                            sections: sections.sort((a, b) => b.percent - a.percent),
                            additionalMaterials: []
                        });
                        setActiveTab("wizard");
                    } catch(e) { console.error('AI load error', e); }
                }
            });
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: materials, error: matError } = await supabase.from('raw_materials').select('*').order('name');
            if (matError) throw matError;
            setRawMaterials(materials || []);

            const { data: recipeData, error: recipeError } = await supabase
                .from('recipes')
                .select(`
            *,
            recipe_ingredients!recipe_id (
                id,
                quantity,
                material_id,
                ingredient_recipe_id
            )
        `)
                .order('created_at');

            if (recipeError) throw recipeError;
            setRecipes(recipeData || []);

            return materials || [];
        } catch (error) {
            console.error("Fetch Error:", error);
            toast({ title: "Error", description: "Gagal memuat data resep", variant: "destructive" });
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Photo handlers
    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Error", description: "Ukuran file maksimal 5MB", variant: "destructive" });
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast({ title: "Error", description: "File harus berformat gambar (JPG, PNG, WebP)", variant: "destructive" });
            return;
        }
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setPhotoPreview(e.target.result);
        reader.readAsDataURL(file);
    };

    const handlePhotoDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: "Error", description: "Ukuran file maksimal 5MB", variant: "destructive" });
            return;
        }
        if (!file.type.startsWith('image/')) {
            toast({ title: "Error", description: "File harus berformat gambar", variant: "destructive" });
            return;
        }
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setPhotoPreview(e.target.result);
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
        setExistingPhotoUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadPhoto = async (recipeId) => {
        if (!photoFile) return existingPhotoUrl;
        setUploadingPhoto(true);
        try {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `recipe-${recipeId}-${Date.now()}.${fileExt}`;
            const filePath = `recipe-photos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, photoFile, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                toast({ title: "Error", description: "Gagal mengupload foto. Silakan coba lagi.", variant: "destructive" });
                return existingPhotoUrl;
            }

            const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
            return urlData?.publicUrl || null;
        } catch (err) {
            console.error('Photo upload failed:', err);
            return existingPhotoUrl;
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleOpenDialog = (recipe = null) => {
        // Reset photo state
        setPhotoFile(null);
        setPhotoPreview(null);
        setExistingPhotoUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (recipe) {
            setEditingRecipe(recipe);
            setGeneralInfo({
                name: recipe.name,
                description: recipe.description || ''
            });

            // Load existing photo
            const photoUrl = recipe.image_url || recipe.metadata?.photo_url || recipe.photo_url || null;
            if (photoUrl) {
                setExistingPhotoUrl(photoUrl);
                setPhotoPreview(photoUrl);
            }

            if (recipe.method === 'wizard' && recipe.metadata) {
                setActiveTab("wizard");

                // Migrate old metadata structure to new dynamic sections if needed
                let sections = recipe.metadata.sections;
                if (!sections) {
                    sections = [];
                    if (recipe.metadata.bibitPercent !== undefined) {
                        sections.push({ id: 'bib-legacy', name: 'Bibit', percent: recipe.metadata.bibitPercent, type: 'multi', materials: recipe.metadata.bibitMaterials || [] });
                    }
                    if (recipe.metadata.fixativePercent !== undefined) {
                        sections.push({ id: 'fix-legacy', name: 'Fixative', percent: recipe.metadata.fixativePercent, type: 'single', materialId: recipe.metadata.fixativeId || '' });
                    }
                    if (recipe.metadata.alcoholPercent !== undefined) {
                        sections.push({ id: 'alc-legacy', name: 'Alkohol', percent: recipe.metadata.alcoholPercent, type: 'single', materialId: recipe.metadata.alcoholId || '' });
                    }
                }

                setWizardData({
                    sections: sections,
                    additionalMaterials: recipe.metadata.additionalMaterials || []
                });
            } else {
                setActiveTab("manual");
                setManualIngredients(recipe.recipe_ingredients.map(ri => ({
                    type: ri.ingredient_recipe_id ? 'recipe' : 'material',
                    id: ri.ingredient_recipe_id || ri.material_id,
                    quantity: ri.quantity,
                    mode: 'QTY'
                })));

                setWizardData({
                    sections: [
                        { id: 'sec-1', name: 'Bibit', percent: 40, type: 'multi', materials: [{ id: '', percent_share: 100 }] },
                        { id: 'sec-2', name: 'Fixative', percent: 4, type: 'single', materialId: '' },
                        { id: 'sec-3', name: 'Alkohol', percent: 56, type: 'single', materialId: '' }
                    ],
                    additionalMaterials: []
                });
            }

        } else {
            setEditingRecipe(null);
            setGeneralInfo({ name: '', description: '' });
            setManualIngredients([{ type: 'material', id: '', quantity: '', mode: 'QTY' }]);

            setWizardData({
                sections: [
                    { id: 'sec-1', name: 'Bibit', percent: 40, type: 'multi', materials: [{ id: '', percent_share: 100 }] },
                    { id: 'sec-3', name: 'Alkohol', percent: 60, type: 'single', materialId: '' }
                ],
                additionalMaterials: []
            });
            setActiveTab("wizard");
        }
        setIsDialogOpen(true);
    };

    const handleAddManualIngredient = () => {
        setManualIngredients(prev => [...prev, { type: 'material', id: '', quantity: '', mode: 'QTY' }]);
    };
    const handleRemoveManualIngredient = (index) => {
        setManualIngredients(prev => prev.filter((_, i) => i !== index));
    };
    const handleManualIngredientChange = (index, field, value) => {
        const newIngredients = [...manualIngredients];
        newIngredients[index][field] = value;
        if (field === 'type') newIngredients[index].id = '';
        setManualIngredients(newIngredients);
    };

    const handleAddSection = (catName = 'Kategori Baru') => {
        const isMultiType = catName.toLowerCase().includes('bibit') || catName.toLowerCase().includes('campuran'); // Added 'campuran' as a potential multi-type category
        setWizardData(prev => ({
            ...prev,
            sections: [...prev.sections, {
                id: `sec-${Date.now()}`,
                name: catName,
                percent: 0,
                type: isMultiType ? 'multi' : 'single',
                materialId: '',
                materials: isMultiType ? [{ id: '', percent_share: 100 }] : []
            }]
        }));
    };

    const handleRemoveSection = (id) => {
        setWizardData(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== id)
        }));
    };

    const handleSectionChange = (id, field, value) => {
        setWizardData(prev => ({
            ...prev,
            sections: prev.sections.map(s => {
                if (s.id === id) {
                    const updated = { ...s, [field]: value };
                    // Ensure materials array exists if switching to multi
                    if (field === 'type' && value === 'multi' && (!updated.materials || !Array.isArray(updated.materials))) {
                        updated.materials = [];
                    }
                    // If changing name, also update type if it's a 'bibit' category
                    if (field === 'name') {
                        const isMultiType = value.toLowerCase().includes('bibit') || value.toLowerCase().includes('campuran');
                        updated.type = isMultiType ? 'multi' : 'single';
                        if (isMultiType && (!updated.materials || !Array.isArray(updated.materials))) {
                            updated.materials = [{ id: '', percent_share: 100 }];
                        } else if (!isMultiType) {
                            updated.materials = [];
                        }
                    }
                    return updated;
                }
                return s;
            })
        }));
    };

    const handleAddBibitSectionMaterial = (sectionId) => {
        setWizardData(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? { ...s, materials: [...(s.materials || []), { id: '', percent_share: '' }] } : s)
        }));
    };

    const handleRemoveBibitSectionMaterial = (sectionId, mIdx) => {
        setWizardData(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? { ...s, materials: s.materials.filter((_, i) => i !== mIdx) } : s)
        }));
    };

    const handleBibitSectionMaterialChange = (sectionId, mIdx, field, value) => {
        setWizardData(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === sectionId ? {
                ...s,
                materials: s.materials.map((m, i) => i === mIdx ? { ...m, [field]: value } : m)
            } : s)
        }));
    };

    const handleAddAdditionalMaterial = () => {
        setWizardData(prev => ({
            ...prev,
            additionalMaterials: [...(prev.additionalMaterials || []), { id: '', quantity: '' }]
        }));
    };
    const handleRemoveAdditionalMaterial = (index) => {
        setWizardData(prev => ({
            ...prev,
            additionalMaterials: prev.additionalMaterials.filter((_, i) => i !== index)
        }));
    };
    const handleAdditionalMaterialChange = (index, field, value) => {
        const newMaterials = [...(wizardData.additionalMaterials || [])];
        newMaterials[index][field] = value;
        setWizardData(prev => ({ ...prev, additionalMaterials: newMaterials }));
    };

    const getUserDisplayName = async () => {
        // Helper to fetch current user's display name
        if (!user) return 'Unknown';

        // Check employee table first
        const { data: emp } = await supabase.from('employees').select('name').eq('auth_user_id', user.id).maybeSingle();
        if (emp) return emp.name;

        // Fallback to metadata
        return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner';
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            console.log("=== STARTING RECIPE SAVE ===");
            const totalOutput = 100;
            let finalIngredients = [];
            let methodType = 'manual';
            let metadata = {};

            if (activeTab === 'manual') {
                methodType = 'manual';
                let ingredientsToSave = [...manualIngredients];
                const fixedItems = ingredientsToSave.filter(i => i.mode === 'QTY');
                const pctItems = ingredientsToSave.filter(i => i.mode === 'PCT');

                if (pctItems.length > 0) {
                    const sumFixed = fixedItems.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0);
                    const sumPct = pctItems.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0) / 100;
                    if (sumPct >= 1) throw new Error("Total persentase komposisi > 100%");

                    let totalBatchSize = 0;
                    if (sumFixed === 0) {
                        totalBatchSize = totalOutput || 100;
                    } else {
                        totalBatchSize = sumFixed / (1 - sumPct);
                    }

                    finalIngredients = ingredientsToSave.map(ing => {
                        if (ing.mode === 'QTY') return { ...ing, quantity: parseFloat(ing.quantity) };
                        else return { ...ing, quantity: totalBatchSize * (parseFloat(ing.quantity) / 100) };
                    });
                } else {
                    finalIngredients = ingredientsToSave.map(ing => ({ ...ing, quantity: parseFloat(ing.quantity) }));
                }
            } else {
                methodType = 'wizard';
                const { sections, additionalMaterials } = wizardData;

                metadata = {
                    sections,
                    additionalMaterials: additionalMaterials || []
                };

                const totalPct = sections.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
                if (Math.abs(totalPct - 100) > 0.1) throw new Error(`Total formula harus 100%. Saat ini: ${totalPct}%`);

                sections.forEach(sec => {
                    const secTotalQty = totalOutput * ((parseFloat(sec.percent) || 0) / 100);
                    if (sec.type === 'multi') {
                        const shareSum = sec.materials.reduce((sum, m) => sum + (parseFloat(m.percent_share) || 0), 0);
                        if (sec.percent > 0 && Math.abs(shareSum - 100) > 0.1) throw new Error(`Total pembagian di kategori ${sec.name} harus 100%`);

                        sec.materials.forEach(mat => {
                            if (!mat.id) return;
                            const qty = secTotalQty * (parseFloat(mat.percent_share) / 100);
                            finalIngredients.push({ type: 'material', id: mat.id, quantity: qty });
                        });
                    } else {
                        if (sec.materialId && sec.percent > 0) {
                            finalIngredients.push({ type: 'material', id: sec.materialId, quantity: secTotalQty });
                        }
                    }
                });

                if (additionalMaterials) {
                    additionalMaterials.forEach(mat => {
                        if (mat.id && mat.quantity) {
                            finalIngredients.push({ type: 'material', id: mat.id, quantity: parseFloat(mat.quantity) });
                        }
                    });
                }
            }

            // Upload photo first to get URL (we use a temp ID for new recipes)
            let photoUrl = existingPhotoUrl;
            const tempId = editingRecipe?.id || `new-${Date.now()}`;
            if (photoFile) {
                photoUrl = await uploadPhoto(tempId);
            }
            // If photo was removed (no preview and no file)
            if (!photoPreview && !photoFile) {
                photoUrl = null;
            }

            // Add image_url to payload and metadata
            const recipePayload = {
                user_id: user.id,
                name: generalInfo.name,
                description: generalInfo.description,
                output_quantity: totalOutput,
                method: methodType,
                metadata: { ...metadata, photo_url: photoUrl },
                image_url: photoUrl
            };

            let recipeId;
            const oldIngredientsMap = new Map();
            let oldMetadata = {};

            if (editingRecipe) {
                console.log("Editing Recipe ID:", editingRecipe.id);
                // CRITICAL: Fetch the latest metadata from DB to compare against
                const { data: freshData, error: fetchError } = await supabase
                    .from('recipes')
                    .select('metadata')
                    .eq('id', editingRecipe.id)
                    .single();

                if (!fetchError && freshData) {
                    oldMetadata = freshData.metadata || {};
                    console.log("Fetched Old Metadata:", oldMetadata);
                } else {
                    console.warn("Could not fetch fresh metadata, falling back to local state", fetchError);
                    oldMetadata = editingRecipe.metadata || {};
                }

                const { error } = await supabase.from('recipes').update(recipePayload).eq('id', editingRecipe.id);
                if (error) throw error;
                recipeId = editingRecipe.id;

                editingRecipe.recipe_ingredients.forEach(ri => {
                    const key = ri.material_id || ri.ingredient_recipe_id;
                    oldIngredientsMap.set(key, ri.quantity);
                });

                await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
            } else {
                const { data, error } = await supabase.from('recipes').insert(recipePayload).select().single();
                if (error) throw error;
                recipeId = data.id;
            }

            const ingredientsPayload = finalIngredients.map(ing => ({
                recipe_id: recipeId,
                user_id: user.id,
                quantity: ing.quantity,
                material_id: ing.type === 'material' ? ing.id : null,
                ingredient_recipe_id: ing.type === 'recipe' ? ing.id : null
            }));

            const { error: ingError } = await supabase.from('recipe_ingredients').insert(ingredientsPayload);
            if (ingError) throw ingError;

            // Prepare Change Log for Notification
            const changes = [];
            const userName = await getUserDisplayName();

            console.log("Comparing Changes... Method:", methodType);

            if (methodType === 'wizard') {
                console.log("New Metadata:", metadata);
                // Compare Sections
                const newSections = metadata.sections || [];
                const oldSections = oldMetadata.sections || [];

                newSections.forEach(newSec => {
                    const oldSec = oldSections.find(s => s.id === newSec.id) ||
                        oldSections.find(s => s.name === newSec.name); // Fallback for migrated old recipes

                    if (!oldSec) {
                        changes.push({ material: `Kolom Baru: ${newSec.name}`, old: '-', new: `${newSec.percent}%` });
                    } else {
                        if (String(oldSec.percent) !== String(newSec.percent)) {
                            changes.push({ material: `Kategori ${newSec.name}`, old: `${oldSec.percent}%`, new: `${newSec.percent}%` });
                        }

                        if (newSec.type === 'multi') {
                            const newMats = newSec.materials || [];
                            const oldMats = oldSec.materials || [];

                            newMats.forEach(nm => {
                                const om = oldMats.find(m => m.id === nm.id);
                                if (!om) {
                                    const mName = rawMaterials.find(m => m.id === nm.id)?.name || 'Bahan';
                                    changes.push({ material: `Tambah ke ${newSec.name}: ${mName}`, old: '0%', new: `${nm.percent_share}%` });
                                } else if (String(om.percent_share) !== String(nm.percent_share)) {
                                    const mName = rawMaterials.find(m => m.id === nm.id)?.name || 'Bahan';
                                    changes.push({ material: `Ubah di ${newSec.name}: ${mName}`, old: `${om.percent_share}%`, new: `${nm.percent_share}%` });
                                }
                            });
                        }
                    }
                });

                // Check for removed sections
                oldSections.forEach(oldSec => {
                    if (!newSections.find(s => s.id === oldSec.id)) {
                        changes.push({ material: `Hapus Kolom: ${oldSec.name}`, old: `${oldSec.percent}%`, new: '0%' });
                    }
                });

                // Compare Additional Materials
                const newAdditionalMap = new Map((metadata.additionalMaterials || []).map(m => [String(m.id), String(m.quantity)]));
                const oldAdditionalMap = new Map((oldMetadata.additionalMaterials || []).map(m => [String(m.id), String(m.quantity)]));

                newAdditionalMap.forEach((qty, id) => {
                    const oldQty = oldAdditionalMap.get(id);
                    const matName = rawMaterials.find(m => m.id === id)?.name || 'Unknown';
                    if (oldQty === undefined) {
                        changes.push({ material: `Tambahan: ${matName}`, old: '0', new: `${qty}` });
                    } else if (Math.abs(parseFloat(oldQty) - parseFloat(qty)) > 0.01) {
                        changes.push({ material: `Tambahan: ${matName}`, old: `${oldQty}`, new: `${qty}` });
                    }
                });
                oldAdditionalMap.forEach((oldQty, id) => {
                    if (!newAdditionalMap.has(id)) {
                        const matName = rawMaterials.find(m => m.id === id)?.name || 'Unknown';
                        changes.push({ material: `Tambahan: ${matName}`, old: `${oldQty}`, new: '0' });
                    }
                });

            } else {
                // Manual Mode - compare raw quantities as percentages relative to batch output (usually 100)
                if (editingRecipe) {
                    ingredientsPayload.forEach(newIng => {
                        const key = newIng.material_id || newIng.ingredient_recipe_id;
                        const oldQty = oldIngredientsMap.get(key);
                        const matName = rawMaterials.find(m => m.id === newIng.material_id)?.name ||
                            recipes.find(r => r.id === newIng.ingredient_recipe_id)?.name || 'Unknown';

                        if (oldQty === undefined) {
                            changes.push({ material: matName, old: '0%', new: `${newIng.quantity.toFixed(1)}%` });
                        } else if (Math.abs(oldQty - newIng.quantity) > 0.01) {
                            changes.push({ material: matName, old: `${parseFloat(oldQty).toFixed(1)}%`, new: `${newIng.quantity.toFixed(1)}%` });
                        }
                        oldIngredientsMap.delete(key);
                    });
                    // Removed items
                    oldIngredientsMap.forEach((qty, key) => {
                        const matName = rawMaterials.find(m => m.id === key)?.name ||
                            recipes.find(r => r.id === key)?.name || 'Unknown';
                        changes.push({ material: matName, old: `${parseFloat(qty).toFixed(1)}%`, new: '0%' });
                    });
                }
            }

            console.log("Calculated Changes for Log:", changes);

            if (changes.length > 0 || !editingRecipe) {
                const notifData = {
                    type: 'recipe_update',
                    details: {
                        recipeName: generalInfo.name,
                        userName: userName,
                        changes: changes // Ensure this array is passed!
                    }
                };

                await logNotification(
                    user.id,
                    editingRecipe ? `Resep ${generalInfo.name} diubah` : `Resep ${generalInfo.name} dibuat`,
                    `Oleh ${userName}`,
                    "success",
                    notifData
                );
                console.log("Notification Logged Successfully", notifData);
            } else {
                console.log("No changes detected to log.");
            }

            toast({ title: "Berhasil", description: "Resep berhasil disimpan" });
            setIsDialogOpen(false);
            fetchData();
            if (onUpdate) onUpdate();

        } catch (error) {
            console.error("SAVE ERROR:", error);
            toast({ title: "Validasi Gagal", description: error.message, variant: "destructive" });
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm("Yakin hapus resep ini?")) return;
        try {
            const userName = await getUserDisplayName();
            await supabase.from('recipes').delete().eq('id', id);
            await logNotification(
                user.id,
                `Hapus Resep: ${name}`,
                `Dihapus oleh ${userName}`,
                "warning",
                {
                    type: 'recipe_delete',
                    details: {
                        recipeName: name,
                        userName: userName
                    }
                }
            );
            toast({ title: "Dihapus", description: "Resep dihapus." });
            fetchData();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const bibitOptions = rawMaterials.filter(m => !m.deleted_at);
    const fixativeOptions = rawMaterials.filter(m => !m.deleted_at);
    const alcoholOptions = rawMaterials.filter(m => !m.deleted_at);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Data Resep Racikan</h2>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => handleOpenDialog()} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto shadow-lg shadow-indigo-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Resep Baru
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 opacity-50" />
                    <p>Memuat Resep...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recipes.map((recipe, idx) => {
                        const recipeCode = `RSP${String(idx + 1).padStart(3, '0')}`;
                        const totalQty = recipe.recipe_ingredients.reduce((sum, i) => sum + (i.quantity || 0), 0);
                        const isWizard = recipe.method === 'wizard';
                        const colorTheme = getRecipeColor(recipe.name);

                        return (
                            <div key={recipe.id} className={`bg-[#1e293b] rounded-xl border ${colorTheme.border} ${colorTheme.glow} shadow-lg overflow-hidden flex flex-col h-full hover:shadow-xl transition-all`}>
                                {/* Recipe Photo */}
                                {(recipe.image_url || recipe.metadata?.photo_url || recipe.photo_url) && (
                                    <div className="relative w-full overflow-hidden bg-slate-900/80 flex items-center justify-center p-2">
                                        <img
                                            src={recipe.image_url || recipe.metadata?.photo_url || recipe.photo_url}
                                            alt={recipe.name}
                                            className="w-full max-h-52 object-contain rounded-lg transition-transform duration-500 hover:scale-105"
                                            onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                                        />
                                    </div>
                                )}
                                <div className="p-5 border-b border-slate-700/50 flex justify-between items-start bg-slate-800/30">
                                    <div>
                                        <h3 className={`text-lg font-bold ${colorTheme.text} leading-tight`}>{recipe.name}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <p className="text-xs text-slate-500 font-mono">{recipeCode}</p>
                                            <span className={`text-[10px] px-1.5 rounded border ${isWizard ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                                                {isWizard ? 'Resep A' : 'Resep B'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleOpenDialog(recipe)} className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-colors">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(recipe.id, recipe.name)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-5 flex-1">
                                    {isWizard ? (
                                        <RecipeAWizardView recipe={recipe} allMaterials={rawMaterials} colorTheme={colorTheme} />
                                    ) : (
                                        <RecipeCompositionView ingredients={recipe.recipe_ingredients} allRecipes={recipes} allMaterials={rawMaterials} totalQty={totalQty} colorTheme={colorTheme} />
                                    )}
                                </div>
                                {recipe.description && (
                                    <div className="px-5 py-3 bg-[#0f172a]/30 border-t border-slate-700/30 text-xs text-slate-500 italic">
                                        {recipe.description}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FlaskConical className="w-5 h-5 text-indigo-400" />
                            {editingRecipe ? `Edit Resep: ${editingRecipe.name}` : 'Buat Resep Baru'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                        {/* Photo Upload Section */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Camera className="w-4 h-4 text-indigo-400" />
                                Foto Resep
                            </Label>
                            {photoPreview ? (
                                <div className="relative group rounded-xl overflow-hidden border-2 border-indigo-500/30 bg-slate-900/80 flex items-center justify-center">
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-full max-h-64 object-contain p-2"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-2.5 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-lg transition-all hover:scale-110"
                                            >
                                                <ImagePlus className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemovePhoto}
                                                className="p-2.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white shadow-lg transition-all hover:scale-110"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {uploadingPhoto && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                                                <span className="text-xs text-slate-300">Mengupload foto...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handlePhotoDrop}
                                    className="relative cursor-pointer border-2 border-dashed border-slate-600 hover:border-indigo-500/50 rounded-xl p-8 transition-all duration-300 bg-slate-900/30 hover:bg-indigo-500/5 group"
                                >
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <div className="p-3 rounded-full bg-slate-800 group-hover:bg-indigo-600/20 transition-colors">
                                            <ImagePlus className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors font-medium">
                                                Klik atau drag & drop foto di sini
                                            </p>
                                            <p className="text-[10px] text-slate-600 mt-1">
                                                JPG, PNG, WebP • Maks. 5MB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoSelect}
                                className="hidden"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label>Nama Resep</Label>
                                <Input value={generalInfo.name} onChange={e => setGeneralInfo({ ...generalInfo, name: e.target.value })} placeholder="Contoh: Parfum Obsidian" className="bg-slate-800 border-slate-600" />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label>Deskripsi</Label>
                                <Input value={generalInfo.description} onChange={e => setGeneralInfo({ ...generalInfo, description: e.target.value })} className="bg-slate-800 border-slate-600" placeholder="Catatan opsional..." />
                            </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                                <TabsTrigger value="wizard" disabled={editingRecipe && editingRecipe.method !== 'wizard'} className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Resep A (Formula)</TabsTrigger>
                                <TabsTrigger value="manual" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Resep B (Manual)</TabsTrigger>
                            </TabsList>
                            <TabsContent value="wizard" className="space-y-6 bg-slate-900/40 p-5 rounded-xl border border-slate-800/80 mt-4 shadow-inner">
                                <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <Label className="text-white font-bold">Kategori Formula (%)</Label>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${Math.abs(wizardData.sections.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0) - 100) < 0.1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            Total: {wizardData.sections.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0)}%
                                        </span>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button type="button" size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-xs shadow-lg shadow-indigo-500/20">
                                                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Kolom <ChevronDown className="w-3 h-3 ml-1" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-slate-900 border-slate-700 text-slate-100 max-h-[300px] overflow-y-auto">
                                            {availableCategories.length > 0 ? (
                                                availableCategories.map(cat => (
                                                    <DropdownMenuItem key={cat} onClick={() => handleAddSection(cat)} className="hover:bg-slate-800 cursor-pointer focus:bg-indigo-600 focus:text-white">
                                                        {cat}
                                                    </DropdownMenuItem>
                                                ))
                                            ) : (
                                                <DropdownMenuItem onClick={() => handleAddSection()} className="text-slate-500 italic">
                                                    Tambah Kategori Baru
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {wizardData.sections.map((sec) => (
                                        <div key={sec.id} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 relative group shadow-sm hover:border-slate-600 transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <select
                                                    className="bg-transparent border-none p-0 h-auto text-sm font-bold text-indigo-300 focus:ring-0 cursor-pointer"
                                                    value={sec.name}
                                                    onChange={e => handleSectionChange(sec.id, 'name', e.target.value)}
                                                >
                                                    <option value={sec.name} className="bg-slate-900">{sec.name}</option>
                                                    {availableCategories.filter(c => c !== sec.name).map(c => (
                                                        <option key={c} value={c} className="bg-slate-900">{c}</option>
                                                    ))}
                                                </select>
                                                <button onClick={() => handleRemoveSection(sec.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    className="bg-slate-900 border-slate-700 text-center font-black text-lg h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={sec.percent}
                                                    onChange={e => handleSectionChange(sec.id, 'percent', e.target.value)}
                                                />
                                                <span className="text-slate-500 font-bold">%</span>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => handleSectionChange(sec.id, 'type', 'single')}
                                                    className={`flex-1 text-[10px] py-1 rounded transition-colors ${sec.type === 'single' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}
                                                >
                                                    Direct
                                                </button>
                                                <button
                                                    onClick={() => handleSectionChange(sec.id, 'type', 'multi')}
                                                    className={`flex-1 text-[10px] py-1 rounded transition-colors ${sec.type === 'multi' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}
                                                >
                                                    Mix
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-2 border-t border-slate-700/50 mt-4">
                                    {wizardData.sections.map((sec) => (
                                        <div key={`detail-${sec.id}`} className={`p-4 rounded-xl border ${sec.type === 'multi' ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-slate-700/50 bg-slate-800/20'} shadow-sm`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${sec.type === 'multi' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
                                                    <Label className="text-white font-bold uppercase">{sec.name} ({sec.percent}%)</Label>
                                                    {sec.type === 'multi' && (
                                                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${Math.abs((sec.materials || []).reduce((sum, m) => sum + (parseFloat(m.percent_share) || 0), 0) - 100) < 0.1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                Total: {(sec.materials || []).reduce((sum, m) => sum + (parseFloat(m.percent_share) || 0), 0).toFixed(1).replace(/\.0$/, '')}%
                                                            </span>
                                                            <div className="flex items-center bg-slate-900/50 border border-slate-700/50 rounded-md px-2 h-7 focus-within:border-indigo-500/50 transition-colors">
                                                                <Search className="w-3 h-3 text-slate-500 mr-1.5" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Cari bahan diracikan..."
                                                                    className="bg-transparent border-none text-[10px] text-slate-200 w-32 focus:ring-0 p-0 placeholder-slate-600 outline-none"
                                                                    value={sectionSearchTerms[sec.id] || ''}
                                                                    onChange={e => setSectionSearchTerms(prev => ({ ...prev, [sec.id]: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {sec.type === 'multi' && (
                                                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddBibitSectionMaterial(sec.id)} className="h-7 text-[10px] border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                                                        <Plus className="w-3 h-3 mr-1" /> Pilih Bahan
                                                    </Button>
                                                )}
                                            </div>

                                            {sec.type === 'multi' ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {(sec.materials || []).map((mat, idx) => {
                                                        const searchVal = (sectionSearchTerms[sec.id] || '').toLowerCase();
                                                        const materialRef = rawMaterials.find(m => m.id === mat.id);
                                                        const mName = materialRef ? materialRef.name.toLowerCase() : '';

                                                        // Ensure empty "Pilih" slots still show if we are searching (so users can still pick), 
                                                        // or hide them if that's preferred. We'll show empty slots so they can still add new materials while searching.
                                                        if (searchVal && mat.id && !mName.includes(searchVal)) {
                                                            return null;
                                                        }

                                                        return (
                                                            <div key={idx} className="flex gap-2 items-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 shadow-inner">
                                                                <SearchableSelect
                                                                    options={rawMaterials
                                                                        .filter(m => !m.deleted_at)
                                                                        .sort((a, b) => {
                                                                            const aMatch = a.category?.toUpperCase() === sec.name?.toUpperCase() ? 0 : 1;
                                                                            const bMatch = b.category?.toUpperCase() === sec.name?.toUpperCase() ? 0 : 1;
                                                                            return aMatch - bMatch || a.name.localeCompare(b.name);
                                                                        })
                                                                        .map(m => ({ value: m.id, label: m.name }))
                                                                    }
                                                                    value={mat.id}
                                                                    onChange={val => handleBibitSectionMaterialChange(sec.id, idx, 'id', val)}
                                                                    placeholder="Ketik untuk mencari..."
                                                                    fallbackLabel={rawMaterials.find(m => m.id === mat.id)?.name || ''}
                                                                />
                                                                <div className="w-20 shrink-0 relative">
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="%"
                                                                        className="h-8 bg-slate-800 border-none text-xs px-2 pr-6 text-center font-bold text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner"
                                                                        style={{ textShadow: '0 0 1px white' }}
                                                                        value={mat.percent_share}
                                                                        onChange={e => handleBibitSectionMaterialChange(sec.id, idx, 'percent_share', e.target.value)}
                                                                    />
                                                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black">%</span>
                                                                </div>
                                                                <button type="button" onClick={() => handleRemoveBibitSectionMaterial(sec.id, idx)} className="text-slate-500 hover:text-red-400 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        );
                                                    })}
                                                    {(!sec.materials || sec.materials.length === 0) && <p className="col-span-full text-xs text-slate-500 italic">Belum ada bahan terpilih.</p>}
                                                </div>
                                            ) : (
                                                <div className="flex gap-4 items-center">
                                                    <div className="flex-1">
                                                        <SearchableSelect
                                                            options={rawMaterials
                                                                .filter(m => !m.deleted_at)
                                                                .sort((a, b) => {
                                                                    const aMatch = a.category?.toUpperCase() === sec.name?.toUpperCase() ? 0 : 1;
                                                                    const bMatch = b.category?.toUpperCase() === sec.name?.toUpperCase() ? 0 : 1;
                                                                    return aMatch - bMatch || a.name.localeCompare(b.name);
                                                                })
                                                                .map(m => ({ value: m.id, label: m.name }))
                                                            }
                                                            value={sec.materialId}
                                                            onChange={val => handleSectionChange(sec.id, 'materialId', val)}
                                                            placeholder="Ketik untuk mencari bahan utama..."
                                                            className="h-10 rounded-lg border border-slate-700 bg-slate-900 flex items-center px-1"
                                                            fallbackLabel={rawMaterials.find(m => m.id === sec.materialId)?.name || ''}
                                                        />
                                                    </div>
                                                    <div className="hidden sm:flex flex-col text-[10px] text-slate-500 space-y-0.5">
                                                        <span>INFO: Kategori "{sec.name}" akan menggunakan {sec.percent}% dari total volume.</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="border border-slate-500/20 rounded-lg p-3 bg-slate-900/10 mt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <Label className="text-slate-300 font-bold">Bahan Tambahan (Manual)</Label>
                                        <Button type="button" size="sm" variant="ghost" onClick={handleAddAdditionalMaterial} className="h-7 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300">
                                            <Plus className="w-3 h-3 mr-1" /> Tambah Bahan
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {(wizardData.additionalMaterials || []).map((mat, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <select className="flex-1 h-9 rounded-md border border-slate-600 bg-slate-800 text-xs px-2" value={mat.id} onChange={e => handleAdditionalMaterialChange(idx, 'id', e.target.value)}>
                                                    <option value="">Pilih Bahan (Botol, Box, dll)...</option>
                                                    {rawMaterials.filter(m => !m.deleted_at).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                </select>
                                                <div className="w-24 relative">
                                                    <Input type="number" placeholder="Qty" className="h-9 bg-slate-800 border-slate-600 text-xs" value={mat.quantity} onChange={e => handleAdditionalMaterialChange(idx, 'quantity', e.target.value)} />
                                                </div>
                                                <button type="button" onClick={() => handleRemoveAdditionalMaterial(idx)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        {(!wizardData.additionalMaterials || wizardData.additionalMaterials.length === 0) && (
                                            <p className="text-xs text-slate-500 italic">Bisa ditambahkan botol, box, atau stiker.</p>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="manual" className="space-y-4">
                                <Button type="button" onClick={handleAddManualIngredient} size="sm" variant="secondary" className="h-7 text-xs w-full"><Plus className="w-3 h-3 mr-1" /> Tambah Item Manual</Button>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {manualIngredients.map((ing, idx) => (
                                        <div key={idx} className="flex gap-2 items-start bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                            <select className="w-24 h-8 rounded border border-slate-600 bg-slate-800 text-[10px]" value={ing.type} onChange={e => handleManualIngredientChange(idx, 'type', e.target.value)}>
                                                <option value="material">Bahan</option>
                                                <option value="recipe">Resep</option>
                                            </select>
                                            <select className="flex-1 h-8 rounded border border-slate-600 bg-slate-800 text-[10px]" value={ing.id} onChange={e => handleManualIngredientChange(idx, 'id', e.target.value)}>
                                                <option value="">Pilih...</option>
                                                {ing.type === 'material' ? rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>) : recipes.filter(r => r.id !== editingRecipe?.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                            <div className="flex bg-slate-700 rounded p-0.5 h-8 w-16">
                                                <button type="button" onClick={() => handleManualIngredientChange(idx, 'mode', 'QTY')} className={`flex-1 text-[10px] ${ing.mode === 'QTY' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>Qty</button>
                                                <button type="button" onClick={() => handleManualIngredientChange(idx, 'mode', 'PCT')} className={`flex-1 text-[10px] ${ing.mode === 'PCT' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>%</button>
                                            </div>
                                            <Input type="number" value={ing.quantity} onChange={e => handleManualIngredientChange(idx, 'quantity', e.target.value)} className="h-8 w-16 bg-slate-800 border-slate-600 text-xs" />
                                            <button type="button" onClick={() => handleRemoveManualIngredient(idx)} className="text-slate-500"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                            <Button type="submit" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">Simpan Resep</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default RecipeGrid;