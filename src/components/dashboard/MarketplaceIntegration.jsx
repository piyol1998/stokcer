import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, ShoppingBag, Package, RefreshCw, AlertCircle, CheckCircle2, Link as LinkIcon, ExternalLink, Plus, Store, Trash2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AVAILABLE_PLATFORMS = [
  { id: 'shopee', name: 'Shopee', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopee_logo_search.png/900px-Shopee_logo_search.png?20220912102830', color: 'text-orange-500' },
  { id: 'tokopedia', name: 'Tokopedia', icon: 'https://assets.tokopedia.net/assets-tokopedia-lite/v2/zeus/kratos/6045eb60.png', color: 'text-green-500' },
  { id: 'tiktok', name: 'TikTok Shop', icon: 'https://sf-tb-sg.ibytedtos.com/obj/ttfe-malaysia/apis/tiktok_shop_logo.png', color: 'text-black' },
  { id: 'lazada', name: 'Lazada', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Lazada_%282019%29.svg/2560px-Lazada_%282019%29.svg.png', color: 'text-blue-500' }
];

const MarketplaceIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Connection Dialog State
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [connectForm, setConnectForm] = useState({
      shop_name: '',
      api_key: '', // Simulating access token/key
      shop_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
        fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
      try {
          const { data, error } = await supabase
            .from('marketplace_connections')
            .select('*')
            .eq('user_id', user.id);
          
          if (error) throw error;
          setConnections(data || []);
      } catch (error) {
          console.error("Fetch connections error:", error);
          toast({ title: "Error", description: "Failed to load marketplace connections", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  const handleOpenConnect = (platform) => {
      setSelectedPlatform(platform);
      setConnectForm({ shop_name: '', api_key: '', shop_url: '' });
      setIsConnectOpen(true);
  };

  const handleConnectSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
          // Simulate API Connection verification here
          // In real app, we would send this to backend to OAuth with platform
          
          const payload = {
              user_id: user.id,
              platform: selectedPlatform.id,
              shop_name: connectForm.shop_name,
              status: 'active',
              access_token: connectForm.api_key, // Storing "credential"
              last_sync_at: new Date().toISOString()
          };

          // Upsert to handle re-connection
          const { error } = await supabase
              .from('marketplace_connections')
              .upsert(payload, { onConflict: 'user_id, platform' });

          if (error) throw error;

          toast({ 
              title: "Connected Successfully", 
              description: `Your ${selectedPlatform.name} store has been connected.`,
              className: "bg-emerald-600 text-white border-emerald-500"
          });
          
          setIsConnectOpen(false);
          fetchConnections();

      } catch (error) {
          console.error(error);
          toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleDisconnect = async (platformId) => {
      if(!window.confirm("Are you sure you want to disconnect this store? Inventory sync will stop.")) return;

      try {
          const { error } = await supabase
              .from('marketplace_connections')
              .delete()
              .eq('user_id', user.id)
              .eq('platform', platformId);

          if (error) throw error;

          toast({ title: "Disconnected", description: "Store disconnected successfully." });
          fetchConnections();
      } catch (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
      }
  };

  const getStatus = (platformId) => {
      const conn = connections.find(c => c.platform === platformId);
      return conn ? { connected: true, data: conn } : { connected: false, data: null };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
             <LayoutGrid className="w-6 h-6 text-indigo-400" />
             Marketplace Hub
          </h1>
          <p className="text-slate-400">Connect your stores to sync inventory automatically.</p>
        </div>
        <Button variant="outline" onClick={() => fetchConnections()} className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
           <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </Button>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1e293b] border border-slate-700 p-1 rounded-xl">
           <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Connected Stores</TabsTrigger>
           <TabsTrigger value="products" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Unified Products</TabsTrigger>
           <TabsTrigger value="orders" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {AVAILABLE_PLATFORMS.map(platform => {
                     const { connected, data } = getStatus(platform.id);
                     
                     return (
                         <div key={platform.id} className={`relative rounded-xl p-6 border transition-all group overflow-hidden ${connected ? 'bg-[#1e293b] border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'bg-[#1e293b]/50 border-slate-800 hover:border-slate-600'}`}>
                             {/* Background Glow */}
                             {connected && <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>}
                             
                             <div className="flex justify-between items-start mb-6 relative z-10">
                                 <div className="w-14 h-14 bg-white rounded-xl p-2 flex items-center justify-center shadow-md">
                                     <img src={platform.icon} alt={platform.name} className="w-full h-full object-contain" />
                                 </div>
                                 <Badge variant={connected ? 'default' : 'secondary'} className={`${connected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                     {connected ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                     {connected ? 'Active' : 'Not Connected'}
                                 </Badge>
                             </div>
                             
                             <div className="relative z-10">
                                <h3 className="text-lg font-bold text-white mb-1">{platform.name}</h3>
                                {connected ? (
                                    <div className="space-y-4">
                                        <p className="text-slate-400 text-sm flex items-center gap-1">
                                            <Store className="w-3 h-3" /> {data.shop_name}
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                                                <span className="text-slate-500 text-[10px] block uppercase tracking-wider">Last Sync</span>
                                                <span className="text-slate-300 text-xs font-mono">
                                                    {new Date(data.last_sync_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                             <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
                                                <span className="text-slate-500 text-[10px] block uppercase tracking-wider">Products</span>
                                                <span className="text-white text-xs font-bold">--</span>
                                            </div>
                                        </div>
                                        <div className="pt-2 flex justify-end">
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                onClick={() => handleDisconnect(platform.id)}
                                                className="h-8 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                            >
                                                <Trash2 className="w-3 h-3 mr-1" /> Disconnect
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-slate-500 text-sm">
                                            Connect your {platform.name} store to enable real-time inventory synchronization.
                                        </p>
                                        <Button 
                                            onClick={() => handleOpenConnect(platform)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                                        >
                                            <LinkIcon className="w-4 h-4 mr-2" /> Connect Store
                                        </Button>
                                    </div>
                                )}
                             </div>
                         </div>
                     );
                 })}
             </div>
        </TabsContent>
        
        <TabsContent value="products">
            <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                 <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Package className="w-8 h-8 text-slate-500" />
                 </div>
                 <h3 className="text-xl font-medium text-white mb-2">Unified Product Catalog</h3>
                 <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                     Manage your products across all connected marketplaces from a single view. Connect a store first to see your catalog.
                 </p>
                 <Button disabled={connections.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
                    {connections.length > 0 ? 'Sync Catalog Now' : 'Connect a Store First'}
                 </Button>
            </div>
        </TabsContent>

        <TabsContent value="orders">
             <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                 <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-8 h-8 text-slate-500" />
                 </div>
                 <h3 className="text-xl font-medium text-white mb-2">Centralized Order Management</h3>
                 <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                     Process and fulfill orders from Shopee, Tokopedia, and TikTok Shop in one place.
                 </p>
                 <Button disabled={connections.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
                    View Orders
                 </Button>
            </div>
        </TabsContent>
      </Tabs>

      {/* Connection Dialog */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
          <DialogContent className="bg-[#1e293b] text-slate-100 border-slate-700 sm:max-w-[500px]">
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white rounded p-1">
                        <img src={selectedPlatform?.icon} alt="" className="w-full h-full object-contain"/>
                      </div>
                      Connect {selectedPlatform?.name}
                  </DialogTitle>
                  <DialogDescription>
                      Enter your store credentials to authorize inventory sync.
                  </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleConnectSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                      <Label>Shop Name / ID</Label>
                      <Input 
                        placeholder="e.g. MyStore Official" 
                        value={connectForm.shop_name}
                        onChange={e => setConnectForm({...connectForm, shop_name: e.target.value})}
                        className="bg-slate-800 border-slate-600"
                        required
                      />
                  </div>
                  <div className="space-y-2">
                      <Label>Shop URL (Optional)</Label>
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder={`https://${selectedPlatform?.id}.com/...`} 
                            value={connectForm.shop_url}
                            onChange={e => setConnectForm({...connectForm, shop_url: e.target.value})}
                            className="bg-slate-800 border-slate-600 pl-10"
                        />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label>API Access Token / Key</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            type="password"
                            placeholder="Paste your API token here" 
                            value={connectForm.api_key}
                            onChange={e => setConnectForm({...connectForm, api_key: e.target.value})}
                            className="bg-slate-800 border-slate-600 pl-10 font-mono text-sm"
                            required
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                          *For demo purposes, you can enter any text to simulate a successful connection.
                      </p>
                  </div>

                  <DialogFooter className="pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsConnectOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                          {isSubmitting ? 'Connecting...' : 'Authorize Connection'}
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplaceIntegration;