import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History, Calendar, Package } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

function ProductionHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('production_history')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat riwayat...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Riwayat Produksi</h1>
        <p className="text-slate-600">Lihat semua riwayat produksi Anda</p>
      </div>

      <div className="space-y-4">
        {history.length > 0 ? (
          history.map((production, index) => (
            <motion.div
              key={production.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <History className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">
                      {production.recipe_name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(production.date)}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        <span className="font-semibold text-green-600">
                          +{production.quantity} unit diproduksi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-3 text-sm">Bahan yang Digunakan:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {production.ingredients_snapshot?.map((ingredient, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm">
                      <span className="text-slate-700">{ingredient.materialName || 'Unknown Material'}</span>
                      <span className="font-medium text-slate-900">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Belum ada riwayat produksi</p>
            <p className="text-slate-400 text-sm">Mulai produksi untuk melihat riwayat</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductionHistory;