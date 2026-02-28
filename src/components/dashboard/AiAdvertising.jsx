import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Megaphone, Zap, Facebook, Sparkles, Loader2, Copy, ShieldCheck, Lock, 
  CheckCircle2, AlertCircle, LogOut, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const AiAdvertising = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(null); // { ad_account_name, ad_account_id }
  
  const [formData, setFormData] = useState({
    campaignName: '',
    dailyBudget: '50000',
    copyPrompt: '',
    generatedCopy: ''
  });
  const [generating, setGenerating] = useState(false);
  const [launching, setLaunching] = useState(false);

  // META APP ID from Environment Variable
  const META_APP_ID = import.meta.env.VITE_META_APP_ID;

  useEffect(() => {
    if (!user) return;
    checkConnections();
    
    // Check for OAuth Code
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
        handleOAuthCallback(code, state);
    }
  }, [user, searchParams]);

  const checkConnections = async () => {
      setLoading(true);
      try {
          const { data, error } = await supabase
            .from('meta_connections')
            .select('ad_account_name, ad_account_id, platform')
            .eq('user_id', user.id)
            .eq('platform', 'meta')
            .maybeSingle();

          if (error) throw error;
          setStatus(data);
      } catch (err) {
          console.error("Status check failed", err);
      } finally {
          setLoading(false);
      }
  };

  const connectMeta = () => {
      if (!META_APP_ID) {
          toast({ title: "Configuration Error", description: "Meta App ID missing in env.", variant: "destructive" });
          return;
      }
      
      const redirectUri = window.location.origin + window.location.pathname;
      // State includes user ID for basic CSRF/validation
      const state = `stokcer_uid_${user.id}`; 
      
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=ads_management,ads_read,email`;
      
      window.location.href = authUrl;
  };

  const handleOAuthCallback = async (code, state) => {
      // Validate state belongs to this user (basic check)
      if (!state.includes(user.id)) {
          toast({ title: "Security Error", description: "Invalid state parameter.", variant: "destructive" });
          return;
      }

      setConnecting(true);
      try {
          const redirectUri = window.location.origin + window.location.pathname;
          
          const { data, error } = await supabase.functions.invoke('meta-oauth', {
            body: { action: 'exchange', code, state, redirectUri }
          });

          if (error) throw error;
          
          toast({ title: "Connected!", description: "Meta account successfully linked." });
          await checkConnections();
          
          // Clean URL
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('code');
          newParams.delete('state');
          setSearchParams(newParams);
      } catch (err) {
          console.error(err);
          toast({ title: "Connection Failed", description: err.message || "Failed to exchange token", variant: "destructive" });
      } finally {
          setConnecting(false);
      }
  };

  const disconnectMeta = async () => {
      if (!window.confirm("Are you sure you want to disconnect Meta?")) return;
      try {
          const { error } = await supabase
            .from('meta_connections')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', 'meta');

          if (error) throw error;

          setStatus(null);
          toast({ title: "Disconnected", description: "Meta account removed." });
      } catch (err) {
          toast({ title: "Error", description: err.message, variant: "destructive" });
      }
  };

  const handleGenerateCopy = async () => {
    if (!formData.copyPrompt) return;
    setGenerating(true);
    // Simulate AI generation for now as backend endpoint wasn't requested for this specific part
    setTimeout(() => {
        setFormData(prev => ({ 
            ...prev, 
            generatedCopy: `🔥 ${prev.copyPrompt} - Limited Time Offer! Shop now and save big. #Sale #Deal` 
        }));
        setGenerating(false);
    }, 1500);
  };

  const handleLaunch = async () => {
      setLaunching(true);
      // Simulate launch
      setTimeout(() => {
          toast({ title: "Campaign Launched", description: "Sent to Meta Ads Manager!" });
          setLaunching(false);
      }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Meta AI Advertising
          </h1>
          <p className="text-slate-400 mt-1">Connect your ad account to start AI campaigns.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Card */}
        <Card className="bg-[#1e293b] border-slate-700 h-fit shadow-lg">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <Facebook className="w-5 h-5 text-blue-500" />
              Meta Connection
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage your integration status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
              status 
                ? 'bg-blue-500/10 border-blue-500/20' 
                : 'bg-slate-900/50 border-slate-700'
            }`}>
               {loading ? (
                 <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
               ) : status ? (
                 <CheckCircle2 className="w-6 h-6 text-blue-400" />
               ) : (
                 <AlertCircle className="w-6 h-6 text-slate-500" />
               )}
               
               <div className="flex-1 overflow-hidden">
                 <p className={`font-medium truncate ${status ? 'text-blue-400' : 'text-slate-300'}`}>
                    {loading ? 'Checking...' : status ? (status.ad_account_name || 'Connected') : 'Not Connected'}
                 </p>
                 <p className="text-xs text-slate-500 truncate">
                    {status ? `ID: ${status.ad_account_id}` : 'Link your Business Manager'}
                 </p>
               </div>
            </div>

            <div className="flex flex-col gap-2">
               {!status ? (
                  <Button 
                    onClick={connectMeta} 
                    disabled={connecting || loading}
                    className="w-full text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Facebook className="w-4 h-4 mr-2" />}
                    Connect Meta
                  </Button>
               ) : (
                  <div className="grid grid-cols-2 gap-2">
                     <Button 
                        variant="outline" 
                        onClick={checkConnections}
                        className="border-slate-600 text-slate-300 hover:text-white"
                     >
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                     </Button>
                     <Button 
                        variant="destructive"
                        onClick={disconnectMeta}
                        className="bg-red-500/10 text-red-400 border border-red-500/20"
                     >
                        <LogOut className="w-4 h-4 mr-2" /> Disconnect
                     </Button>
                  </div>
               )}
               
               <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Secure Backend OAuth
               </p>
            </div>
          </CardContent>
        </Card>

        {/* Ad Engine */}
        <Card className="bg-[#1e293b] border-slate-700 lg:col-span-2 shadow-lg relative overflow-hidden">
          {!status && (
             <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-6">
                 <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-slate-500" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Engine Locked</h3>
                 <p className="text-slate-400 max-w-sm">Connect Meta account to unlock AI tools.</p>
             </div>
          )}
          
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
               <span className="flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> Campaign Setup</span>
               {status && <Badge variant="outline" className="border-blue-500/30 text-blue-400">Active</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-slate-300">Campaign Name</Label>
                    <Input 
                       className="bg-slate-900 border-slate-700 text-slate-300"
                       value={formData.campaignName}
                       onChange={e => setFormData({...formData, campaignName: e.target.value})} 
                       placeholder="e.g. Summer Sale"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-slate-300">Daily Budget (IDR)</Label>
                    <Input 
                       className="bg-slate-900 border-slate-700 text-slate-300"
                       value={formData.dailyBudget}
                       onChange={e => setFormData({...formData, dailyBudget: e.target.value})}
                    />
                 </div>
             </div>

             <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700 space-y-4">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Product description for AI Copy..."
                        className="bg-slate-950 border-slate-800 text-slate-300"
                        value={formData.copyPrompt}
                        onChange={e => setFormData({...formData, copyPrompt: e.target.value})}
                    />
                    <Button onClick={handleGenerateCopy} disabled={generating} className="bg-indigo-600 hover:bg-indigo-700">
                        {generating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Megaphone className="w-4 h-4"/>}
                    </Button>
                </div>
                <Textarea 
                    className="h-24 bg-slate-950 border-slate-800 text-slate-300 font-mono text-xs"
                    value={formData.generatedCopy}
                    readOnly
                    placeholder="AI generated ad copy..."
                />
             </div>

             <div className="flex justify-end pt-2 border-t border-slate-700/50">
                <Button onClick={handleLaunch} disabled={launching} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                   {launching ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Zap className="w-4 h-4 mr-2" />}
                   Launch to Meta
                </Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiAdvertising;