import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, BookOpen, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { logNotification } from '@/lib/notificationUtils';

function Recipes({ onUpdate }) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingredients: [{ materialId: '', quantity: '' }],
    outputQuantity: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Explicitly specify relationship to avoid ambiguity errors
      const [recipesRes, materialsRes] = await Promise.all([
        supabase.from('recipes').select('*, recipe_ingredients!recipe_id(*)').order('created_at'),
        supabase.from('raw_materials').select('*')
      ]);

      if (recipesRes.error) throw recipesRes.error;
      if (materialsRes.error) throw materialsRes.error;

      const transformedRecipes = recipesRes.data.map(recipe => ({
        ...recipe,
        ingredients: recipe.recipe_ingredients.map(ri => ({
          materialId: ri.material_id,
          quantity: ri.quantity
        }))
      }));

      setRecipes(transformedRecipes);
      setMaterials(materialsRes.data || []);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let recipeId;

      const recipePayload = {
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        output_quantity: parseFloat(formData.outputQuantity)
      };

      if (editingRecipe) {
        recipeId = editingRecipe.id;
        const { error } = await supabase.from('recipes').update(recipePayload).eq('id', recipeId);
        if (error) throw error;
        
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
        await logNotification(user.id, "Recipe Updated", `Updated recipe: ${formData.name}`, "info");

      } else {
        const { data, error } = await supabase.from('recipes').insert([recipePayload]).select().single();
        if (error) throw error;
        recipeId = data.id;
        await logNotification(user.id, "Recipe Created", `Created new recipe: ${formData.name}`, "success");
      }

      const ingredientsPayload = formData.ingredients.map(ing => ({
        recipe_id: recipeId,
        user_id: user.id,
        material_id: ing.materialId,
        quantity: parseFloat(ing.quantity)
      }));

      const { error: ingError } = await supabase.from('recipe_ingredients').insert(ingredientsPayload);
      if (ingError) throw ingError;

      toast({
        title: "Success",
        description: `Recipe ${editingRecipe ? 'updated' : 'created'} successfully.`,
      });

      fetchData();
      if (onUpdate) onUpdate();
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id, name) => {
    try {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
      
      await logNotification(user.id, "Recipe Deleted", `Deleted recipe.`, "warning");
      toast({ title: "Success", description: "Recipe deleted." });
      fetchData();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { materialId: '', quantity: '' }]
    });
  };

  const removeIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index][field] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ingredients: [{ materialId: '', quantity: '' }],
      outputQuantity: ''
    });
    setEditingRecipe(null);
    setIsOpen(false);
  };

  const startEdit = (recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients,
      outputQuantity: recipe.output_quantity.toString()
    });
    setIsOpen(true);
  };

  const getMaterialName = (materialId) => {
    const material = materials.find(m => m.id === materialId);
    return material ? `${material.name} (${material.unit})` : 'Unknown';
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading recipes...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Recipes</h1>
          <p className="text-slate-500">Standard operating procedures for production</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20">
              <Plus className="w-4 h-4 mr-2" />
              New Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecipe ? 'Edit' : 'Create'} Recipe</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="name">Recipe Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Sourdough Bread"
                      required
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description..."
                      className="rounded-lg"
                    />
                  </div>
                   <div className="space-y-2 col-span-2">
                    <Label htmlFor="outputQuantity">Batch Output Quantity</Label>
                    <Input
                      id="outputQuantity"
                      type="number"
                      step="0.01"
                      value={formData.outputQuantity}
                      onChange={(e) => setFormData({ ...formData, outputQuantity: e.target.value })}
                      placeholder="How many units does one batch produce?"
                      required
                      className="rounded-lg"
                    />
                  </div>
              </div>
              
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-slate-900 font-semibold">Ingredients per Batch</Label>
                  <Button type="button" size="sm" onClick={addIngredient} variant="outline" className="h-8">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                        <Label className="text-xs text-slate-500">Material</Label>
                        <select
                        value={ingredient.materialId}
                        onChange={(e) => updateIngredient(index, 'materialId', e.target.value)}
                        className="flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                        required
                        >
                        <option value="">Select Material</option>
                        {materials.map(material => (
                            <option key={material.id} value={material.id}>
                            {material.name} ({material.unit})
                            </option>
                        ))}
                        </select>
                    </div>
                    <div className="w-32 space-y-1">
                         <Label className="text-xs text-slate-500">Qty</Label>
                         <Input
                            type="number"
                            step="0.01"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            placeholder="0.00"
                            className="rounded-lg"
                            required
                        />
                    </div>
                    
                    {formData.ingredients.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeIngredient(index)}
                        className="h-10 w-10 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg h-11">
                  {editingRecipe ? 'Save Changes' : 'Create Recipe'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {recipes.length > 0 ? (
          recipes.map((recipe, index) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-5 flex-1">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-violet-100">
                      <BookOpen className="w-7 h-7 text-violet-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="font-bold text-slate-900 text-lg">{recipe.name}</h3>
                      <p className="text-slate-500 text-sm mb-3 mt-1">{recipe.description || 'No description provided'}</p>
                      
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                          {recipe.ingredients.length} Ingredients
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">
                          Output: {recipe.output_quantity} units
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
                      className="rounded-full h-8 w-8 p-0"
                    >
                      {expandedRecipe === recipe.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(recipe)}
                      className="rounded-full h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(recipe.id, recipe.name)}
                      className="rounded-full h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                {expandedRecipe === recipe.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <h4 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-400"/>
                            Ingredient Composition
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {recipe.ingredients.map((ingredient, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-slate-700 text-sm font-medium">{getMaterialName(ingredient.materialId)}</span>
                            <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded-md shadow-sm text-xs border border-slate-100">{ingredient.quantity}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-900 font-medium text-lg">No recipes found</p>
                <p className="text-slate-400 text-sm">Create your first recipe to start producing</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default Recipes;