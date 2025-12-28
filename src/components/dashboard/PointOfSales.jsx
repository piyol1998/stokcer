import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { ShoppingCart, Search, Trash2, Plus, Minus, CreditCard, Banknote, CheckCircle2, RotateCcw, PackageX, ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

function PointOfSales() {
  const { user, ownerId } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [ownerId]);

  const fetchProducts = async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stocks')
        .select('*')
        .eq('user_id', ownerId) 
        .gt('quantity', 0)
        .gt('selling_price', 0)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast({ title: "Stock Limit", description: "Cart quantity exceeds available stock.", variant: "destructive" });
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    // Optional: give visual feedback or vibration
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty < 1) return item; 
          
          const product = products.find(p => p.id === productId);
          if (product && newQty > product.quantity) {
             toast({ title: "Max Stock", description: "Insufficient stock.", variant: "destructive" });
             return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const clearCart = () => setCart([]);
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);
  const total = subtotal;

  const handleCheckout = () => {
      setAmountPaid('');
      setIsCheckoutOpen(true);
      setIsMobileCartOpen(false); // Close mobile cart
  };

  const processPayment = async () => {
      const paid = parseFloat(amountPaid);
      if (isNaN(paid) || paid < total) {
          toast({ title: "Insufficient Payment", description: "Amount paid is less than total.", variant: "destructive" });
          return;
      }

      setIsProcessing(true);
      try {
          const change = paid - total;
          const itemsPayload = cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.selling_price
          }));

          const { data, error } = await supabase.rpc('process_sale', {
              p_owner_id: ownerId,
              p_total_amount: total,
              p_amount_paid: paid,
              p_change_returned: change,
              p_payment_method: paymentMethod,
              p_items: itemsPayload
          });

          if (error) throw error;

          setLastTransaction({
              code: data.transaction_code,
              change: change,
              total: total
          });

          setIsCheckoutOpen(false);
          clearCart();
          fetchProducts();
          toast({ title: "Success", description: "Transaction completed." });

      } catch (error) {
          console.error(error);
          toast({ title: "Failed", description: error.message, variant: "destructive" });
      } finally {
          setIsProcessing(false);
      }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalItemsInCart = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Success View
  if (lastTransaction) {
      return (
          <div className="h-full flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-300 p-4">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-emerald-500" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Payment Successful!</h2>
              <div className="bg-[#1e293b] p-6 md:p-8 rounded-xl border border-slate-700 w-full max-w-sm">
                  <p className="text-slate-400 text-sm mb-1">Transaction Code</p>
                  <p className="text-lg md:text-xl font-mono text-white font-bold mb-6">{lastTransaction.code}</p>
                  
                  <div className="flex justify-between items-center mb-2 text-sm md:text-base">
                      <span className="text-slate-400">Total</span>
                      <span className="text-white font-bold">Rp {lastTransaction.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                      <span className="text-emerald-400 font-bold text-base md:text-lg">Change</span>
                      <span className="text-emerald-400 font-bold text-xl md:text-2xl">Rp {lastTransaction.change.toLocaleString()}</span>
                  </div>
              </div>
              <Button 
                size="lg" 
                className="bg-indigo-600 hover:bg-indigo-700 mt-8"
                onClick={() => setLastTransaction(null)}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                New Transaction
              </Button>
          </div>
      );
  }

  // --- Cart Component (Reusable for Desktop & Mobile) ---
  const CartContent = () => (
      <div className="flex flex-col h-full bg-[#1e293b] lg:bg-[#1e293b] lg:rounded-2xl lg:border border-slate-700 shadow-2xl">
          <div className="p-4 md:p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-bold text-white">Cart ({totalItemsInCart})</h2>
              </div>
              <div className="flex gap-2">
                {cart.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 px-2 text-xs">
                        <Trash2 className="w-3 h-3 mr-1" /> Reset
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-400" onClick={() => setIsMobileCartOpen(false)}>
                    <X className="w-5 h-5" />
                </Button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 min-h-[200px]">
                      <ShoppingCart className="w-12 h-12 mb-3" />
                      <p>Cart is empty</p>
                  </div>
              ) : (
                  <AnimatePresence>
                      {cart.map(item => (
                          <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-[#0f172a] p-3 rounded-lg border border-slate-800 flex flex-col gap-2"
                          >
                              <div className="flex justify-between items-start">
                                  <span className="text-sm font-medium text-white line-clamp-1">{item.name}</span>
                                  <span className="text-sm font-bold text-white font-mono">Rp {(item.selling_price * item.quantity).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <div className="text-xs text-slate-500">@ Rp {item.selling_price.toLocaleString()}</div>
                                  <div className="flex items-center gap-3 bg-slate-800 rounded-md p-1">
                                      <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400">
                                          <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-xs font-bold w-4 text-center text-white">{item.quantity}</span>
                                      <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400">
                                          <Plus className="w-3 h-3" />
                                      </button>
                                  </div>
                              </div>
                          </motion.div>
                      ))}
                  </AnimatePresence>
              )}
          </div>

          <div className="p-4 md:p-5 bg-[#0f172a] border-t border-slate-800 lg:rounded-b-2xl space-y-4 shrink-0 pb-8 lg:pb-5">
              <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                      <span>Subtotal</span>
                      <span>Rp {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-white">
                      <span>Total</span>
                      <span>Rp {total.toLocaleString()}</span>
                  </div>
              </div>
              <Button 
                size="lg" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                  Pay Now
              </Button>
          </div>
      </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-4 lg:gap-6 relative">
      {/* Product Grid Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 lg:mb-6 gap-3">
              <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Point of Sales</h1>
                  <p className="text-slate-400 text-xs md:text-sm">Select products to add to cart</p>
              </div>
              <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                      className="bg-[#1e293b] border-slate-700 pl-10 text-white w-full" 
                      placeholder="Search products..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          {/* Scrollable Product List */}
          <div className="flex-1 overflow-y-auto pr-0 lg:pr-2 custom-scrollbar pb-20 lg:pb-0">
            {loading ? (
                <div className="flex items-center justify-center h-48 text-slate-500">Loading products...</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {filteredProducts.map(product => (
                        <motion.div
                            layout
                            key={product.id}
                            onClick={() => addToCart(product)}
                            whileTap={{ scale: 0.98 }}
                            className="bg-[#1e293b] border border-slate-700 p-3 md:p-4 rounded-xl cursor-pointer hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group flex flex-col justify-between h-[120px] md:h-[140px]"
                        >
                            <div>
                                <h3 className="font-semibold text-white text-sm md:text-base line-clamp-2 group-hover:text-indigo-400 transition-colors">{product.name}</h3>
                                <p className="text-[10px] md:text-xs text-slate-500 mt-1">{product.category || 'Item'}</p>
                            </div>
                            <div className="flex justify-between items-end mt-2 md:mt-4">
                                <div>
                                    <p className="text-emerald-400 font-bold font-mono text-sm md:text-base">Rp {product.selling_price.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-500">Stock: {product.quantity}</p>
                                </div>
                                <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                    <Plus className="w-3 h-3 md:w-4 md:h-4" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center h-48 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                            <PackageX className="w-10 h-10 mb-2 opacity-30" />
                            <p>No products found</p>
                        </div>
                    )}
                </div>
            )}
          </div>
      </div>

      {/* Desktop Sidebar Cart (Hidden on Mobile) */}
      <div className="hidden lg:block w-[350px] shrink-0">
         <CartContent />
      </div>

      {/* Mobile Floating Cart Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
          <Button 
            onClick={() => setIsMobileCartOpen(true)}
            size="lg" 
            className="rounded-full w-14 h-14 bg-indigo-600 hover:bg-indigo-700 shadow-2xl relative"
          >
              <ShoppingBag className="w-6 h-6" />
              {totalItemsInCart > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-[#0f172a]">
                      {totalItemsInCart}
                  </span>
              )}
          </Button>
      </div>

      {/* Mobile Cart Sheet/Drawer */}
      <AnimatePresence>
        {isMobileCartOpen && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileCartOpen(false)}
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-x-0 bottom-0 h-[85vh] z-50 lg:hidden rounded-t-2xl overflow-hidden"
                >
                    <CartContent />
                </motion.div>
            </>
        )}
      </AnimatePresence>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700 w-[95%] sm:max-w-md rounded-xl">
              <DialogHeader>
                  <DialogTitle className="text-xl">Payment</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                  <div className="text-center p-4 bg-indigo-900/20 rounded-xl border border-indigo-500/20">
                      <p className="text-sm text-indigo-300 mb-1">Total Amount</p>
                      <p className="text-3xl font-bold text-white font-mono">Rp {total.toLocaleString()}</p>
                  </div>

                  <div className="space-y-3">
                      <Label>Payment Method</Label>
                      <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setPaymentMethod('cash')}
                            className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${paymentMethod === 'cash' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                          >
                              <Banknote className="w-4 h-4" /> Cash
                          </button>
                          <button 
                            onClick={() => setPaymentMethod('qris')}
                            className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${paymentMethod === 'qris' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                          >
                              <CreditCard className="w-4 h-4" /> QRIS / Transfer
                          </button>
                      </div>
                  </div>

                  <div className="space-y-2">
                      <Label>Amount Received (Rp)</Label>
                      <Input 
                          autoFocus
                          type="number" 
                          className="bg-slate-800 border-slate-600 text-lg h-12" 
                          placeholder="0"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                      />
                      {amountPaid && parseFloat(amountPaid) >= total && (
                          <div className="flex justify-between items-center px-2 text-emerald-400 text-sm animate-in fade-in slide-in-from-top-1">
                              <span>Change:</span>
                              <span className="font-bold">Rp {(parseFloat(amountPaid) - total).toLocaleString()}</span>
                          </div>
                      )}
                  </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button 
                    onClick={processPayment} 
                    disabled={!amountPaid || parseFloat(amountPaid) < total || isProcessing}
                    className="bg-indigo-600 hover:bg-indigo-700 w-full sm:min-w-[120px]"
                  >
                      {isProcessing ? 'Processing...' : 'Confirm Payment'}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

export default PointOfSales;