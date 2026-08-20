import React, { useState, useEffect } from "react";
import { Zap, ChevronLeft, ArrowRight, ShieldCheck, Wallet, AlertCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrency } from "@/contexts/CurrencyContext";

interface QuickTradeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  userBalance: number;
  isSubmitting?: boolean;
}

export const QuickTradeConfirmModal: React.FC<QuickTradeConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  userBalance,
  isSubmitting = false,
}) => {
  const { formatCurrency } = useCurrency();
  const [returnPct, setReturnPct] = useState<number>(8.4);
  const [cycleDays, setCycleDays] = useState<number>(3);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.quickTradeReturnPct !== undefined) setReturnPct(Number(data.quickTradeReturnPct));
        if (data.quickTradeCycleDays !== undefined) setCycleDays(Number(data.quickTradeCycleDays));
      }
    }, (err) => console.warn("QuickTradeConfirmModal error:", err));
    return () => unsub();
  }, []);

  const estimatedReturn = amount * (returnPct / 100);
  const totalPayout = amount + estimatedReturn;
  const shortfall = Math.max(0, amount - userBalance);
  const hasSufficientBalance = userBalance >= amount;

  // Calculate settlement date (Today + cycleDays)
  const settlementDate = new Date();
  settlementDate.setDate(settlementDate.getDate() + cycleDays);
  const formattedDate = settlementDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto bg-[#0a0a0a] border border-white/10 rounded-3xl p-5 sm:p-7 text-white shadow-2xl custom-scrollbar">
        {/* Header matching Flex/Fixed configure header */}
        <DialogHeader className="text-left pb-1">
          <div className="flex items-center text-base sm:text-lg font-bold text-white relative z-10">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 p-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Configure QUICK TRADE Plan</span>
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Investment Amount Card (Exact match of Flex/Fixed Plan gradient card) */}
        <div className="bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] rounded-[1.75rem] p-5 sm:p-6 my-2 relative overflow-hidden shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="flex justify-between items-center mb-3 relative z-10">
            <div className="text-xs text-white/90 font-bold uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
              Investment Amount
            </div>
            <div className="text-xs text-blue-100 bg-white/20 px-3 py-1 rounded-full border border-white/20 font-medium">
              Fixed Model
            </div>
          </div>

          <div className="text-4xl sm:text-5xl font-bold text-white mb-1 relative z-10 font-sans flex items-baseline tracking-tighter">
            {formatCurrency(amount)}
            <span className="text-xl sm:text-2xl text-blue-200/70 ml-1">.00</span>
          </div>
          <div className="text-xs text-blue-100/80 font-mono mt-1 relative z-10">
            {cycleDays}-Day AI High-Frequency Arbitrage Cycle
          </div>
        </div>

        {/* Configuration Box */}
        <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase mt-2 mb-2">
          Configuration
        </div>
        <div className="bg-[#0f172a] rounded-[1.25rem] p-4 sm:p-5 mb-3 border border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-white font-medium">Payment interval</div>
              <div className="text-xs text-[#8492a6] mt-0.5">Fixed Model (No recurring intervals)</div>
            </div>
            <div className="text-sm text-white font-mono font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/5">
              One-time
            </div>
          </div>
        </div>

        {/* Plan Summary Box (Exact match of Flex/Fixed Plan summary) */}
        <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase mt-2 mb-2">
          Plan Summary
        </div>
        <div className="bg-[#0f172a] rounded-[1.25rem] p-4 sm:p-5 mb-3 border border-white/5 space-y-3">
          <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
            <span className="text-sm text-[#8492a6]">Total investment</span>
            <span className="text-sm text-white font-mono font-bold">{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
            <span className="text-sm text-[#8492a6]">Schedule</span>
            <span className="text-sm text-white font-mono font-medium">One-time</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
            <span className="text-sm text-[#8492a6]">Total duration</span>
            <span className="text-sm text-white font-mono font-medium">{cycleDays} days</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
            <span className="text-sm text-[#8492a6]">Est. Settlement Date</span>
            <span className="text-sm text-cyan-300 font-mono font-bold">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
            <span className="text-sm text-[#8492a6]">Projected profit ({returnPct}%)</span>
            <span className="text-sm text-emerald-400 font-mono font-bold">+{formatCurrency(estimatedReturn)}</span>
          </div>
          <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
            <span className="text-sm text-[#8492a6]">Estimated final return</span>
            <span className="text-sm text-white font-mono font-bold">{formatCurrency(totalPayout)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#8492a6]">Confidence</span>
            <span className="text-sm text-[#eab308] font-bold">High (AI Scaled)</span>
          </div>
        </div>

        <div className="text-xs text-[#475569] leading-relaxed mb-4 px-1">
          Projections are modeled on historical performance across comparable plans and are not guaranteed. Markets move — actual returns will vary.
        </div>

        {/* Current Trading Balance Box */}
        <div className="bg-[#0f172a] rounded-[1.25rem] border border-white/5 p-4 sm:p-5 mb-4 space-y-3">
          <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase">
            Current Trading Balance
          </div>
          <div className="text-3xl sm:text-4xl text-emerald-400 font-sans font-bold tracking-tighter border-b border-white/[0.05] pb-3">
            {formatCurrency(userBalance)}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm text-[#8492a6]">Required payment</span>
            <span className="text-xs sm:text-sm text-white font-mono font-bold">{formatCurrency(amount)}</span>
          </div>
        </div>

        {!hasSufficientBalance && (
          <div className="bg-[#3f1212]/30 border-l-2 border-[#ef4444] p-3.5 text-xs text-[#ef4444] leading-relaxed mb-4 rounded-r-xl">
            Short by {formatCurrency(shortfall)}. Deposit to bring your balance current and activate this plan.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-1">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-13 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-wider"
          >
            Cancel
          </Button>

          <Button
            disabled={isSubmitting}
            onClick={onConfirm}
            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold h-13 rounded-xl text-xs sm:text-sm transition-all uppercase tracking-wider border border-white/20 shadow-lg shadow-blue-500/20"
          >
            {isSubmitting ? (
              <span>Activating Trade...</span>
            ) : hasSufficientBalance ? (
              <span className="flex items-center gap-1.5 justify-center">
                <span>Activate Quick Trade</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center gap-1.5 justify-center">
                <span>Deposit {formatCurrency(shortfall)} to Activate</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickTradeConfirmModal;
