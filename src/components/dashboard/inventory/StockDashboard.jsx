import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Boxes, AlertTriangle, CheckCircle, Search, Edit2, DollarSign, Trash2, ImagePlus, X, Camera, RefreshCw, ShoppingBag, Filter, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

function StockDashboard() {
  const { user, ownerId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ready'); // ready, sold-out, all

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

  // Transaction State
  const [isTransOpen, setIsTransOpen] = useState(false);
  const [transItem, setTransItem] = useState(null);
  const [transType, setTransType] = useState('sold'); // 'sold' | 'promo'
  const [transQty, setTransQty] = useState('1');
  const [isTransmitting, setIsTransmitting] = useState(false);

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

  const openTransaction = (item) => {
    setTransItem(item);
    setTransType('sold');
    setTransQty('1');
    setIsTransOpen(true);
  };

  const handleTransaction = async () => {
    if (!transItem || !transQty) return;
    const qty = parseInt(transQty);
    if (isNaN(qty) || qty <= 0) {
        toast({ title: "Error", description: "Jumlah tidak valid", variant: "destructive" });
        return;
    }
    if (qty > transItem.quantity) {
        toast({ title: "Stok Kurang", description: `Sisa stok hanya ${transItem.quantity} pcs.`, variant: "destructive" });
        return;
    }

    setIsTransmitting(true);
    try {
        // We update quantity and specific counter.
        // We try updating directly. If columns don't exist, this might fail, 
        // but we assume the system will have them or we'll add them.
        const updateData = {
            quantity: transItem.quantity - qty,
            [transType === 'sold' ? 'total_sold' : 'total_promo']: (transItem[transType === 'sold' ? 'total_sold' : 'total_promo'] || 0) + qty
        };

        const { error } = await supabase
            .from('stocks')
            .update(updateData)
            .eq('id', transItem.id);

        if (error) throw error;

        toast({ 
            title: "Berhasil Dicatat", 
            description: `${qty} botol ${transItem.name} dicatat sebagai ${transType === 'sold' ? 'Terjual' : 'Promosi'}.` 
        });
        setIsTransOpen(false);
        fetchItems();
    } catch (error) {
        console.error("Trans error:", error);
        toast({ title: "Gagal", description: "Gagal mencatat transaksi. Pastikan kolom database tersedia.", variant: "destructive" });
    } finally {
        setIsTransmitting(false);
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

  const filtered = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'ready') return matchesSearch && i.quantity > 0;
    if (activeTab === 'sold-out') return matchesSearch && i.quantity === 0;
    return matchesSearch;
  });

  const readyCount = items.filter(i => i.quantity > 0).length;
  const soldOutCount = items.filter(i => i.quantity === 0).length;

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat dashboard stok...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
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

      {/* Tabs & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="ready" className="data-[state=active]:bg-indigo-600">
              Ready Stock
              <Badge className="ml-2 bg-indigo-500/20 text-white border-none h-4 px-1.5 text-[10px]">{readyCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="sold-out" className="data-[state=active]:bg-pink-600">
              Stok Habis
              <Badge className="ml-2 bg-pink-500/20 text-white border-none h-4 px-1.5 text-[10px]">{soldOutCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-4 px-2">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Produk</p>
            <p className="text-sm font-bold text-white">{items.length}</p>
          </div>
        </div>
      </div>

      {/* Product Grid View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item) => {
          const isLow = item.quantity > 0 && item.quantity <= 10;
          const isSoldOut = item.quantity === 0;

          return (
            <div key={item.id} className={`bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden shadow-lg hover:shadow-xl transition-all group flex flex-col ${isSoldOut ? 'opacity-70 grayscale-[0.5]' : 'hover:border-indigo-500/30'}`}>
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

                {/* Sold Out Overlay Badge */}
                {isSoldOut && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-red-500 text-white border-none shadow-lg px-2 py-0.5 text-[10px] uppercase font-bold tracking-tighter">STOK HABIS</Badge>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{item.name}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.category || 'Produk Jadi'}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Stok</p>
                    <p className={`text-lg font-bold ${isSoldOut ? 'text-red-400' : 'text-white'}`}>{item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Harga Jual</p>
                    <p className="text-sm font-mono text-emerald-400 font-bold">
                      {item.selling_price ? `Rp ${item.selling_price.toLocaleString()}` : '-'}
                    </p>
                  </div>
                </div>

                {/* Sell/Promo Stats */}
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/30 rounded-lg border border-slate-700/30">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Terjual</span>
                    <span className="text-xs font-black text-emerald-400">{(item.total_sold || 0).toLocaleString()} <span className="text-[9px] font-normal text-slate-500">pcs</span></span>
                  </div>
                  <div className="flex flex-col border-l border-slate-700/50 pl-2">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Promo/Endorse</span>
                    <span className="text-xs font-black text-purple-400">{(item.total_promo || 0).toLocaleString()} <span className="text-[9px] font-normal text-slate-500">pcs</span></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                  {isSoldOut ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                      <X className="w-3 h-3" />
                      Sold Out
                    </span>
                  ) : isLow ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <AlertTriangle className="w-3 h-3" />
                      Low Stok
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="w-3 h-3" />
                      Tersedia
                    </span>
                  )}
                   <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openTransaction(item)}
                      className="p-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all border border-indigo-600/20"
                      title="Catat Terjual/Promo"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => openEditPrice(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400"
                      title="Edit Harga"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteStock(item.id, item.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
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
          <div className="col-span-full text-center py-20 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
            <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {activeTab === 'sold-out' ? 'Tidak ada produk yang habis terjual' : 'Belum ada produk siap jual'}
            </p>
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

      {/* Manual Transaction Dialog */}
      <Dialog open={isTransOpen} onOpenChange={setIsTransOpen}>
         <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700">
             <DialogHeader>
                 <DialogTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-400" />
                    Kelola Transaksi Stok
                 </DialogTitle>
             </DialogHeader>
             <div className="space-y-6 py-4">
                 <div className="space-y-4">
                    <div className="flex flex-col p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Produk</span>
                        <span className="text-white font-bold">{transItem?.name}</span>
                        <div className="flex gap-4 mt-2">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500">Sisa Stok</span>
                                <span className="text-sm font-bold text-slate-200">{transItem?.quantity} pcs</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Jenis Transaksi</Label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
                            <button 
                                onClick={() => setTransType('sold')}
                                className={`py-2 text-xs font-bold rounded-md transition-all ${transType === 'sold' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Penjualan / Laku
                            </button>
                            <button 
                                onClick={() => setTransType('promo')}
                                className={`py-2 text-xs font-bold rounded-md transition-all ${transType === 'promo' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Promosi / Endorse
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Jumlah {transType === 'sold' ? 'Terjual' : 'Promo'} (pcs)</Label>
                        <Input 
                            type="number" 
                            className="bg-slate-800 border-slate-700 h-11 text-lg font-bold"
                            value={transQty}
                            max={transItem?.quantity}
                            onChange={(e) => setTransQty(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500 italic">
                            * Stok akan otomatis berkurang sebanyak jumlah di atas.
                        </p>
                    </div>
                 </div>
             </div>
             <DialogFooter className="gap-2 sm:gap-0">
                 <Button variant="ghost" onClick={() => setIsTransOpen(false)} disabled={isTransmitting}>Batal</Button>
                 <Button 
                    onClick={handleTransaction} 
                    disabled={isTransmitting || !transQty || parseInt(transQty) <= 0}
                    className={`h-11 px-8 ${transType === 'sold' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                 >
                    {isTransmitting ? 'Memproses...' : `Konfirmasi ${transType === 'sold' ? 'Penjualan' : 'Promosi'}`}
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