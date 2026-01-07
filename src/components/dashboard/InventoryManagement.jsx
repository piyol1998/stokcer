import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaterialsList from '@/components/dashboard/inventory/MaterialsList';
import RecipeGrid from '@/components/dashboard/inventory/RecipeGrid';
import ProductionHistory from '@/components/dashboard/inventory/ProductionHistory';
import NewProduction from '@/components/dashboard/inventory/NewProduction';
import { Package, ChefHat, History, Factory, AlertTriangle } from 'lucide-react';

const InventoryManagement = ({ onUpdate, initialTab = "materials" }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Produksi & Inventaris</h1>
          <p className="text-slate-400">Kelola bahan baku, resep, dan aktivitas produksi.</p>
        </div>
      </div>

      <Tabs defaultValue="materials" value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Navigation Bar - Responsive & Scrollable */}
        <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          <TabsList className="inline-flex h-auto w-auto min-w-full md:min-w-0 p-1 bg-[#1e293b] border border-slate-700 rounded-xl">
            <TabsTrigger
              value="materials"
              className="flex-shrink-0 min-w-[120px] px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              <Package className="w-4 h-4 mr-2" />
              Bahan Baku
            </TabsTrigger>

            <TabsTrigger
              value="recipes"
              className="flex-shrink-0 min-w-[100px] px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              <ChefHat className="w-4 h-4 mr-2" />
              Resep
            </TabsTrigger>

            <TabsTrigger
              value="production"
              className="flex-shrink-0 min-w-[140px] px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              <Factory className="w-4 h-4 mr-2" />
              Produksi Baru
            </TabsTrigger>

            <TabsTrigger
              value="history"
              className="flex-shrink-0 min-w-[100px] px-4 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
            >
              <History className="w-4 h-4 mr-2" />
              Riwayat Produksi
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="materials" className="focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <MaterialsList onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="recipes" className="focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <RecipeGrid onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="production" className="focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <NewProduction onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="history" className="focus-visible:outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <ProductionHistory />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default InventoryManagement;