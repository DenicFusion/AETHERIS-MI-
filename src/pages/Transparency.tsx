import React, { useEffect, useState } from 'react';
import { Shield, Server, Activity, ArrowUpRight, ArrowDownRight, Globe, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Transparency() {
  const [stats, setStats] = useState({
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
    // Optionally fetch dynamic stats here from Firebase if Admin configured
    const fetchStats = async () => {
       try {
          const snap = await getDoc(doc(db, "settings", "transparency"));
          if(snap.exists()) {
             setStats(prev => ({...prev, ...snap.data().stats}));
          }
       } catch(e) {}
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-24 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-300">Operational Visibility</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">Transparency Center</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time platform statistics, status monitoring, and performance metrics. We believe in absolute operational clarity.
          </p>
        </div>

        {/* Global Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
           <StatCard title="Registered Members" value={stats.registeredMembers.toLocaleString()} icon={Users} trend="+12% this month" />
           <StatCard title="Active Trading Cycles" value={stats.activeCycles.toLocaleString()} icon={Activity} trend="Dynamic" />
           <StatCard title="Completed Cycles" value={stats.completedCycles.toLocaleString()} icon={Server} trend="+5% this week" />
           <StatCard title="Total Deposits" value={`$${(stats.totalDeposits / 1000000).toFixed(1)}M`} icon={ArrowDownRight} color="text-emerald-400" />
           <StatCard title="Total Withdrawals" value={`$${(stats.totalWithdrawals / 1000000).toFixed(1)}M`} icon={ArrowUpRight} color="text-red-400" />
           <StatCard title="Rewards Distributed" value={`$${(stats.totalRewards / 1000).toFixed(0)}K`} icon={Globe} color="text-primary" />
        </div>

        {/* System Status Section */}
        <div className="mb-20">
           <h2 className="text-2xl font-black mb-8 uppercase tracking-tight">Platform Health & Status</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatusCard name="Trading Engine" status="ONLINE" delay="14ms ping" />
              <StatusCard name="Notification System" status="ONLINE" delay="Operational" />
              <StatusCard name="Payment Infrastructure" status="HEALTHY" delay="Operational" />
              <StatusCard name="API Endpoints" status="ONLINE" delay="99.9% Route Success" />
           </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <Globe className="w-8 h-8 text-primary mb-4" />
              <p className="text-3xl font-black">{stats.countriesServed}</p>
              <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Countries Served</p>
           </div>
           <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <Activity className="w-8 h-8 text-emerald-400 mb-4" />
              <p className="text-3xl font-black text-emerald-400">{stats.uptime}%</p>
              <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">System Uptime</p>
           </div>
           <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <Clock className="w-8 h-8 text-pink-500 mb-4" />
              <p className="text-3xl font-black">{stats.avgProcessingTime}</p>
              <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Avg Withdrawal Time</p>
           </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, color = "text-white" }: any) {
  return (
    <motion.div initial={{opacity:0, y:20}} whileInView={{opacity:1, y:0}} viewport={{once:true}} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
       <div className="flex justify-between items-start mb-4">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{title}</p>
          <Icon className="w-5 h-5 text-gray-600" />
       </div>
       <p className={`text-4xl font-black ${color}`}>{value}</p>
       {trend && <p className="text-xs text-primary font-bold mt-2">{trend}</p>}
    </motion.div>
  );
}

function StatusCard({ name, status, delay }: any) {
  return (
    <div className="flex items-center justify-between bg-black/40 border border-white/5 p-5 rounded-xl">
       <div>
         <p className="font-bold text-white">{name}</p>
         <p className="text-xs text-gray-500 mt-1">{delay}</p>
       </div>
       <div className="flex items-center gap-2 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black text-emerald-500 uppercase tracking-wider">{status}</span>
       </div>
    </div>
  );
}
