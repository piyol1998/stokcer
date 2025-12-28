import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import ShoppingCart from '@/components/ShoppingCart';
import { ShoppingCart as ShoppingCartIcon, Loader2, ArrowLeft, CheckCircle, Minus, Plus, XCircle, ChevronLeft, ChevronRight, Truck, ShieldCheck } from 'lucide-react';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzc0MTUxIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K";

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToCart, setIsCartOpen } = useCart();
  const { toast } = useToast();

  const handleAddToCart = useCallback(async () => {
    if (product && selectedVariant) {
      const availableQuantity = selectedVariant.inventory_quantity;
      try {
        await addToCart(product, selectedVariant, quantity, availableQuantity);
        toast({
          title: "Added to Cart! 🛒",
          description: `${quantity} x ${product.title} added.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Oh no! Something went wrong.",
          description: error.message,
        });
      }
    }
  }, [product, selectedVariant, quantity, addToCart, toast]);

  const handleQuantityChange = useCallback((amount) => {
    setQuantity(prevQuantity => {
        const newQuantity = prevQuantity + amount;
        if (newQuantity < 1) return 1;
        return newQuantity;
    });
  }, []);

  const handlePrevImage = useCallback(() => {
    if (product?.images?.length > 1) {
      setCurrentImageIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1);
    }
  }, [product?.images?.length]);

  const handleNextImage = useCallback(() => {
    if (product?.images?.length > 1) {
      setCurrentImageIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1);
    }
  }, [product?.images?.length]);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch from Supabase Stocks
        const { data: stock, error: dbError } = await supabase
          .from('stocks')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) throw dbError;
        if (!stock) throw new Error("Product not found");

        const formattedProduct = {
          id: stock.id,
          title: stock.name,
          subtitle: stock.category || 'Product',
          description: '<p>Description not available for this item.</p>',
          images: stock.image_url ? [{ url: stock.image_url }] : [],
          purchasable: true,
          variants: [{
            id: stock.id,
            title: 'Standard',
            price: stock.selling_price || 0,
            price_formatted: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(stock.selling_price || 0),
            inventory_quantity: stock.quantity || 0,
            manage_inventory: true
          }]
        };

        setProduct(formattedProduct);
        setSelectedVariant(formattedProduct.variants[0]);

      } catch (err) {
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <Loader2 className="h-16 w-16 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center justify-center">
        <div className="text-center text-red-400 p-8 bg-slate-900 rounded-2xl border border-red-900/50 max-w-md">
          <XCircle className="mx-auto h-16 w-16 mb-4" />
          <p className="mb-6 text-lg">Unable to load product.</p>
          <Button onClick={() => navigate('/store')} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
             Return to Store
          </Button>
        </div>
      </div>
    );
  }

  const price = selectedVariant?.price_formatted;
  const availableStock = selectedVariant ? selectedVariant.inventory_quantity : 0;
  const isStockManaged = selectedVariant?.manage_inventory ?? false;
  const canAddToCart = !isStockManaged || quantity <= availableStock;
  const currentImage = product.images && product.images.length > 0 ? product.images[currentImageIndex] : { url: placeholderImage };
  const hasMultipleImages = product.images && product.images.length > 1;

  return (
    <>
      <Helmet>
        <title>{product.title} - Our Store</title>
        <meta name="description" content={product.title} />
      </Helmet>
      
      <div className="min-h-screen bg-slate-950 text-white">
        <ShoppingCart />
        
        <header className="sticky top-0 z-40 w-full backdrop-blur border-b border-slate-800 bg-slate-950/80">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/store" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-medium">
              <ArrowLeft size={18} />
              Back to Store
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)} className="text-white">
                <ShoppingCartIcon />
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
                <img
                  src={currentImage.url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />

                {hasMultipleImages && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col">
              <h1 className="text-4xl font-bold text-white mb-2">{product.title}</h1>
              <p className="text-lg text-slate-400 mb-8">{product.subtitle}</p>

              <div className="flex items-baseline gap-4 mb-8 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                <span className="text-4xl font-bold text-white">{price}</span>
              </div>

              <div className="flex flex-col gap-6 p-6 bg-slate-900 rounded-2xl border border-slate-800 mb-8">
                <div className="flex items-center justify-between">
                   <span className="text-sm font-medium text-slate-300">Quantity</span>
                   <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800">
                      <button onClick={() => handleQuantityChange(-1)} className="p-3 text-slate-400 hover:text-white transition-colors"><Minus size={16} /></button>
                      <span className="w-12 text-center font-bold text-white">{quantity}</span>
                      <button onClick={() => handleQuantityChange(1)} className="p-3 text-slate-400 hover:text-white transition-colors"><Plus size={16} /></button>
                    </div>
                </div>

                <Button 
                  onClick={handleAddToCart} 
                  size="lg" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 text-lg shadow-xl shadow-indigo-900/20 transition-all hover:scale-[1.02]" 
                  disabled={!canAddToCart || !product.purchasable}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" /> 
                  {product.purchasable ? 'Add to Cart' : 'Unavailable'}
                </Button>

                {isStockManaged && canAddToCart && product.purchasable && (
                  <p className="text-sm text-green-400 mt-3 flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> {availableStock} in stock!
                  </p>
                )}

                {isStockManaged && !canAddToCart && product.purchasable && (
                   <p className="text-sm text-yellow-400 mt-3 flex items-center justify-center gap-2">
                    <XCircle size={16} /> Not enough stock. Only {availableStock} left.
                  </p>
                )}
              </div>
              
              <div className="prose prose-invert prose-slate max-w-none">
                <h3 className="text-xl font-bold text-white mb-4">Description</h3>
                <div dangerouslySetInnerHTML={{ __html: product.description }} className="text-slate-300 leading-relaxed" />
              </div>

            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
}

export default ProductDetailPage;