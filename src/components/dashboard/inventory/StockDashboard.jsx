import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Boxes, AlertTriangle, CheckCircle, Search, Edit2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

function StockDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Price State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditPrice = (item) => {
    setEditingItem(item);
    setNewPrice(item.selling_price || '');
    setIsEditOpen(true);
  };

  const handleSavePrice = async () => {
    if (!editingItem) return;

    try {
      const priceVal = parseFloat(newPrice);
      if (isNaN(priceVal) || priceVal < 0) {
        toast({ title: "Error", description: "Harga tidak valid", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('stocks')
        .update({ selling_price: priceVal })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({ title: "Berhasil", description: `Harga jual ${editingItem.name} diperbarui.` });
      setIsEditOpen(false);
      fetchItems();
    } catch (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat dashboard stok...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Boxes className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Dashboard Stok Produk Jadi</h2>
        </div>
        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <Input 
              className="bg-[#1e293b] border-slate-700 pl-10 text-white" 
              placeholder="Cari produk..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#0f172a] border-b border-slate-700 text-slate-400">
                <th className="px-6 py-4 font-medium">Nama Produk</th>
                <th className="px-6 py-4 font-medium">Kategori</th>
                <th className="px-6 py-4 font-medium text-right">Stok</th>
                <th className="px-6 py-4 font-medium text-right">Harga Jual</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map((item, idx) => {
                 const isLow = item.quantity <= 10;
                 return (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                    <td className="px-6 py-4 text-slate-400">{item.category || 'Produk'}</td>
                    <td className="px-6 py-4 text-right font-bold text-white">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-mono">
                      {item.selling_price ? `Rp ${item.selling_price.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Low
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          Ok
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditPrice(item)}
                          className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20"
                        >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Set Harga
                        </Button>
                    </td>
                  </tr>
                 );
              })}
              {filtered.length === 0 && (
                <tr>
                   <td colSpan="6" className="px-6 py-12 text-center text-slate-500">Data stok kosong</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
         <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700">
             <DialogHeader>
                 <DialogTitle>Atur Harga Jual</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4">
                 <div className="space-y-2">
                     <Label>Nama Produk</Label>
                     <Input disabled value={editingItem?.name || ''} className="bg-slate-800 border-slate-600 opacity-50"/>
                 </div>
                 <div className="space-y-2">
                     <Label>Harga Jual (Rp)</Label>
                     <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            type="number" 
                            className="bg-slate-800 border-slate-600 pl-9 font-mono text-lg text-emerald-400" 
                            placeholder="0"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                        />
                     </div>
                     <p className="text-xs text-slate-500">Harga ini akan digunakan pada menu Kasir (POS).</p>
                 </div>
             </div>
             <DialogFooter>
                 <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Batal</Button>
                 <Button onClick={handleSavePrice} className="bg-indigo-600 hover:bg-indigo-700">Simpan Harga</Button>
             </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}

export default StockDashboard;