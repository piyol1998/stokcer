import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const SubscriptionSuccessPage = () => {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full bg-[#1e293b] border border-indigo-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-indigo-500/10"
      >
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Upgrade Successful!</h1>
        <p className="text-slate-400 mb-8">
          Welcome to Premium. Your account has been instantly upgraded with all advanced features unlocked.
        </p>
        
        <div className="space-y-3">
          <Link to="/dashboard">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg">
              Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default SubscriptionSuccessPage;