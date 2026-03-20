import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Boxes, AlertTriangle, CheckCircle, Search, Edit2, DollarSign, Trash2, ImagePlus, X, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

function StockDashboard() {
  const { user, ownerId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Price State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newPrice, setNewPrice] = useState('');

  // Photo Upload State
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Full Image View State
  const [viewingPhoto, setViewingPhoto] = useState(null);

  useEffect(() => {
    if (ownerId) {
      fetchItems();
    }
  }, [ownerId]);

  const fetchItems = async () => {
    if (!ownerId) return;
    
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .eq('user_id', ownerId)
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

  const handleDeleteStock = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus produk "${name}" dari etalase?`)) return;

    try {
      const { error } = await supabase.from('stocks').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: "Berhasil", description: `Produk "${name}" dihapus.` });
      fetchItems();
    } catch (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  // === Photo Handlers ===
  const openPhotoDialog = (item) => {
    setPhotoTarget(item);
    setPhotoFile(null);
    setPhotoPreview(item.image_url || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsPhotoDialogOpen(true);
  };

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSavePhoto = async () => {
    if (!photoTarget) return;
    setUploadingPhoto(true);

    try {
      let photoUrl = photoPreview;

      // If a new file was selected, upload it
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `stock-${photoTarget.id}-${Date.now()}.${fileExt}`;
        const filePath = `stock-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, photoFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ title: "Error", description: "Gagal mengupload foto.", variant: "destructive" });
          return;
        }

        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
        photoUrl = urlData?.publicUrl || null;
      }

      // If photo was removed
      if (!photoPreview && !photoFile) {
        photoUrl = null;
      }

      // Save image_url to the stocks table
      const { error } = await supabase
        .from('stocks')
        .update({ image_url: photoUrl })
        .eq('id', photoTarget.id);

      if (error) {
        // If column doesn't exist, show helpful error
        if (error.code === '42703' || error.message?.includes('image_url')) {
          toast({
            title: "Kolom Belum Ada",
            description: "Tambahkan kolom 'image_url' (tipe text) ke tabel 'stocks' di Supabase Dashboard.",
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      toast({ title: "Berhasil", description: "Foto produk berhasil disimpan." });
      setIsPhotoDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error('Save photo error:', error);
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
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

      {/* Product Grid View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item) => {
          const isLow = item.quantity <= 10;
          return (
            <div key={item.id} className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden shadow-lg hover:shadow-xl hover:border-indigo-500/30 transition-all group flex flex-col">
              {/* Photo Section */}
              <div 
                className="relative w-full bg-slate-900/80 flex items-center justify-center cursor-pointer overflow-hidden"
                style={{ minHeight: '160px' }}
                onClick={() => item.image_url ? setViewingPhoto(item) : openPhotoDialog(item)}
              >
                {item.image_url ? (
                  <>
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full max-h-48 object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {/* Hover overlay to add/change photo */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openPhotoDialog(item); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-lg hover:scale-110"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div 
                    onClick={(e) => { e.stopPropagation(); openPhotoDialog(item); }}
                    className="w-full h-40 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <div className="p-3 rounded-full bg-slate-800/80 group-hover:bg-indigo-600/20 transition-colors">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Tambah Foto</span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{item.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.category || 'Produk'}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Stok</p>
                    <p className="text-lg font-bold text-white">{item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Harga Jual</p>
                    <p className="text-sm font-mono text-emerald-400 font-bold">
                      {item.selling_price ? `Rp ${item.selling_price.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                  {isLow ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      Low
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" />
                      Ok
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEditPrice(item)}
                      className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-colors"
                      title="Edit Harga"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteStock(item.id, item.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            Data stok kosong
          </div>
        )}
      </div>

      {/* Edit Price Dialog */}
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

      {/* Photo Upload Dialog */}
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              Foto Produk: {photoTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {photoPreview ? (
              <div className="relative group rounded-xl overflow-hidden border-2 border-indigo-500/30 bg-slate-900/80 flex items-center justify-center">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full max-h-72 object-contain p-2"
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
                className="relative cursor-pointer border-2 border-dashed border-slate-600 hover:border-indigo-500/50 rounded-xl p-10 transition-all duration-300 bg-slate-900/30 hover:bg-indigo-500/5 group"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="p-4 rounded-full bg-slate-800 group-hover:bg-indigo-600/20 transition-colors">
                    <ImagePlus className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPhotoDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSavePhoto} disabled={uploadingPhoto} className="bg-indigo-600 hover:bg-indigo-700">
              {uploadingPhoto ? 'Menyimpan...' : 'Simpan Foto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Image View Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="bg-[#0f172a] text-slate-100 border-slate-700 max-w-2xl p-2">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-lg">{viewingPhoto?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {viewingPhoto?.image_url && (
              <img
                src={viewingPhoto.image_url}
                alt={viewingPhoto.name}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StockDashboard;