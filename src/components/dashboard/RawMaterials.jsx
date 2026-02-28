import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { logNotification } from '@/lib/notificationUtils';

function RawMaterials({ onUpdate }) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'kg',
    minStock: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) fetchMaterials();
  }, [user]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Gagal memuat data bahan baku", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      user_id: user.id,
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      min_stock: parseFloat(formData.minStock),
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('raw_materials')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;

        await logNotification(user.id, "Material Updated", `Updated ${payload.name} details.`, "info");
        toast({ title: "Updated", description: "Material updated successfully." });
      } else {
        const { error } = await supabase
          .from('raw_materials')
          .insert([payload]);
        if (error) throw error;
        
        await logNotification(user.id, "New Material Added", `Added ${payload.name} to inventory.`, "success");
        toast({ title: "Created", description: "New material added successfully." });
      }
      
      fetchMaterials();
      if (onUpdate) onUpdate();
      resetForm();
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id, name) => {
    try {
      const { error } = await supabase.from('raw_materials').delete().eq('id', id);
      if (error) throw error;
      
      await logNotification(user.id, "Material Deleted", `Removed material from inventory.`, "warning");
      toast({ title: "Deleted", description: "Material removed." });
      fetchMaterials();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus bahan baku", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', quantity: '', unit: 'kg', minStock: '' });
    setEditingItem(null);
    setIsOpen(false);
  };

  const startEdit = (material) => {
    setEditingItem(material);
    setFormData({
      name: material.name,
      quantity: material.quantity.toString(),
      unit: material.unit,
      minStock: material.min_stock.toString()
    });
    setIsOpen(true);
  };

  const filteredMaterials = materials.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-8 text-center text-slate-500">Loading materials...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Raw Materials</h1>
          <p className="text-slate-500">Manage ingredients for your production</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input 
                    type="text" 
                    placeholder="Search materials..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-full md:w-64"
                />
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Material
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Add'} Material</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Material Name</Label>
                    <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Flour"
                    required
                    className="rounded-lg"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="100"
                        required
                        className="rounded-lg"
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <select
                        id="unit"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="kg">kg</option>
                        <option value="gram">gram</option>
                        <option value="liter">liter</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                    </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="minStock">Minimum Stock Alert</Label>
                    <Input
                    id="minStock"
                    type="number"
                    step="0.01"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    placeholder="10"
                    required
                    className="rounded-lg"
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                    {editingItem ? 'Update' : 'Save'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                    </Button>
                </div>
                </form>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((material, index) => (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-blue-100">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(material)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                  >
                    <Edit className="w-4 h-4 text-slate-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(material.id, material.name)}
                    className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <h3 className="font-bold text-lg text-slate-900 mb-4">{material.name}</h3>
              
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Available</span>
                  <span className="font-bold text-slate-900">
                    {material.quantity} <span className="text-slate-500 font-normal">{material.unit}</span>
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${material.quantity <= material.min_stock ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min((material.quantity / (material.min_stock * 3)) * 100, 100)}%`}}
                    ></div>
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-slate-400">Min: {material.min_stock}</span>
                   {material.quantity <= material.min_stock && (
                    <span className="text-red-600 font-medium flex items-center gap-1">
                        Low Stock
                    </span>
                   )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <Package className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-900 font-medium text-lg">No materials found</p>
            <p className="text-slate-400 text-sm">Add your first raw material to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RawMaterials;