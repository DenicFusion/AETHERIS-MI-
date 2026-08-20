import React, { useState, useEffect } from "react";
import { Zap, Clock, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculateInvestmentMetrics } from "@/lib/InvestmentEngine";

interface QuickTradeActiveCardProps {
  investment: any;
  onViewProgress?: () => void;
  formatCurrency: (val: number) => string;
}

export const QuickTradeActiveCard: React.FC<QuickTradeActiveCardProps> = ({
  investment,
  onViewProgress,
  formatCurrency,
}) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const metrics = calculateInvestmentMetrics(
    { ...investment, model: 'quick_trade' },
    undefined,
    0,
    now
  );

  return (
    <Card className="relative overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-[#0a1128] via-[#090d20] to-[#040612] p-6 rounded-3xl shadow-[0_0_35px_rgba(6,182,212,0.15)] text-white">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center animate-pulse">
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-widest text-cyan-300 uppercase flex items-center gap-2">
              <span>QUICK TRADE ACTIVE</span>
            </h4>
            <div className="text-[10px] text-slate-400 font-mono">Single-Cycle AI Model</div>
          </div>
        </div>

        {/* Pulsing Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{metrics.isComplete ? "Settlement Ready" : "AI Trading"}</span>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-3 gap-2 bg-[#050817]/80 border border-cyan-500/20 rounded-2xl p-3.5 mb-4 relative z-10">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Invested</div>
          <div className="text-sm font-black font-mono text-white">{formatCurrency(metrics.principalInvested)}</div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Current Value</div>
          <div className="text-sm font-black font-mono text-cyan-400">{formatCurrency(metrics.currentValue)}</div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Target Payout</div>
          <div className="text-sm font-black font-mono text-emerald-400">{formatCurrency(metrics.targetPayout)}</div>
        </div>
      </div>

      {/* Progress & Countdown */}
      <div className="space-y-2 mb-5 relative z-10">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Time Remaining</span>
          </span>
          <span className="font-mono font-bold text-cyan-300">{metrics.remainingFormatted}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#0d1633] h-2 rounded-full overflow-hidden p-0.5 border border-cyan-500/20">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
            style={{ width: `${metrics.progressPercentage}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>Target Profit: +{formatCurrency(metrics.targetProfit)}</span>
          <span>{metrics.progressPercentage}% Complete</span>
        </div>
      </div>

      {/* Action Button */}
      {onViewProgress && (
        <Button
          onClick={onViewProgress}
          className="w-full h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold uppercase tracking-wider transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <span>View Progress</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </span>
        </Button>
      )}
    </Card>
  );
};
