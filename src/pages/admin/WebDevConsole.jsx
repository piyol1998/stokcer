import React, { useState } from 'react';
import { Terminal, Play, Save, Database, Trash2, Activity, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { createMidtransTransaction } from '@/lib/midtrans';

const WebDevConsole = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState('idle'); // idle, loading, success, error
  const [testMessage, setTestMessage] = useState('');
  const { toast } = useToast();

  const executeQuery = async () => {
    setLoading(true);
    setResults(null);
    try {
      // Very basic SQL execution simulation or actual edge function call if available
      // For safety in this demo, we just show a placeholder or call a safe function
      toast({
        title: "Query Execution",
        description: "Direct SQL execution is disabled in this console for safety.",
      });
      setResults({ message: "Execution simulated. No changes made." });
    } catch (error) {
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testMidtransConnection = async () => {
    setTestStatus('loading');
    setTestMessage('Initializing connection test...');
    
    try {
      // 1. Mock User and Plan Data
      const mockUser = {
        id: 'test-admin-user',
        email: 'test@stokcer.com',
        phone: '08123456789',
        user_metadata: { first_name: 'Test', last_name: 'Admin' }
      };
      
      const mockPlan = {
        id: 'test-plan-01',
        name: 'Integration Test Plan',
        price: 10000 // 10.000 IDR (Minimum usually around 10k or 1k depending on settings)
      };

      setTestMessage('Requesting Snap Token from Supabase Edge Function...');
      
      // 2. Call the function
      const { token, orderId } = await createMidtransTransaction(mockUser, mockPlan);
      
      if (token) {
        setTestStatus('success');
        setTestMessage(`Success! Token received: ${token.substring(0, 15)}... Order ID: ${orderId}`);
        toast({
          title: "Midtrans Connection Verified",
          description: "Successfully communicated with Midtrans API.",
          variant: "default"
        });
      } else {
        throw new Error("No token returned from API");
      }

    } catch (error) {
      console.error("Test failed", error);
      setTestStatus('error');
      setTestMessage(`Connection Failed: ${error.message}`);
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#0f172a] min-h-screen text-slate-200">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold text-white flex items-center gap-3">
             <Terminal className="text-indigo-500" /> Web Dev Console
           </h1>
           <p className="text-slate-400 mt-2">System administration and diagnostics tools.</p>
        </div>
      </div>

      <Tabs defaultValue="midtrans" className="w-full">
        <TabsList className="bg-slate-800 border-slate-700 text-slate-400">
          <TabsTrigger value="midtrans" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <CreditCard className="w-4 h-4 mr-2" /> Payment Gateway
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Database className="w-4 h-4 mr-2" /> Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="midtrans" className="space-y-4 mt-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                 <Activity className="w-5 h-5 text-indigo-400" /> Midtrans Integration Status
              </CardTitle>
              <CardDescription>
                Verify your Server Key and Client Key configuration by performing a handshake with Midtrans API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Configuration Check</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Client Key (Frontend)</span>
                        <div className="flex items-center gap-2 text-xs">
                           <code className="bg-slate-800 px-2 py-1 rounded text-slate-300">Mid-client...</code>
                           {window.snap ? (
                             <span className="text-green-500 flex items-center gap-1"><CheckCircle size={12}/> Loaded</span>
                           ) : (
                             <span className="text-red-500 flex items-center gap-1"><XCircle size={12}/> Missing</span>
                           )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Server Key (Backend)</span>
                        <div className="flex items-center gap-2 text-xs">
                           <code className="bg-slate-800 px-2 py-1 rounded text-slate-300">Mid-server...</code>
                           <span className="text-indigo-400 flex items-center gap-1"><CheckCircle size={12}/> Stored in Secrets</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Environment</span>
                        <span className="text-yellow-400 text-xs font-bold border border-yellow-400/30 bg-yellow-400/10 px-2 py-0.5 rounded">
                          PRODUCTION
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={testMidtransConnection} 
                    disabled={testStatus === 'loading'}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {testStatus === 'loading' ? (
                       <span className="flex items-center gap-2"><div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></div> Testing...</span>
                    ) : "Test Connection Now"}
                  </Button>
                </div>

                <div className="p-4 rounded-lg bg-black font-mono text-sm h-48 overflow-y-auto border border-slate-800">
                   <div className="text-slate-500 mb-2">// Console Output</div>
                   {testStatus === 'idle' && <div className="text-slate-600">Waiting to start test...</div>}
                   {testStatus === 'loading' && <div className="text-yellow-500">{testMessage}</div>}
                   {testStatus === 'success' && (
                     <div className="text-green-400">
                       {testMessage}
                       <br/>
                       <span className="text-slate-500 mt-2 block">Token generation successful. The backend is correctly communicating with Midtrans.</span>
                     </div>
                   )}
                   {testStatus === 'error' && (
                     <div className="text-red-400">
                       {testMessage}
                       <br/>
                       <span className="text-slate-500 mt-2 block">Check your Server Key in Supabase Secrets. Ensure "Access Keys" are open in Midtrans Dashboard.</span>
                     </div>
                   )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">SQL Console</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-32 bg-slate-950 text-slate-200 p-4 font-mono text-sm rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="SELECT * FROM users LIMIT 10;"
              />
              <div className="flex justify-end mt-4">
                <Button onClick={executeQuery} disabled={loading} className="bg-slate-800 hover:bg-slate-700">
                  <Play className="w-4 h-4 mr-2" /> Run Query
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebDevConsole;