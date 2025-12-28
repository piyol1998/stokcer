import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock, 
  Activity,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  FlaskConical,
  BookOpen,
  Trash2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const RecentActivityWidget = ({ userId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchActivities();

      const subscription = supabase
        .channel('recent-activity-feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notification_logs',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            setActivities(prev => [payload.new, ...prev].slice(0, 50));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [userId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type, metaType) => {
    if (metaType) {
        switch(metaType) {
            case 'material_restock': return <ShoppingCart className="w-4 h-4 text-emerald-400" />;
            case 'material_update': return <TrendingUp className="w-4 h-4 text-blue-400" />;
            case 'production': return <FlaskConical className="w-4 h-4 text-purple-400" />;
            case 'recipe_update': return <BookOpen className="w-4 h-4 text-amber-400" />;
            case 'recipe_delete': return <Trash2 className="w-4 h-4 text-red-400" />;
            default: break;
        }
    }

    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getActivityColor = (type, metaType) => {
     if (metaType) {
        switch(metaType) {
            case 'material_restock': return 'bg-emerald-500/10 border-emerald-500/20';
            case 'production': return 'bg-purple-500/10 border-purple-500/20';
            case 'recipe_update': return 'bg-amber-500/10 border-amber-500/20';
            default: return 'bg-blue-500/10 border-blue-500/20';
        }
    }
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  // Render content based on metadata type
  const renderDetail = (activity) => {
      const meta = activity.metadata;
      if (!meta || !meta.type) return <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{activity.message}</p>;

      const { details } = meta;

      switch(meta.type) {
          case 'material_restock':
              return (
                  <div className="mt-1 text-xs space-y-1">
                      <p className="font-bold text-slate-300">Beli {details.materialName}</p>
                      <div className="flex flex-col gap-0.5 text-slate-400">
                          <span className="flex items-center gap-1">
                              Qty: <span className="text-emerald-400">+{details.addedQty} {details.unit}</span>
                              <span className="mx-1 text-slate-600">|</span>
                              Price: {formatCurrency(details.price)}
                          </span>
                          <span className="flex items-center gap-1 text-[10px]">
                              Stock: {details.oldStock} <ArrowRight className="w-3 h-3 text-slate-600"/> <span className="text-slate-200">{details.newStock}</span>
                          </span>
                      </div>
                  </div>
              );
          
          case 'material_update':
              return (
                  <div className="mt-1 text-xs space-y-1">
                      <p className="font-bold text-slate-300">{details.materialName}</p>
                      {details.changes?.map((change, i) => (
                          <div key={i} className="flex items-center gap-1 text-slate-400">
                              <span className="w-12">{change.field}:</span>
                              <span className="text-slate-500 strike-through">{change.isCurrency ? formatCurrency(change.old) : change.old}</span>
                              <ArrowRight className="w-3 h-3 text-slate-600"/>
                              <span className="text-slate-200">{change.isCurrency ? formatCurrency(change.new) : change.new} {change.unit}</span>
                          </div>
                      ))}
                  </div>
              );

          case 'recipe_update':
              return (
                  <div className="mt-1 text-xs space-y-1">
                       <p className="font-bold text-slate-300">Resep {details.recipeName} diubah</p>
                       {details.userName && <p className="text-[10px] text-slate-500">Oleh: <span className="text-indigo-400">{details.userName}</span></p>}
                       {details.changes && details.changes.length > 0 ? (
                           <div className="space-y-0.5 mt-1">
                               {details.changes.map((c, i) => (
                                   <div key={i} className="flex items-center gap-1 text-slate-400 text-[10px]">
                                       <span className="text-slate-300">{c.material}</span>
                                       <span className="text-slate-600">({c.old} → {c.new})</span>
                                   </div>
                               ))}
                           </div>
                       ) : (
                           <p className="text-slate-500 italic">No ingredient changes recorded.</p>
                       )}
                  </div>
              );

          case 'recipe_delete':
              return (
                  <div className="mt-1 text-xs space-y-1">
                       <p className="font-bold text-slate-300">Resep Dihapus: {details.recipeName}</p>
                       {details.userName && <p className="text-[10px] text-slate-500">Oleh: <span className="text-indigo-400">{details.userName}</span></p>}
                  </div>
              );

          case 'production':
              return (
                  <div className="mt-1 text-xs space-y-1">
                      <p className="font-bold text-slate-300">Produksi oleh <span className="text-indigo-400">{details.userName}</span></p>
                      <div className="flex flex-col gap-0.5 text-slate-400">
                          <span className="flex items-center gap-2">
                              <span className="bg-slate-800 px-1 rounded text-[10px] text-slate-500">{details.batchId}</span>
                              <span className="text-slate-300">{details.recipeName}</span>
                          </span>
                          <span className="flex justify-between items-center mt-0.5">
                              <span>Qty: {details.quantity} {details.unit}</span>
                              <span className="text-emerald-500 font-medium">Cost: {formatCurrency(details.totalCost)}</span>
                          </span>
                      </div>
                  </div>
              );

          default:
              return <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{activity.message}</p>;
      }
  };

  return (
    <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-6 shadow-xl h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Aktivitas Terkini</h3>
            <p className="text-xs text-slate-400">Log sistem & notifikasi</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-4 -mr-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3 py-10">
             <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
             <span className="text-sm text-slate-500">Memuat aktivitas...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 py-10 opacity-60">
            <Bell className="w-8 h-8" />
            <p className="text-sm">Belum ada aktivitas tercatat</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div 
                key={activity.id}
                className={`p-3 rounded-xl border ${getActivityColor(activity.type, activity.metadata?.type)} transition-all hover:bg-slate-800/50 flex gap-3`}
              >
                <div className="mt-1 flex-shrink-0">
                  {getActivityIcon(activity.type, activity.metadata?.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                         {renderDetail(activity)}
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap flex items-center gap-1 ml-2">
                      <Clock className="w-3 h-3" />
                      {formatTime(activity.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default RecentActivityWidget;