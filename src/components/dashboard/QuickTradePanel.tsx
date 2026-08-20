import React, { useState, useEffect } from "react";
import { Zap, ArrowRight, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface QuickTradePanelProps {
  userBalance?: number;
  onStartTrade: (amount: number) => void;
  onExploreHigherTrades?: () => void;
  className?: string;
}

export const QuickTradePanel: React.FC<QuickTradePanelProps> = ({
  onStartTrade,
  onExploreHigherTrades,
  className = "",
}) => {
  const { formatCurrency, convertCurrency, preferredCurrency } = useCurrency();

  const [qtConfig, setQtConfig] = useState<{
    minUsd: number;
    maxUsd: number;
    defaultUsd: number;
    returnPct: number;
    cycleDays: number;
    enabled: boolean;
    presetsUsd: number[];
  }>({
    minUsd: 100,
    maxUsd: 999,
    defaultUsd: 450,
    returnPct: 8.4,
    cycleDays: 3,
    enabled: true,
    presetsUsd: [100, 250, 450, 750, 999],
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setQtConfig({
          minUsd: Number(data.quickTradeMin ?? 100),
          maxUsd: Number(data.quickTradeMax ?? 999),
          defaultUsd: Number(data.quickTradeDefault ?? 450),
          returnPct: Number(data.quickTradeReturnPct ?? 8.4),
          cycleDays: Number(data.quickTradeCycleDays ?? 3),
          enabled: data.quickTradeEnabled !== false,
          presetsUsd: Array.isArray(data.quickTradePresets) && data.quickTradePresets.length > 0
            ? data.quickTradePresets.map(Number)
            : [100, 250, 450, 750, 999],
        });
      }
    }, (err) => console.warn("QuickTradePanel snapshot error:", err));
    return () => unsub();
  }, []);

  // Convert USD base limits into the user's preferred currency
  const minAmount = Math.round(convertCurrency(qtConfig.minUsd));
  const maxAmount = Math.round(convertCurrency(qtConfig.maxUsd));
  const defaultAmount = Math.round(convertCurrency(qtConfig.defaultUsd));

  const presets = qtConfig.presetsUsd.map((usd) => Math.round(convertCurrency(usd)));

  const [inputValue, setInputValue] = useState<string>(defaultAmount.toString());

  // Reset or adjust input when currency changes or defaultUsd changes
  useEffect(() => {
    setInputValue(defaultAmount.toString());
  }, [preferredCurrency, qtConfig.defaultUsd]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handlePresetSelect = (val: number) => {
    setInputValue(val.toString());
  };

  const numericAmount = parseInt(inputValue, 10);
  const isValid = !isNaN(numericAmount) && numericAmount >= minAmount && numericAmount <= maxAmount;

  // Admin configurable return percentage over cycle days
  const estimatedProfit = isValid ? Math.round(numericAmount * (qtConfig.returnPct / 100)) : 0;

  // Formatted range string e.g. "$100 – $999" or "£79 – £789"
  const formattedMin = formatCurrency(qtConfig.minUsd);
  const formattedMax = formatCurrency(qtConfig.maxUsd);
  const currencySymbol = formattedMin.replace(/[\d,.\s]/g, '') || '$';

  if (!qtConfig.enabled) {
    return null;
  }

  return (
    <div className={`bg-[#0c142b] border border-[#19264c] rounded-2xl p-5 shadow-xl relative overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-base font-bold text-white tracking-tight">Quick Trade</span>
        </div>
        <div className="bg-[#3b195c] text-[#d8b4fe] text-xs font-semibold px-3 py-1 rounded-full border border-[#58218d] flex items-center gap-1 shadow-sm">
          <Sparkles className="w-3 h-3 text-[#c084fc]" />
          <span>{qtConfig.cycleDays}-Day Cycle</span>
        </div>
      </div>

      {/* Amount Input Block */}
      <div className="bg-[#070d21] border border-[#18264c] rounded-xl p-3.5 mb-3 space-y-2.5">
        <div className="flex justify-between items-center text-xs font-medium text-slate-400">
          <span>Input Amount ({formattedMin} – {formattedMax})</span>
          <span className="text-blue-400 font-mono font-semibold">{formattedMin} – {formattedMax}</span>
        </div>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-base">{currencySymbol}</span>
          <input
            type="number"
            min={minAmount}
            max={maxAmount}
            value={inputValue}
            onChange={handleInputChange}
            className={`w-full bg-[#0d1738] border ${
              isValid ? "border-[#213568] focus:border-blue-400" : "border-rose-500/60 focus:border-rose-400"
            } rounded-lg py-2.5 pl-8 pr-3 text-center text-xl font-bold font-mono text-white outline-none transition-all`}
            placeholder={defaultAmount.toString()}
          />
        </div>

        {!isValid && (
          <div className="flex items-center justify-center gap-1 text-[11px] text-rose-400 font-medium pt-1">
            <AlertCircle className="w-3 h-3" />
            <span>Amount must be between {formattedMin} and {formattedMax}</span>
          </div>
        )}

        {/* Quick Amount Presets */}
        <div className="flex justify-between gap-1.5 pt-1">
          {presets.map((val) => {
            const isSelected = isValid && numericAmount === val;
            return (
              <button
                type="button"
                key={val}
                onClick={() => handlePresetSelect(val)}
                className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1f3875] text-blue-300 border border-[#3b82f6]/40 shadow-sm"
                    : "bg-[#0a122e] text-slate-400 hover:text-slate-200 border border-[#142144]"
                }`}
              >
                {currencySymbol}{val}
              </button>
            );
          })}
        </div>
      </div>

      {/* Estimated Return Row */}
      <div className="flex items-center justify-between my-3 px-1">
        <span className="text-sm text-slate-400 font-medium">
          Est. return on {currencySymbol}{isValid ? numericAmount : 0}
        </span>
        <span className="text-base font-bold text-[#10b981]">
          +{currencySymbol}{estimatedProfit} (+{qtConfig.returnPct}%)
        </span>
      </div>

      {/* Start Quick Trade Button */}
      <Button
        disabled={!isValid}
        onClick={() => isValid && onStartTrade(numericAmount)}
        className={`w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all border border-white/10 ${
          isValid
            ? "bg-gradient-to-r from-[#2563eb] via-[#7c3aed] to-[#a855f7] hover:opacity-95 text-white cursor-pointer"
            : "bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700"
        }`}
      >
        <span>Start Quick Trade</span>
        <TrendingUp className="w-4 h-4" />
      </Button>
    </div>
  );
};
