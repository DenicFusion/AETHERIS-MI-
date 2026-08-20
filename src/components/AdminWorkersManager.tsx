import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Settings, Users, Wallet, Activity } from 'lucide-react';
import { format } from 'date-fns';

export function WorkersManager() {
  const [config, setConfig] = useState<any>({
    enable_upgrade: true,
    upgrade_fee_ngn: 50000,
    new_level1_percent: 60,
    new_level2_percent: 0,
    enable_topup: true,
    min_topup_usd: 10,
    usd_to_ngn_rate: 1500,
    kora_pub_key: 'pk_live_yRJ1XJRGy7hbDqp6P6YjrjY9fargo1LiHgQJrefZ'
  });

  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'workers_config'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(prev => ({ ...prev, ...docSnap.data() }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/workers_config');
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    // Fetch logs (top 50)
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'workers_logs'), orderBy('timestamp', 'desc'), limit(50));
        const qSnap = await getDocs(q);
        setLogs(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Workers Logs Fetch Error", err);
      }
    };
    fetchLogs();
    
    // We update logs occasionally, but since it's not super critical to be real-time like chat,
    // we use a simple interval or just the initial load. For an admin dashboard, onSnapshot is better:
    const unsubLogs = onSnapshot(query(collection(db, 'workers_logs'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
       setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, 'workers_logs');
    });

    return () => unsubLogs();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'workers_config'), {
        enable_upgrade: config.enable_upgrade,
        upgrade_fee_ngn: Number(config.upgrade_fee_ngn),
        new_level1_percent: Number(config.new_level1_percent),
        new_level2_percent: Number(config.new_level2_percent),
        enable_topup: config.enable_topup,
        min_topup_usd: Number(config.min_topup_usd),
        usd_to_ngn_rate: Number(config.usd_to_ngn_rate),
        kora_pub_key: config.kora_pub_key || 'pk_live_yRJ1XJRGy7hbDqp6P6YjrjY9fargo1LiHgQJrefZ'
      }, { merge: true });
      toast.success("Workers configuration deployed");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center font-black">
            <Settings className="w-5 h-5 text-primary mr-3" />
            Kora API Keys
          </CardTitle>
          <CardDescription className="text-xs">Manage the Kora Pay public key for the Workers Gateway.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="max-w-md">
              <label className="text-xs text-gray-500 font-bold mb-1 block">Kora Public Key</label>
              <Input type="text" className="bg-black/50 border-white/10" value={config.kora_pub_key} onChange={(e) => setConfig({ ...config, kora_pub_key: e.target.value })} />
           </div>
           <Button onClick={handleSaveConfig} disabled={saving} className="mt-4 font-bold">Save Kora Key</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upgrade Config */}
        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl flex items-center font-black">
              <Users className="w-5 h-5 text-primary mr-3" />
              Referral Upgrade Config
            </CardTitle>
            <CardDescription className="text-xs">Manage the /workers verified referrer system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="space-y-0.5">
                <p className="font-bold text-sm">System Status</p>
                <p className="text-xs text-muted-foreground">Toggle the upgrade portal visibility</p>
              </div>
              <Switch checked={config.enable_upgrade} onCheckedChange={(val) => setConfig({ ...config, enable_upgrade: val })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs text-gray-500 font-bold mb-1 block">Fee (NGN via Kora)</label>
                  <Input type="number" className="bg-black/50 border-white/10" value={config.upgrade_fee_ngn} onChange={(e) => setConfig({ ...config, upgrade_fee_ngn: e.target.value })} />
               </div>
               <div />
               <div>
                  <label className="text-xs text-gray-500 font-bold mb-1 block">New Tier 1 (%)</label>
                  <Input type="number" className="bg-black/50 border-white/10" value={config.new_level1_percent} onChange={(e) => setConfig({ ...config, new_level1_percent: e.target.value })} />
               </div>
               <div>
                  <label className="text-xs text-gray-500 font-bold mb-1 block">New Tier 2 (%)</label>
                  <Input type="number" className="bg-black/50 border-white/10" value={config.new_level2_percent} onChange={(e) => setConfig({ ...config, new_level2_percent: e.target.value })} />
               </div>
            </div>
            <Button onClick={handleSaveConfig} disabled={saving} className="w-full font-bold">Save Upgrade Rules</Button>
          </CardContent>
        </Card>

        {/* Top-up Config */}
        <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
          <CardHeader>
             <CardTitle className="text-xl flex items-center font-black">
               <Wallet className="w-5 h-5 text-primary mr-3" />
               Direct Top-Up Config
             </CardTitle>
             <CardDescription className="text-xs">Manage the /workers direct balance top-up system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="space-y-0.5">
                <p className="font-bold text-sm">System Status</p>
                <p className="text-xs text-muted-foreground">Toggle the direct top-up portal visibility</p>
              </div>
              <Switch checked={config.enable_topup} onCheckedChange={(val) => setConfig({ ...config, enable_topup: val })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs text-gray-500 font-bold mb-1 block">Min USD Top-up</label>
                  <Input type="number" className="bg-black/50 border-white/10" value={config.min_topup_usd} onChange={(e) => setConfig({ ...config, min_topup_usd: e.target.value })} />
               </div>
               <div>
                  <label className="text-xs text-gray-500 font-bold mb-1 block">USD to NGN Rate</label>
                  <Input type="number" className="bg-black/50 border-white/10" value={config.usd_to_ngn_rate} onChange={(e) => setConfig({ ...config, usd_to_ngn_rate: e.target.value })} />
               </div>
            </div>
            
            <Button onClick={handleSaveConfig} disabled={saving} className="w-full font-bold">Save Top-up Settings</Button>
          </CardContent>
        </Card>

      </div>

      <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                Workers Telemetry (Kora Pay)
              </CardTitle>
              <CardDescription className="text-xs mt-1">Audit log of all isolated worker top-ups and upgrades.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto rounded-xl border border-white/5">
             <Table>
               <TableHeader className="bg-white/5">
                 <TableRow className="border-white/5 hover:bg-transparent">
                   <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-4 pl-6">Timestamp</TableHead>
                   <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-4">User ID</TableHead>
                   <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-4">Action Type</TableHead>
                   <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-4">Details</TableHead>
                   <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-4 text-right pr-6">Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody className="bg-[#0f1115]">
                 {logs.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm font-medium">
                       No workers log telemetry available.
                     </TableCell>
                   </TableRow>
                 ) : logs.map((log: any) => (
                   <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                     <TableCell className="pl-6 py-4">
                       <p className="text-sm font-bold text-white">{log.timestamp ? format(log.timestamp.toDate(), 'MMM d, yy') : 'Pending'}</p>
                       <p className="text-[10px] text-muted-foreground uppercase font-mono">{log.timestamp ? format(log.timestamp.toDate(), 'HH:mm:ss') : '--:--'}</p>
                     </TableCell>
                     <TableCell>
                       <p className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 inline-flex rounded-md">{log.user_id.substring(0, 10)}...</p>
                     </TableCell>
                     <TableCell>
                       {log.type === 'topup' ? (
                         <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] uppercase font-black px-2 py-1">Top-Up</Badge>
                       ) : (
                         <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[10px] uppercase font-black px-2 py-1">Ref Upgrade</Badge>
                       )}
                     </TableCell>
                     <TableCell>
                       {log.type === 'topup' ? (
                          <div className="flex flex-col gap-0.5">
                             <span className="text-sm font-black text-white">${Number(log.amount_usd).toLocaleString()} cred.</span>
                             <span className="text-[10px] text-muted-foreground font-mono">Paid NGN {log.amount_ngn}</span>
                          </div>
                       ) : (
                          <div className="flex flex-col gap-0.5">
                             <span className="text-sm font-black text-white">L1: {log.new_level1_percent}%</span>
                             <span className="text-[10px] text-muted-foreground font-mono">Paid NGN {log.amount_ngn}</span>
                          </div>
                       )}
                     </TableCell>
                     <TableCell className="text-right pr-6">
                       <Badge className={`${log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse'} text-[9px] uppercase font-black`}>
                         {log.status}
                       </Badge>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
