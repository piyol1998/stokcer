import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const SuccessPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Helmet>
        <title>Order Successful - Stokcer Store</title>
      </Helmet>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Thank You!</h1>
        <p className="text-xl text-indigo-400 mb-6 font-medium">Your order has been placed.</p>
        
        <div className="bg-slate-950 rounded-xl p-6 mb-8 border border-slate-800">
           <p className="text-slate-400 text-sm mb-2">Order Status</p>
           <p className="text-white font-semibold">Processing</p>
           <div className="mt-4 text-xs text-slate-500">
             You will receive an email confirmation shortly with your order details and tracking information.
           </div>
        </div>

        <div className="space-y-3">
          <Link to="/store">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6">
              <ShoppingBag className="mr-2 h-5 w-5" /> Continue Shopping
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="w-full text-slate-400 hover:text-white hover:bg-slate-800">
              Return to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SuccessPage;