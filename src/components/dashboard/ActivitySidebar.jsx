import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, AlertCircle, CheckCircle, Info, ChevronRight, MessageSquare } from 'lucide-react';
import { getAllNotifications, markAllNotificationsRead } from '@/lib/notificationUtils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

function ActivitySidebar({ isOpen, onClose, userId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchActivities();
      // Auto-read when opened
      markAllNotificationsRead(userId);
    }
  }, [isOpen, userId]);

  const fetchActivities = async () => {
    setLoading(true);
    const data = await getAllNotifications(userId);
    setActivities(data);
    setLoading(false);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-screen w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-700" />
                  <h2 className="font-bold text-slate-800">Aktivitas Terkini</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200">
                  <X className="w-5 h-5 text-slate-500" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Memuat aktivitas...</div>
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <div
                      key={activity.id}
                      onClick={() => handleActivityClick(activity)}
                      className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group relative"
                    >
                      <div className="mt-0.5">{getIcon(activity.type)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{activity.title}</h4>
                          <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100 whitespace-nowrap ml-2">
                            {formatTime(activity.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {activity.message}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 px-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-500 text-sm">Belum ada aktivitas tercatat.</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-[10px] text-slate-400">Menampilkan 50 aktivitas terakhir</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedActivity && getIcon(selectedActivity.type)}
              {selectedActivity?.title}
            </DialogTitle>
            <div className="text-xs text-slate-500 mt-1">
              {selectedActivity && new Date(selectedActivity.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' })}
            </div>
          </DialogHeader>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex gap-2 items-start">
              <MessageSquare className="w-4 h-4 text-slate-400 mt-1" />
              <p className="text-sm text-slate-700 leading-relaxed">
                {selectedActivity?.message}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ActivitySidebar;