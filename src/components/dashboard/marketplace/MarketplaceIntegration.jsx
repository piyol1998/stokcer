import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
    ShoppingBag, 
    Globe, 
    Link, 
    Link2Off, 
    RefreshCw, 
    Settings2, 
    CheckCircle2, 
    AlertCircle, 
    ExternalLink,
    Lock,
    Key,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';

function MarketplaceIntegration() {
    const { user, ownerId } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Credentials State
    const [tiktokCreds, setTiktokCreds] = useState({
        appKey: '',
        appSecret: '',
        shopId: '',
        status: 'disconnected' // connected, disconnected, pending
    });

    const [shopeeCreds, setShopeeCreds] = useState({
        partnerId: '',
        partnerKey: '',
        shopId: '',
        status: 'disconnected'
    });

    useEffect(() => {
        if (ownerId) {
            fetchSettings();
        }
    }, [ownerId]);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', ownerId)
                .single();

            if (data && data.marketplace_creds) {
                const creds = data.marketplace_creds;
                if (creds.tiktok) setTiktokCreds(prev => ({ ...prev, ...creds.tiktok }));
                if (creds.shopee) setShopeeCreds(prev => ({ ...prev, ...creds.shopee }));
            }
        } catch (error) {
            console.error("Fetch settings error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTiktok = async () => {
        setSaving(true);
        try {
            // Fetch current settings first
            const { data: currentData } = await supabase
                .from('user_settings')
                .select('marketplace_creds')
                .eq('user_id', ownerId)
                .single();

            const newCreds = {
                ...(currentData?.marketplace_creds || {}),
                tiktok: {
                    ...tiktokCreds,
                    status: tiktokCreds.appKey && tiktokCreds.appSecret ? 'pending' : 'disconnected'
                }
            };

            const { error } = await supabase
                .from('user_settings')
                .upsert({ 
                    user_id: ownerId, 
                    marketplace_creds: newCreds,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            toast({
                title: "Berhasil Disimpan",
                description: "Credential TikTok Shop telah diperbarui. Menunggu otorisasi pertama.",
            });
            
            setTiktokCreds(prev => ({ ...prev, status: newCreds.tiktok.status }));
        } catch (error) {
            toast({ title: "Gagal Menyimpan", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Integrasi Marketplace
                </h2>
                <p className="text-slate-400">Hubungkan stok website Anda dengan TikTok Shop dan Shopee.</p>
            </div>

            <Tabs defaultValue="tiktok" className="w-full">
                <TabsList className="bg-slate-900 border border-slate-800 p-1 mb-6">
                    <TabsTrigger value="tiktok" className="gap-2 px-6">
                        <ShoppingBag className="w-4 h-4" />
                        TikTok Shop
                    </TabsTrigger>
                    <TabsTrigger value="shopee" className="gap-2 px-6">
                        <Globe className="w-4 h-4" />
                        Shopee
                    </TabsTrigger>
                </TabsList>

                {/* TikTok Content */}
                <TabsContent value="tiktok">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
                                <CardHeader className="border-b border-slate-800 pb-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center p-2 border border-slate-700">
                                                <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
                                                    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-.98V15c0 1.32-.46 2.6-1.33 3.61-.88 1.02-2.11 1.65-3.41 1.76-1.55.14-3.15-.31-4.38-1.31-1.23-1.01-1.95-2.55-2-4.14-.04-1.58.63-3.18 1.83-4.21 1.25-1.07 3-1.51 4.62-1.14V12.7c-1.03-.34-2.22-.09-3 .68-.78.77-1.01 1.95-.61 2.95.4 1 1.48 1.63 2.55 1.49 1.07-.14 1.88-.95 1.98-2.02.04-1.38.01-2.76.01-4.14V.02z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">TikTok Shop API Configuration</CardTitle>
                                                <CardDescription>Masukkan kunci API dari TikTok Partner Center.</CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant={tiktokCreds.status === 'connected' ? 'success' : 'outline'} className={tiktokCreds.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400'}>
                                            {tiktokCreds.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-slate-300">App Key</Label>
                                            <div className="relative">
                                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input 
                                                    className="bg-slate-950/50 border-slate-700 pl-10 focus:ring-indigo-500" 
                                                    placeholder="6jeseunkomjf7"
                                                    value={tiktokCreds.appKey}
                                                    onChange={e => setTiktokCreds({...tiktokCreds, appKey: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-slate-300">App Secret</Label>
                                            <div className="relative">
                                                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input 
                                                    type="password"
                                                    className="bg-slate-950/50 border-slate-700 pl-10 focus:ring-indigo-500" 
                                                    placeholder="••••••••••••••••"
                                                    value={tiktokCreds.appSecret}
                                                    onChange={e => setTiktokCreds({...tiktokCreds, appSecret: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-slate-300">TikTok Shop ID (Opsional)</Label>
                                        <Input 
                                            className="bg-slate-950/50 border-slate-700 focus:ring-indigo-500" 
                                            placeholder="G73142XXXXXX"
                                            value={tiktokCreds.shopId}
                                            onChange={e => setTiktokCreds({...tiktokCreds, shopId: e.target.value})}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-900/30 border-t border-slate-800 py-4 flex justify-between">
                                    <p className="text-[10px] text-slate-500 max-w-[300px]">
                                        Jangan pernah membagikan App Secret Anda. Data disimpan terenkripsi di server kami.
                                    </p>
                                    <Button 
                                        onClick={handleSaveTiktok} 
                                        disabled={saving}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                                    >
                                        {saving ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Menyimpan
                                            </>
                                        ) : (
                                            <>
                                                <Link className="mr-2 h-4 w-4" />
                                                Save & Connect
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>

                            <Card className="bg-slate-900/30 border-slate-800 border-dashed">
                                <CardContent className="py-10 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                        <RefreshCw className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <h3 className="font-bold text-slate-300">Automatic Stock Sync</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mt-2">
                                        Setelah terhubung, setiap perubahan stok di website akan langsung dikirim ke TikTok Shop secara real-time.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <Card className="bg-indigo-600/5 border-indigo-500/20">
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2 text-indigo-400">
                                        <AlertCircle className="w-4 h-4" />
                                        Panduan Otorisasi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-xs space-y-4 text-slate-400 leading-relaxed">
                                    <p>1. Daftarkan aplikasi di <strong>TikTok Shop Partner Center</strong>.</p>
                                    <p>2. Dapatkan <strong>App Key</strong> dan <strong>App Secret</strong>.</p>
                                    <p>3. Masukkan datanya di form sebelah kiri.</p>
                                    <p>4. Klik tombol di bawah untuk memberikan izin akses ke toko TikTok Anda.</p>
                                    <Button variant="outline" className="w-full mt-2 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 text-xs">
                                        Buka Link Otorisasi 
                                        <ExternalLink className="ml-2 w-3 h-3" />
                                    </Button>
                                </CardContent>
                            </Card>

                            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Sync Logs</h4>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2 opacity-50">
                                        <Badge variant="outline" className="text-[8px] h-4">IDLE</Badge>
                                        <p className="text-[10px] text-slate-400">Menunggu sambungan awal...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Shopee Content */}
                <TabsContent value="shopee">
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                        <Lock className="w-12 h-12 text-slate-700 mb-4" />
                        <h3 className="text-xl font-bold text-slate-300">Shopee Sync Pending</h3>
                        <p className="text-slate-500 max-w-md text-center mt-2 px-6">
                            Integrasi Shopee membutuhkan toko Anda memiliki minimal <strong>30 pesanan</strong> dalam 30 hari terakhir untuk mendapatkan akses API resmi. 
                        </p>
                        <div className="flex gap-3 mt-6">
                            <Button variant="outline" className="border-slate-700 text-slate-400">Daftar Shopee Partner</Button>
                            <Button className="bg-orange-600 hover:bg-orange-700">Pelajari Syarat</Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default MarketplaceIntegration;
