import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Factory, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { logNotification } from '@/lib/notificationUtils';

function NewProduction({ onUpdate }) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    const [recipesRes, materialsRes] = await Promise.all([
      supabase.from('recipes').select('*, recipe_ingredients(*)'),
      supabase.from('raw_materials').select('*')
    ]);

    if (!recipesRes.error && !materialsRes.error) {
      setRecipes(recipesRes.data);
      setMaterials(materialsRes.data);
    }
  };

  const checkMaterialAvailability = (recipeId, qty) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return { canProduce: false, missingMaterials: [] };

    const missingMaterials = [];
    let canProduce = true;

    recipe.recipe_ingredients.forEach(ingredient => {
      const material = materials.find(m => m.id === ingredient.material_id);
      const requiredQty = ingredient.quantity * qty;
      
      if (!material || material.quantity < requiredQty) {
        canProduce = false;
        missingMaterials.push({
          name: material?.name || 'Unknown',
          required: requiredQty,
          available: material?.quantity || 0,
          unit: material?.unit || 'unit'
        });
      }
    });

    return { canProduce, missingMaterials };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const recipe = recipes.find(r => r.id === selectedRecipe);
      const productionQty = parseFloat(quantity);
      
      // Prepare ingredients JSON for RPC call
      const ingredientsPayload = recipe.recipe_ingredients.map(ing => ({
        materialId: ing.material_id,
        quantity: ing.quantity * productionQty, // Total quantity for this batch
        materialName: materials.find(m => m.id === ing.material_id)?.name,
        unit: materials.find(m => m.id === ing.material_id)?.unit
      }));

      // Call Atomic Transaction via RPC
      const { error } = await supabase.rpc('produce_item', {
        p_recipe_id: selectedRecipe,
        p_batch_quantity: productionQty,
        p_user_id: user.id,
        p_ingredients_json: ingredientsPayload
      });

      if (error) throw error;

      await logNotification(user.id, "Production Successful", `Produced ${productionQty} batch(es) of ${recipe.name}.`, "success");

      toast({
        title: "Produksi Berhasil",
        description: `Produksi ${recipe.name} telah berhasil dicatat.`,
      });

      setSelectedRecipe('');
      setQuantity('');
      fetchData(); // Refresh data to reflect stock changes
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error(error);
      toast({
        title: "Gagal Produksi",
        description: error.message || "Terjadi kesalahan saat memproses produksi.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRecipeObj = recipes.find(r => r.id === selectedRecipe);
  const availability = selectedRecipe && quantity ? 
    checkMaterialAvailability(selectedRecipe, parseFloat(quantity)) : 
    { canProduce: true, missingMaterials: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Produksi Baru</h1>
        <p className="text-slate-600">Buat produksi baru dari resep yang tersedia</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipe">Pilih Resep</Label>
              <select
                id="recipe"
                value={selectedRecipe}
                onChange={(e) => setSelectedRecipe(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">-- Pilih Resep --</option>
                {recipes.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} (Output: {recipe.output_quantity} unit)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Jumlah Batch</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Berapa kali resep akan diproduksi"
                required
              />
              {selectedRecipeObj && quantity && (
                <p className="text-sm text-slate-600">
                  Total output: <span className="font-semibold text-slate-900">
                    {selectedRecipeObj.output_quantity * parseFloat(quantity)} unit
                  </span>
                </p>
              )}
            </div>

            {!availability.canProduce && quantity && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-2">Bahan Tidak Mencukupi</h4>
                    <div className="space-y-1">
                      {availability.missingMaterials.map((material, index) => (
                        <p key={index} className="text-sm text-red-700">
                          {material.name}: Butuh {material.required} {material.unit}, 
                          tersedia {material.available} {material.unit}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {availability.canProduce && selectedRecipe && quantity && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900">Bahan Mencukupi</h4>
                    <p className="text-sm text-green-700">Semua bahan tersedia untuk produksi</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={!availability.canProduce || !selectedRecipe || !quantity || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Factory className="w-4 h-4 mr-2" />
              {loading ? 'Memproses...' : 'Mulai Produksi'}
            </Button>
          </form>
        </div>

        {selectedRecipeObj && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <h3 className="font-bold text-slate-900 text-lg mb-4">Detail Resep</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Nama Resep</h4>
                <p className="text-slate-900">{selectedRecipeObj.name}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Deskripsi</h4>
                <p className="text-slate-600">{selectedRecipeObj.description}</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Bahan-bahan per Batch</h4>
                <div className="space-y-2">
                  {selectedRecipeObj.recipe_ingredients.map((ingredient, index) => {
                    const material = materials.find(m => m.id === ingredient.material_id);
                    const requiredQty = quantity ? ingredient.quantity * parseFloat(quantity) : ingredient.quantity;
                    
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-700">{material?.name || 'Unknown'}</span>
                        <div className="text-right">
                          <p className="font-medium text-slate-900">
                            {requiredQty} {material?.unit}
                          </p>
                          <p className="text-xs text-slate-500">
                            Tersedia: {material?.quantity} {material?.unit}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default NewProduction;