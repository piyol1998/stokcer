import React, { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart as ShoppingCartIcon, X, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ShoppingCart = () => {
  const { toast } = useToast();
  const location = useLocation();
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    getCartTotal, 
    clearCart, 
    isCartOpen, 
    setIsCartOpen 
  } = useCart();

  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) {
      toast({
        title: 'Your cart is empty',
        description: 'Add some products to your cart before checking out.',
        variant: 'destructive',
      });
      return;
    }

    // API removed - placeholder for checkout
    toast({
      title: 'Checkout Unavailable',
      description: 'The checkout API has been removed. This is a demo mode.',
    });
    
  }, [cartItems, toast]);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Cart Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative h-full w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <ShoppingCartIcon className="h-6 w-6 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Your Cart</h2>
              </div>
              <Button onClick={() => setIsCartOpen(false)} variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-grow p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {cartItems.length === 0 ? (
                <div className="text-center text-slate-500 h-full flex flex-col items-center justify-center">
                  <div className="bg-slate-800 p-6 rounded-full mb-4">
                    <ShoppingCartIcon size={48} className="text-slate-600" />
                  </div>
                  <p className="text-lg font-medium">Your cart is empty.</p>
                  <Button 
                    variant="link" 
                    className="text-indigo-400 mt-2"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                cartItems.map(item => (
                  <div key={item.variant.id} className="flex gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800">
                      <img 
                        src={item.product.image} 
                        alt={item.product.title} 
                        className="h-full w-full object-cover" 
                      />
                    </div>
                    <div className="flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-white line-clamp-1">{item.product.title}</h3>
                        <p className="text-sm text-slate-400">{item.variant.title}</p>
                      </div>
                      <div className="flex items-end justify-between mt-2">
                        <p className="text-indigo-400 font-bold">
                          {item.variant.price_formatted}
                        </p>
                        
                        <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-1 border border-slate-700">
                          <button 
                            onClick={() => updateQuantity(item.variant.id, Math.max(1, item.quantity - 1))}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.variant.id)}
                      className="text-slate-500 hover:text-red-400 self-start p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-slate-800 bg-slate-900">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-2xl font-bold text-white">{getCartTotal()}</span>
                </div>
                <div className="space-y-3">
                  <Button onClick={handleCheckout} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 text-lg shadow-lg shadow-indigo-900/20">
                    Proceed to Checkout
                  </Button>
                  <Button 
                    onClick={clearCart} 
                    variant="ghost" 
                    className="w-full text-slate-500 hover:text-red-400 hover:bg-slate-800"
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShoppingCart;