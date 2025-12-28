import React from 'react';
import { Helmet } from 'react-helmet';
import ProductsList from '@/components/ProductsList';
import ShoppingCart from '@/components/ShoppingCart';
import { useCart } from '@/hooks/useCart';
import { ShoppingCart as ShoppingCartIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const StorePage = () => {
  const { setIsCartOpen, getCartCount } = useCart();
  const count = getCartCount();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30">
      <Helmet>
        <title>Stokcer Store - Premium Products</title>
        <meta name="description" content="Browse our exclusive collection of premium products." />
      </Helmet>

      <ShoppingCart />

      {/* Navbar */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Stokcer<span className="text-slate-400 font-light text-sm ml-1">Store</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCartOpen(true)}
              className="relative text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-slate-950">
                  {count}
                </span>
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-slate-900 border-b border-slate-800 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557821552-17105176677c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="container mx-auto px-4 py-20 relative z-10 text-center">
           <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
             Discover <span className="text-indigo-400">Excellence</span>
           </h1>
           <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
             Explore our curated collection of premium items designed for your lifestyle.
           </p>
        </div>
      </div>

      {/* Product Grid */}
      <main className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">New Arrivals</h2>
          <div className="hidden md:flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
             <Search className="h-4 w-4 text-slate-500 ml-2" />
             <input 
                type="text" 
                placeholder="Search products..." 
                className="bg-transparent border-none text-sm text-white focus:outline-none w-48 placeholder:text-slate-600"
             />
          </div>
        </div>
        
        <ProductsList />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
           <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Stokcer Store. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default StorePage;