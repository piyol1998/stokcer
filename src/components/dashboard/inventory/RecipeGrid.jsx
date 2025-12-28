import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { BookOpen, Plus, Trash2, Edit2, FlaskConical, Component, Leaf, Info, Calculator, Wand2, RefreshCw, Beaker, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { logNotification } from '@/lib/notificationUtils';
import { getRecipeColor } from '@/lib/utils';

// --- Customized View for Recipe A (Wizard Type) ---
const RecipeAWizardView = ({ recipe, allMaterials, colorTheme }) => {
    const meta = recipe.metadata || {};
    const bibitPercent = meta.bibitPercent || 0;
    const fixativePercent = meta.fixativePercent || 0;
    const alcoholPercent = meta.alcoholPercent || 0;
    const bibitMaterials = meta.bibitMaterials || [];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                    <span className="text-slate-300">Bibit</span>
                    <span className={`font-bold ${colorTheme.text}`}>{bibitPercent}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                    <span className="text-slate-300">Fixative</span>
                    <span className="font-bold text-amber-400">{fixativePercent}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700/30">
                    <span className="text-slate-300">Alkohol</span>
                    <span className="font-bold text-slate-400">{alcoholPercent}%</span>
                </div>
            </div>

            <div className={`rounded-lg p-4 border border-slate-700/50 bg-slate-900/50`}>
                <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">Komposisi Bibit</h4>
                <div className="space-y-2">
                    {bibitMaterials.map((mat, idx) => {
                        const material = allMaterials.find(m => m.id === mat.id);
                        const materialName = material?.name || 'Unknown Oil';
                        const isDeleted = material?.deleted_at;

                        return (
                            <div key={idx} className="flex justify-between items-center text-xs">
                                <span className={`text-slate-300 font-medium ${isDeleted ? 'line-through text-red-400 opacity-70' : ''}`}>
                                    {materialName} {isDeleted && '(Deleted)'}
                                </span>
                                <span className="text-slate-400">{mat.percent_share}%</span>
                            </div>
                        );
                    })}
                    {bibitMaterials.length === 0 && (
                        <p className="text-xs text-slate-500 italic">Tidak ada detail bibit.</p>
                    )}
                </div>
            </div>
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

  // Form State
  const [generalInfo, setGeneralInfo] = useState({
    name: '',
    description: '',
  });

  const [manualIngredients, setManualIngredients] = useState([]);

  const [wizardData, setWizardData] = useState({
      bibitPercent: 50,
      fixativePercent: 4,
      alcoholPercent: 46,
      bibitMaterials: [], 
      fixativeId: '',
      alcoholId: ''
  });

  useEffect(() => {
    if(user) fetchData();
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

    } catch (error) {
      console.error("Fetch Error:", error);
      toast({ title: "Error", description: "Gagal memuat data resep", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (recipe = null) => {
      if (recipe) {
          setEditingRecipe(recipe);
          setGeneralInfo({
              name: recipe.name,
              description: recipe.description || ''
          });

          if (recipe.method === 'wizard' && recipe.metadata) {
              setActiveTab("wizard");
              setWizardData({
                  bibitPercent: recipe.metadata.bibitPercent || 50,
                  fixativePercent: recipe.metadata.fixativePercent || 4,
                  alcoholPercent: recipe.metadata.alcoholPercent || 46,
                  bibitMaterials: recipe.metadata.bibitMaterials || [],
                  fixativeId: recipe.metadata.fixativeId || '',
                  alcoholId: recipe.metadata.alcoholId || ''
              });
              setManualIngredients(recipe.recipe_ingredients.map(ri => ({
                type: ri.ingredient_recipe_id ? 'recipe' : 'material',
                id: ri.ingredient_recipe_id || ri.material_id,
                quantity: ri.quantity,
                mode: 'QTY'
              })));
          } else {
              setActiveTab("manual");
              setManualIngredients(recipe.recipe_ingredients.map(ri => ({
                  type: ri.ingredient_recipe_id ? 'recipe' : 'material',
                  id: ri.ingredient_recipe_id || ri.material_id,
                  quantity: ri.quantity,
                  mode: 'QTY' 
              })));
              
              setWizardData({
                bibitPercent: 50,
                fixativePercent: 4,
                alcoholPercent: 46,
                bibitMaterials: [],
                fixativeId: '',
                alcoholId: ''
            });
          }

      } else {
          setEditingRecipe(null);
          setGeneralInfo({ name: '', description: '' });
          setManualIngredients([{ type: 'material', id: '', quantity: '', mode: 'QTY' }]);
          
          setWizardData({
              bibitPercent: 50,
              fixativePercent: 4,
              alcoholPercent: 46,
              bibitMaterials: [],
              fixativeId: '',
              alcoholId: ''
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

  const handleAddBibitMaterial = () => {
      setWizardData(prev => ({
          ...prev,
          bibitMaterials: [...prev.bibitMaterials, { id: '', percent_share: '' }]
      }));
  };
  const handleRemoveBibitMaterial = (index) => {
      setWizardData(prev => ({
          ...prev,
          bibitMaterials: prev.bibitMaterials.filter((_, i) => i !== index)
      }));
  };
  const handleBibitMaterialChange = (index, field, value) => {
      const newMaterials = [...wizardData.bibitMaterials];
      newMaterials[index][field] = value;
      setWizardData(prev => ({ ...prev, bibitMaterials: newMaterials }));
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
              const { bibitPercent, fixativePercent, alcoholPercent, bibitMaterials, fixativeId, alcoholId } = wizardData;
              
              metadata = {
                  bibitPercent,
                  fixativePercent,
                  alcoholPercent,
                  bibitMaterials,
                  fixativeId,
                  alcoholId
              };

              const totalPct = parseFloat(bibitPercent) + parseFloat(fixativePercent) + parseFloat(alcoholPercent);
              if (Math.abs(totalPct - 100) > 0.1) throw new Error(`Total formula harus 100%. Saat ini: ${totalPct}%`);
              
              if (bibitMaterials.length === 0) throw new Error("Pilih minimal 1 bahan untuk Bibit");
              const bibitShareSum = bibitMaterials.reduce((sum, m) => sum + (parseFloat(m.percent_share)||0), 0);
              if (Math.abs(bibitShareSum - 100) > 0.1) throw new Error(`Total pembagian Bibit harus 100%. Saat ini: ${bibitShareSum}%`);

              const bibitTotalQty = totalOutput * (bibitPercent / 100);
              const fixativeQty = totalOutput * (fixativePercent / 100);
              const alcoholQty = totalOutput * (alcoholPercent / 100);

              bibitMaterials.forEach(mat => {
                  if(!mat.id) return;
                  const qty = bibitTotalQty * (parseFloat(mat.percent_share) / 100);
                  finalIngredients.push({ type: 'material', id: mat.id, quantity: qty });
              });
              if (fixativeId) finalIngredients.push({ type: 'material', id: fixativeId, quantity: fixativeQty });
              if (alcoholId) finalIngredients.push({ type: 'material', id: alcoholId, quantity: alcoholQty });
          }

          const recipePayload = {
              user_id: user.id,
              name: generalInfo.name,
              description: generalInfo.description,
              output_quantity: totalOutput,
              method: methodType,
              metadata: metadata
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
              // 1. Compare Main Percentages
              if (String(oldMetadata.bibitPercent) !== String(metadata.bibitPercent)) {
                  changes.push({ material: 'Bibit', old: `${oldMetadata.bibitPercent || 0}%`, new: `${metadata.bibitPercent}%` });
              }
              if (String(oldMetadata.fixativePercent) !== String(metadata.fixativePercent)) {
                  changes.push({ material: 'Fixative', old: `${oldMetadata.fixativePercent || 0}%`, new: `${metadata.fixativePercent}%` });
              }
              if (String(oldMetadata.alcoholPercent) !== String(metadata.alcoholPercent)) {
                  changes.push({ material: 'Alkohol', old: `${oldMetadata.alcoholPercent || 0}%`, new: `${metadata.alcoholPercent}%` });
              }

              // 2. Compare Inner Bibit Materials
              const newBibitMap = new Map(metadata.bibitMaterials.map(m => [String(m.id), String(m.percent_share)]));
              const oldBibitMap = new Map((oldMetadata.bibitMaterials || []).map(m => [String(m.id), String(m.percent_share)]));

              // Check added or changed (in new map)
              newBibitMap.forEach((newPct, id) => {
                   const oldPct = oldBibitMap.get(id);
                   const matName = rawMaterials.find(m => m.id === id)?.name || 'Unknown';
                   
                   // Compare numbers safely to avoid "70" vs "70.0" mismatch issues
                   // But maintain sensitivity to actual changes "70" vs "69"
                   const oldVal = parseFloat(oldPct || 0);
                   const newVal = parseFloat(newPct || 0);

                   if (oldPct === undefined) {
                        console.log(`Bibit Material Added: ${matName} (${newPct}%)`);
                        changes.push({ material: `Komposisi Bibit: ${matName}`, old: '0%', new: `${newPct}%` });
                   } else if (Math.abs(oldVal - newVal) > 0.01) {
                        console.log(`Bibit Material Changed: ${matName} (${oldPct}% -> ${newPct}%)`);
                        changes.push({ material: `Komposisi Bibit: ${matName}`, old: `${oldPct}%`, new: `${newPct}%` });
                   }
              });

              // Check removed (in old map but not in new)
              oldBibitMap.forEach((oldPct, id) => {
                  if (!newBibitMap.has(id)) {
                      const matName = rawMaterials.find(m => m.id === id)?.name || 'Unknown';
                      console.log(`Bibit Material Removed: ${matName}`);
                      changes.push({ material: `Komposisi Bibit: ${matName}`, old: `${oldPct}%`, new: '0%' });
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
      if(!window.confirm("Yakin hapus resep ini?")) return;
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
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 opacity-50"/>
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
                      <FlaskConical className="w-5 h-5 text-indigo-400"/>
                      {editingRecipe ? `Edit Resep: ${editingRecipe.name}` : 'Buat Resep Baru'}
                  </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                          <Label>Nama Resep</Label>
                          <Input value={generalInfo.name} onChange={e => setGeneralInfo({...generalInfo, name: e.target.value})} placeholder="Contoh: Parfum Obsidian" className="bg-slate-800 border-slate-600" />
                      </div>
                      
                      <div className="space-y-2 col-span-2">
                          <Label>Deskripsi</Label>
                          <Input value={generalInfo.description} onChange={e => setGeneralInfo({...generalInfo, description: e.target.value})} className="bg-slate-800 border-slate-600" placeholder="Catatan opsional..." />
                      </div>
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
                          <TabsTrigger value="wizard" disabled={editingRecipe && editingRecipe.method !== 'wizard'} className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Resep A (Formula)</TabsTrigger>
                          <TabsTrigger value="manual" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Resep B (Manual)</TabsTrigger>
                      </TabsList>
                      <TabsContent value="wizard" className="space-y-5 bg-slate-900/30 p-4 rounded-lg border border-slate-800 mt-4">
                          <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="space-y-2">
                                    <Label className="text-indigo-400">Bibit %</Label>
                                    <Input type="number" className="bg-slate-800 border-slate-600 text-center font-bold" value={wizardData.bibitPercent} onChange={e => setWizardData({...wizardData, bibitPercent: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-emerald-400">Fixative %</Label>
                                    <Input type="number" className="bg-slate-800 border-slate-600 text-center font-bold" value={wizardData.fixativePercent} onChange={e => setWizardData({...wizardData, fixativePercent: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-blue-400">Alkohol %</Label>
                                    <Input type="number" className="bg-slate-800 border-slate-600 text-center font-bold" value={wizardData.alcoholPercent} onChange={e => setWizardData({...wizardData, alcoholPercent: e.target.value})} />
                                </div>
                          </div>
                          <div className="border border-indigo-500/20 rounded-lg p-3 bg-indigo-900/10">
                                <div className="flex justify-between items-center mb-3">
                                    <Label className="text-indigo-300 font-bold">1. Komposisi Bibit</Label>
                                    <Button type="button" size="sm" variant="ghost" onClick={handleAddBibitMaterial} className="h-7 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300">
                                        <Plus className="w-3 h-3 mr-1"/> Pilih Bahan Bibit
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {wizardData.bibitMaterials.map((mat, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select className="flex-1 h-9 rounded-md border border-slate-600 bg-slate-800 text-xs px-2" value={mat.id} onChange={e => handleBibitMaterialChange(idx, 'id', e.target.value)}>
                                                <option value="">Pilih Oil...</option>
                                                {bibitOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                            <div className="w-20 relative">
                                                <Input type="number" placeholder="%" className="h-9 bg-slate-800 border-slate-600 text-xs pr-6" value={mat.percent_share} onChange={e => handleBibitMaterialChange(idx, 'percent_share', e.target.value)} />
                                            </div>
                                            <button type="button" onClick={() => handleRemoveBibitMaterial(idx)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label className="text-emerald-300">2. Bahan Fixative</Label>
                                  <select className="w-full h-9 rounded-md border border-slate-600 bg-slate-800 text-xs px-2" value={wizardData.fixativeId} onChange={e => setWizardData({...wizardData, fixativeId: e.target.value})}>
                                      <option value="">Pilih Fixative...</option>
                                      {fixativeOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                  </select>
                              </div>
                              <div className="space-y-2">
                                  <Label className="text-blue-300">3. Bahan Alkohol</Label>
                                  <select className="w-full h-9 rounded-md border border-slate-600 bg-slate-800 text-xs px-2" value={wizardData.alcoholId} onChange={e => setWizardData({...wizardData, alcoholId: e.target.value})}>
                                      <option value="">Pilih Alkohol...</option>
                                      {alcoholOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                  </select>
                              </div>
                          </div>
                      </TabsContent>
                      <TabsContent value="manual" className="space-y-4">
                          <Button type="button" onClick={handleAddManualIngredient} size="sm" variant="secondary" className="h-7 text-xs w-full"><Plus className="w-3 h-3 mr-1"/> Tambah Item Manual</Button>
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
                                          <button type="button" onClick={() => handleManualIngredientChange(idx, 'mode', 'QTY')} className={`flex-1 text-[10px] ${ing.mode==='QTY'?'bg-indigo-500 text-white':'text-slate-400'}`}>Qty</button>
                                          <button type="button" onClick={() => handleManualIngredientChange(idx, 'mode', 'PCT')} className={`flex-1 text-[10px] ${ing.mode==='PCT'?'bg-emerald-500 text-white':'text-slate-400'}`}>%</button>
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