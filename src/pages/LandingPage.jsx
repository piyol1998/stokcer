import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, ShieldCheck, Zap, Globe, Package, Users, CheckCircle2, ChevronRight, Coins, Factory, Lock, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <Coins className="w-6 h-6 text-yellow-400" />,
      title: "Total Capital Tracking",
      desc: "Know exactly how much money is sitting in your warehouse. Track raw material value vs. finished goods instantly."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-emerald-400" />,
      title: "Stop 'Boncos' (Financial Loss)",
      desc: "Prevent unknown losses. Our system tracks every gram of material used, spotting waste or theft immediately."
    },
    {
      icon: <Factory className="w-6 h-6 text-blue-400" />,
      title: "Production Monitoring",
      desc: "Link recipes to production. When you make a product, raw materials are auto-deducted. No more manual stock cards."
    },
    {
      icon: <Lock className="w-6 h-6 text-red-400" />,
      title: "Role-Based Security",
      desc: "Give specific access to Warehouse Staff, Production, and Admins. Keep sensitive financial data for Owner eyes only."
    }
  ];

  const roles = [
    {
      role: "Business Owner",
      focus: "Financial Clarity",
      desc: "View real-time P&L, total asset valuation, and catch suspicious patterns before they drain your capital."
    },
    {
      role: "Warehouse Staff",
      focus: "Accountability",
      desc: "Strict check-in/check-out logs. Every item moved is recorded against their user ID."
    },
    {
      role: "Production Team",
      focus: "Efficiency",
      desc: "One-click 'Produce' button automatically calculates and deducts the exact raw materials needed."
    },
    {
      role: "Admin / Cashier",
      focus: "Cash Flow",
      desc: "Record sales transactions that instantly update inventory levels and revenue charts."
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      <Helmet>
        <title>Stokcer - Financial Control & Inventory System</title>
        <meta name="description" content="Stop financial leaks. Track capital, monitor employees, and manage inventory with precision." />
      </Helmet>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/80 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Stokcer
              </span>
           </div>
           
           <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
              <a href="#benefits" className="hover:text-white transition-colors">Benefits</a>
              <a href="#roles" className="hover:text-white transition-colors">For Teams</a>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Button 
                onClick={() => navigate('/login?mode=signup')}
                className="bg-white text-slate-900 hover:bg-slate-200 rounded-full px-6"
              >
                Start Free Trial
              </Button>
           </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-[100%] blur-[120px] -z-10 opacity-50" />
        
        <div className="max-w-4xl mx-auto text-center">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6 }}
           >
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium mb-8">
               <AlertTriangle className="w-3 h-3 fill-red-300" />
               <span>Stop losing money to untracked inventory</span>
             </div>
             
             <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
               Stop Guessing Your Profits.<br />
               Start Controlling <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Your Capital</span>.
             </h1>
             
             <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
               The financial management system for serious businesses. Track every Rupiah of modal, monitor employee activity, and prevent "boncos" (losses) with military-grade precision.
             </p>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  onClick={() => navigate('/login?mode=signup')}
                  className="w-full sm:w-auto h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
                >
                  Start Auditing Your Business
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto h-14 px-8 text-lg border-slate-700 bg-transparent text-white hover:bg-slate-800 rounded-full"
                >
                  View Live Demo <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
             </div>
             
             <p className="mt-6 text-sm text-slate-500 flex items-center justify-center gap-6">
               <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Anti-Theft Audit Logs</span>
               <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Real-time Valuation</span>
             </p>
           </motion.div>
        </div>
      </section>

      {/* Interface Preview (Glassmorphism) */}
      <section className="px-4 mb-32">
         <motion.div 
           initial={{ opacity: 0, y: 40 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
           className="max-w-6xl mx-auto relative"
         >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent rounded-2xl blur-xl" />
            <div className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-2 md:p-4 shadow-2xl">
               <img 
                 alt="Financial Dashboard showing capital breakdown and inventory value" 
                 className="rounded-lg border border-slate-800/50 w-full"
                src="https://images.unsplash.com/photo-1686061594225-3e92c0cd51b0" />
            </div>
         </motion.div>
      </section>

      {/* Benefits Grid */}
      <section id="benefits" className="py-24 bg-[#0f172a]">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
               <h2 className="text-3xl md:text-5xl font-bold mb-4">Where is your money going?</h2>
               <p className="text-slate-400 max-w-2xl mx-auto">
                 Without a system, you are blind. Stokcer gives you the eyes to see every movement of goods and capital.
               </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
               {benefits.map((f, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.1 }}
                   className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all group"
                 >
                    <div className="mb-6 p-3 bg-slate-950 rounded-xl inline-block border border-slate-800 group-hover:scale-110 transition-transform">
                       {f.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">
                       {f.desc}
                    </p>
                 </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Role Based Section */}
      <section id="roles" className="py-24 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-1/2 h-1/2 bg-purple-600/10 blur-[100px] -z-10" />
        <div className="max-w-7xl mx-auto">
             <div className="mb-16">
                <span className="text-indigo-400 font-semibold tracking-wider uppercase text-sm">Employee Accountability</span>
                <h2 className="text-3xl md:text-5xl font-bold mt-2 mb-6">Built for your entire workforce</h2>
                <p className="text-slate-400 max-w-2xl">
                    Stop worrying about who did what. Stokcer logs every action by role, ensuring complete transparency in your operations.
                </p>
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                {roles.map((role, idx) => (
                    <motion.div 
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl flex gap-6 items-start"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0 font-bold text-indigo-400 text-xl">
                            {idx + 1}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-1">{role.role}</h3>
                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 block">{role.focus}</span>
                            <p className="text-slate-400 leading-relaxed">
                                {role.desc}
                            </p>
                        </div>
                    </motion.div>
                ))}
             </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="py-24 px-6">
         <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Secure Your Business Profits</h2>
              <p className="text-lg text-indigo-200 mb-10 max-w-xl mx-auto">
                Join 5,000+ businesses who stopped losing money to inventory errors. Take control of your financial future.
              </p>
              <Button 
                onClick={() => navigate('/login?mode=signup')}
                className="h-16 px-10 text-xl bg-white text-indigo-900 hover:bg-indigo-50 rounded-full font-bold shadow-2xl shadow-indigo-500/20"
              >
                Get Started for Free <ChevronRight className="ml-2" />
              </Button>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#020617] py-12 px-6">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
               <Package className="w-5 h-5" />
               <span className="font-semibold text-slate-300">Stokcer</span>
            </div>
            <div className="flex gap-8">
               <a href="#" className="hover:text-white transition-colors">Privacy</a>
               <a href="#" className="hover:text-white transition-colors">Terms</a>
               <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div className="mt-4 md:mt-0">
               © 2025 Stokcer Inc.
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;