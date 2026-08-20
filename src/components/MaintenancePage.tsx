import React from 'react';
import { ShieldAlert, Globe, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';

export const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      
      <div className="max-w-2xl w-full text-center space-y-8 relative z-10">
        <div className="flex justify-center mb-4">
          <Logo className="h-12" />
        </div>
        
        <div className="w-24 h-24 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(30,80,255,0.15)]">
          <ShieldAlert className="w-12 h-12 text-primary animate-pulse" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/50 bg-clip-text text-transparent">
            System Maintenance
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed">
            Aetheris Node is currently undergoing scheduled optimization to improve yield algorithms and network stability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto pt-8">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Global Network</span>
            <span className="text-xs text-slate-500 italic">Expected back soon</span>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Support Line</span>
            <span className="text-xs text-slate-500 italic">Active during downtime</span>
          </div>
        </div>

        <div className="pt-10 flex flex-col items-center gap-4">
          <Button 
            className="bg-primary hover:bg-primary/90 text-white neon-border px-8 py-6 h-auto text-lg uppercase tracking-widest font-bold"
            onClick={() => window.location.reload()}
          >
            Check Status
          </Button>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">
            Protocol ID: SYS_MNT_404
          </p>
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center opacity-20">
        <div className="text-[80px] font-bold text-white tracking-[0.5em] select-none pointer-events-none">
          AETHERIS
        </div>
      </div>
    </div>
  );
};
