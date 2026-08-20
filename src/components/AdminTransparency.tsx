import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

export function AdminTransparency() {
  const [stats, setStats] = useState<any>({
    registeredMembers: 12450,
    activeCycles: 3840,
    completedCycles: 45210,
    totalDeposits: 5200000,
    totalWithdrawals: 1800000,
    totalRewards: 450000,
    countriesServed: 145,
    uptime: 99.98,
    avgProcessingTime: "12 mins"
  });

  useEffect(() => {
    const fetchStats = async () => {
       const snap = await getDoc(doc(db, "settings", "transparency"));
       if(snap.exists() && snap.data().stats) {
          setStats(prev => ({...prev, ...snap.data().stats}));
       }
    };
    fetchStats();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "settings", "transparency"), { stats }, { merge: true });
      toast.success("Transparency stats updated.");
    } catch(e) {
      toast.error("Failed to update stats.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">Transparency Hub</h2>
          <p className="text-muted-foreground mt-1 text-sm">Control statistics displayed on the public Transparency page.</p>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Save Settings</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {Object.keys(stats).map((key) => (
           <Card key={key} className="bg-[#111] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  type={typeof stats[key] === 'number' ? 'number' : 'text'}
                  value={stats[key]}
                  onChange={e => setStats({...stats, [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value})}
                  className="bg-black/50 border-white/10 font-bold text-lg h-12"
                />
              </CardContent>
           </Card>
         ))}
      </div>
    </div>
  );
}
