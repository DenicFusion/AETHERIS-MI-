import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";

interface TabQuickTradeProps {
  amount: number;
  userBalance: number;
  userData?: any;
  globalConfig?: any;
  goBack: () => void;
  navigateTab: (tab: any) => void;
  setPendingPlanForDeposit?: (plan: any) => void;
  setSearchParams?: any;
}

export function TabQuickTrade({
  amount: initialAmount,
  userBalance,
  userData,
  globalConfig,
  goBack,
  navigateTab,
  setPendingPlanForDeposit,
  setSearchParams,
}: TabQuickTradeProps) {
  const { formatCurrency } = useCurrency();
  const [returnPct, setReturnPct] = useState<number>(8.4);
  const [cycleDays, setCycleDays] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const minAmount = 100;
  const maxAmount = 999;

  const [tradeAmount, setTradeAmount] = useState<number>(() => {
    const raw = Number(initialAmount) || 450;
    return Math.min(maxAmount, Math.max(minAmount, raw));
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.quickTradeReturnPct !== undefined) setReturnPct(Number(data.quickTradeReturnPct));
        if (data.quickTradeCycleDays !== undefined) setCycleDays(Number(data.quickTradeCycleDays));
      }
    }, (err) => console.warn("QuickTrade config error:", err));
    return () => unsub();
  }, []);

  const estimatedReturn = tradeAmount * (returnPct / 100);
  const totalPayout = tradeAmount + estimatedReturn;
  const shortfall = Math.max(0, tradeAmount - userBalance);
  const hasSufficientBalance = userBalance >= tradeAmount;

  // Calculate settlement date (Today + cycleDays)
  const settlementDate = new Date();
  settlementDate.setDate(settlementDate.getDate() + cycleDays);
  const formattedDate = settlementDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const progressPercent = maxAmount > minAmount ? ((tradeAmount - minAmount) / (maxAmount - minAmount)) * 100 : 0;

  const handleConfirm = async () => {
    if (!tradeAmount || !auth.currentUser) return;
    setIsSubmitting(true);
    try {
      const walletBal = userData?.wallet_balance ?? userData?.balance ?? 0;
      const signupBonus = userData?.signup_reward_amount || 0;
      const userBal = Math.max(0, walletBal - signupBonus);
      const initialStatus = userBal >= tradeAmount ? "active" : "pending_activation";

      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const response = await fetch(`${baseUrl}/api/start-investment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          planId: "quick_trade",
          totalAmount: tradeAmount,
          durationDays: cycleDays,
          intervalDays: cycleDays,
          expectedReturnPct: returnPct,
          status: initialStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start Quick Trade");
      }

      if (userBal < tradeAmount) {
        if (setPendingPlanForDeposit) {
          setPendingPlanForDeposit({
            id: data.investmentId,
            name: "QUICK TRADE",
            amount_per_interval: tradeAmount,
            min: tradeAmount,
          });
        }
        if (setSearchParams) {
          setSearchParams({ tab: "deposit", amount: String(tradeAmount), plan: "QUICK TRADE" });
        } else {
          navigateTab("deposit");
        }
        toast.info("Insufficient trading balance. Please fund your Trading Balance to continue.");
      } else {
        toast.success(`⚡ Quick Trade activated! Your ${cycleDays}-day AI trading cycle has begun.`);
        navigateTab("home");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to activate Quick Trade");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white p-5 md:p-8 w-full max-w-2xl mx-auto flex flex-col relative animate-in fade-in duration-300 pb-32">
      {/* Header */}
      <div className="flex items-center text-lg font-bold text-white mb-6 mt-2 relative z-10">
        <ChevronLeft
          className="w-6 h-6 mr-3 cursor-pointer hover:text-slate-300 transition-colors"
          onClick={goBack}
        />
        <span>Configure QUICK TRADE Plan</span>
      </div>

      {/* Investment Amount Card */}
      <div className="bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] rounded-[1.75rem] p-6 mb-8 relative overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex justify-between items-center mb-4 relative z-10">
          <div className="text-xs text-white/90 font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
            Investment Amount
          </div>
          <div className="text-xs text-blue-100 bg-white/20 px-3 py-1 rounded-full border border-white/20 font-medium">
            {tradeAmount === minAmount ? "Fixed Tier" : "Custom Amount"}
          </div>
        </div>

        <div className="text-5xl font-bold text-white mb-2 relative z-10 font-sans flex items-baseline tracking-tighter">
          {formatCurrency(tradeAmount)}
        </div>

        {/* Dragger Slider for 100 - 999 */}
        <div className="relative z-10 mt-6">
          <div className="text-sm text-blue-100 mb-6 font-medium">
            Drag to set an amount between {formatCurrency(minAmount)} and {formatCurrency(maxAmount)}
          </div>

          <div className="relative mb-2">
            <input
              type="range"
              min={minAmount}
              max={maxAmount}
              step={1}
              value={tradeAmount}
              onChange={(e) => setTradeAmount(Number(e.target.value))}
              className="w-full appearance-none cursor-pointer bg-transparent"
              style={{
                "--progress": `${progressPercent}%`,
              } as any}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 24px;
                width: 24px;
                border-radius: 50%;
                background: #ffffff;
                border: 0;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3), inset 0 0 0 6px #3b82f6;
                margin-top: -10px;
                cursor: pointer;
              }
              input[type=range]::-webkit-slider-runnable-track {
                width: 100%;
                height: 4px;
                cursor: pointer;
                background: linear-gradient(to right, #ffffff var(--progress), rgba(255,255,255,0.3) var(--progress));
                border-radius: 2px;
              }
              input[type=range]::-moz-range-thumb {
                height: 24px;
                width: 24px;
                border-radius: 50%;
                background: #ffffff;
                border: 0;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3), inset 0 0 0 6px #3b82f6;
                cursor: pointer;
              }
              input[type=range]::-moz-range-track {
                width: 100%;
                height: 4px;
                cursor: pointer;
                background: linear-gradient(to right, #ffffff var(--progress), rgba(255,255,255,0.3) var(--progress));
                border-radius: 2px;
              }
            `}</style>
          </div>
          <div className="flex justify-between text-xs text-blue-100 font-medium">
            <span>{formatCurrency(minAmount)}</span>
            <span>{formatCurrency(maxAmount)}</span>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase mb-4">
        Configuration
      </div>
      <div className="bg-[#0f172a] rounded-[1.25rem] p-5 mb-8 border border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-white">Payment interval</div>
            <div className="text-xs text-[#8492a6] mt-0.5">Fixed Model</div>
          </div>
          <div className="text-sm text-white font-mono">One-time</div>
        </div>
      </div>

      {/* Plan Summary */}
      <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase mb-4">
        Plan Summary
      </div>
      <div className="bg-[#0f172a] rounded-[1.25rem] p-5 mb-4 border border-white/5 space-y-4">
        <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
          <span className="text-sm text-[#8492a6]">Total investment</span>
          <span className="text-sm text-white font-mono font-medium">{formatCurrency(tradeAmount)}</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
          <span className="text-sm text-[#8492a6]">Schedule</span>
          <span className="text-sm text-white font-mono font-medium">One-time</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
          <span className="text-sm text-[#8492a6]">Total duration</span>
          <span className="text-sm text-white font-mono font-medium">{cycleDays} days</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
          <span className="text-sm text-[#8492a6]">Est. Settlement Date</span>
          <span className="text-sm text-cyan-300 font-mono font-bold">{formattedDate}</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
          <span className="text-sm text-[#8492a6]">Projected profit ({returnPct}%)</span>
          <span className="text-sm text-emerald-400 font-mono font-bold">+{formatCurrency(estimatedReturn)}</span>
        </div>
        <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
          <span className="text-sm text-[#8492a6]">Estimated final return</span>
          <span className="text-sm text-white font-mono font-bold">{formatCurrency(totalPayout)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#8492a6]">Confidence</span>
          <span className="text-sm text-[#eab308] font-bold">High</span>
        </div>
      </div>

      <div className="text-xs text-[#475569] leading-relaxed mb-8 px-1">
        Projections are modeled on historical performance across comparable plans and are not guaranteed. Markets move — actual returns will vary.
      </div>

      {/* Current Trading Balance Box */}
      <div className="bg-[#0f172a] rounded-[1.25rem] border border-white/5 p-5 mb-6 space-y-4">
        <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase">
          Current Trading Balance
        </div>
        <div className="text-4xl text-emerald-400 font-sans font-bold tracking-tighter border-b border-white/[0.05] pb-4">
          {formatCurrency(userBalance)}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-[#8492a6]">Required payment</span>
          <span className="text-sm text-white font-mono font-bold">{formatCurrency(tradeAmount)}</span>
        </div>
      </div>

      {!hasSufficientBalance && (
        <div className="bg-[#3f1212]/30 border-l-2 border-[#ef4444] p-4 text-xs text-[#ef4444] leading-relaxed mb-6">
          Short by {formatCurrency(shortfall)}. Deposit to bring your balance current and activate this plan.
        </div>
      )}

      {/* Action Button */}
      <Button
        disabled={isSubmitting}
        onClick={handleConfirm}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 rounded-xl text-sm transition-all uppercase tracking-wider border border-white/20 shadow-lg shadow-blue-500/20"
      >
        {isSubmitting
          ? "Initializing..."
          : !hasSufficientBalance
          ? `Deposit ${formatCurrency(shortfall)} to Activate`
          : "Activate QUICK TRADE"}
      </Button>
    </div>
  );
}
