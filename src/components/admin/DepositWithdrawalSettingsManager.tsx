import React, { useState, useEffect } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, 
  Save, 
  RefreshCcw, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShieldCheck, 
  ShieldAlert, 
  Crown, 
  Layers, 
  MessageSquareQuote,
  Eye,
  Lock
} from "lucide-react";
import { toast } from "sonner";

export const TIER_CONFIG = [
  { id: "ALL", name: "All Tiers (No Restriction)", minDeposit: 0, level: 0, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  { id: "STARTER", name: "STARTER Tier & Above", minDeposit: 500, level: 1, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { id: "CORE", name: "CORE Tier & Above", minDeposit: 3000, level: 2, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  { id: "PRIME", name: "PRIME Tier & Above", minDeposit: 10000, level: 3, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { id: "QUANTUM", name: "QUANTUM Tier & Above", minDeposit: 50000, level: 4, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { id: "APEX", name: "APEX Tier & Above", minDeposit: 100000, level: 5, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { id: "ULTRA", name: "ULTRA Tier & Above", minDeposit: 500000, level: 6, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" }
];

export const DEFAULT_DECLINE_MESSAGE = "Withdrawals are currently restricted to QUANTUM tier accounts and above at this moment. Your active tier does not meet this threshold. Please upgrade your active portfolio allocation or contact your account manager to request an allocation clearance.";

export function DepositWithdrawalSettingsManager() {
  const [minDeposit, setMinDeposit] = useState<number>(25);
  const [minWithdrawalMain, setMinWithdrawalMain] = useState<number>(5000);
  const [minWithdrawalReferral, setMinWithdrawalReferral] = useState<number>(200);

  // Tier-based withdrawal restriction
  const [tierRequirement, setTierRequirement] = useState<string>("QUANTUM");
  const [tierRestrictionEnabled, setTierRestrictionEnabled] = useState<boolean>(true);
  const [declinedMessage, setDeclinedMessage] = useState<string>(DEFAULT_DECLINE_MESSAGE);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.minDepositAmount !== undefined) setMinDeposit(Number(data.minDepositAmount));
        else if (data.min_deposit_usd !== undefined) setMinDeposit(Number(data.min_deposit_usd));

        if (data.minWithdrawalMain !== undefined) setMinWithdrawalMain(Number(data.minWithdrawalMain));
        else if (data.min_withdrawal_main !== undefined) setMinWithdrawalMain(Number(data.min_withdrawal_main));

        if (data.minWithdrawalReferral !== undefined) setMinWithdrawalReferral(Number(data.minWithdrawalReferral));
        else if (data.min_withdrawal_ref !== undefined) setMinWithdrawalReferral(Number(data.min_withdrawal_ref));

        if (data.withdrawalTierRequirement !== undefined) setTierRequirement(data.withdrawalTierRequirement);
        if (data.withdrawalTierRestrictionEnabled !== undefined) setTierRestrictionEnabled(data.withdrawalTierRestrictionEnabled);
        if (data.withdrawalTierDeclinedMessage) setDeclinedMessage(data.withdrawalTierDeclinedMessage);
      }
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "config", "global"),
        {
          minDepositAmount: Number(minDeposit),
          min_deposit_usd: Number(minDeposit),
          minWithdrawalMain: Number(minWithdrawalMain),
          min_withdrawal_main: Number(minWithdrawalMain),
          minWithdrawalReferral: Number(minWithdrawalReferral),
          min_withdrawal_ref: Number(minWithdrawalReferral),
          withdrawalTierRequirement: tierRequirement,
          withdrawalTierRestrictionEnabled: tierRestrictionEnabled && tierRequirement !== "ALL",
          withdrawalTierDeclinedMessage: declinedMessage.trim() || DEFAULT_DECLINE_MESSAGE,
        },
        { merge: true }
      );
      toast.success("Deposit, Withdrawal, and Tier Eligibility rules updated successfully!");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update deposit and withdrawal settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setMinDeposit(25);
    setMinWithdrawalMain(5000);
    setMinWithdrawalReferral(200);
    setTierRequirement("QUANTUM");
    setTierRestrictionEnabled(true);
    setDeclinedMessage(DEFAULT_DECLINE_MESSAGE);
    toast.info("Reset to defaults ($25 min deposit, $5,000 min withdrawal, QUANTUM tier required). Click 'Save Financial Limits' to apply.");
  };

  return (
    <Card className="bg-black/40 border-white/5 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase italic tracking-tighter text-white">
              <DollarSign className="w-5 h-5 text-emerald-400 fill-emerald-400/20" /> Deposit, Withdrawal & Tier Restrictions
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Configure minimum financial thresholds and control tier eligibility for client withdrawals in real time.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> Live Sync
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Thresholds */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
              <ArrowDownLeft className="w-4 h-4" />
              Minimum Deposit ($ USD)
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Smallest deposit amount allowed across Fiat & Crypto gateways.
            </p>
            <div className="relative mt-2">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">$</span>
              <input
                type="number"
                min="1"
                value={minDeposit}
                onChange={(e) => setMinDeposit(Math.max(1, Number(e.target.value)))}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
              <ArrowUpRight className="w-4 h-4" />
              Main Balance Min Withdrawal ($ USD)
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Smallest withdrawal amount allowed from total/main balance.
            </p>
            <div className="relative mt-2">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">$</span>
              <input
                type="number"
                min="1"
                value={minWithdrawalMain}
                onChange={(e) => setMinWithdrawalMain(Math.max(1, Number(e.target.value)))}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          <div className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
              <ArrowUpRight className="w-4 h-4" />
              Referral Balance Min Withdrawal ($ USD)
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Smallest withdrawal amount allowed from referral earnings.
            </p>
            <div className="relative mt-2">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">$</span>
              <input
                type="number"
                min="1"
                value={minWithdrawalReferral}
                onChange={(e) => setMinWithdrawalReferral(Math.max(1, Number(e.target.value)))}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        </div>

        {/* Tier-Based Withdrawal Lock & Custom Pop-up Message Section */}
        <div className="p-5 bg-[#0b1022]/80 border border-primary/20 rounded-2xl space-y-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
                <Crown className="w-4 h-4 text-amber-400" />
                Tier-Based Withdrawal Eligibility & Custom Decline Notice
              </div>
              <p className="text-xs text-slate-400">
                Control which tier of members are allowed to request withdrawals (e.g. only Quantum and above), and customize the pop-up modal notice shown when an ineligible member attempts to withdraw.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={tierRestrictionEnabled} 
                  onChange={(e) => setTierRestrictionEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary" 
                />
                Enable Tier Gate
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Required Tier Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Required Eligible Tier
              </label>
              <select
                value={tierRequirement}
                onChange={(e) => setTierRequirement(e.target.value)}
                disabled={!tierRestrictionEnabled}
                className="w-full bg-black/70 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
              >
                {TIER_CONFIG.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#0b0f19] text-white py-2">
                    {t.name} {t.minDeposit > 0 ? `(Min $${t.minDeposit.toLocaleString()})` : ""}
                  </option>
                ))}
              </select>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Policy Status</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {tierRestrictionEnabled && tierRequirement !== "ALL" ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Only accounts at <strong>{tierRequirement}</strong> tier and above are eligible to request withdrawals.
                    </span>
                  ) : (
                    <span className="text-blue-400 font-bold">
                      All registered members are currently eligible to request withdrawals.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Editable Decline Pop-Up Message */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-primary" />
                  Decline Pop-Up Modal Message
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(!showPreviewModal)}
                  className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" /> {showPreviewModal ? "Hide Preview" : "Preview Modal"}
                </button>
              </div>

              <Textarea
                value={declinedMessage}
                onChange={(e) => setDeclinedMessage(e.target.value)}
                disabled={!tierRestrictionEnabled}
                rows={4}
                placeholder="Enter the message explaining why their withdrawal request was declined and what tier is required..."
                className="bg-black/70 border border-white/15 rounded-xl p-3 text-xs text-white leading-relaxed focus:border-primary resize-none disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-400">
                This exact text will be displayed in an elegant alert pop-up when an ineligible user clicks the withdrawal button.
              </p>
            </div>
          </div>

          {/* Live Preview Card */}
          {showPreviewModal && (
            <div className="mt-4 p-5 bg-black/90 border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Eye className="w-3 h-3" /> Live User Modal Preview
                </span>
                <span className="text-[10px] font-mono text-slate-500">Preview Mode</span>
              </div>
              <div className="p-4 bg-[#070b18] border border-white/10 rounded-xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-white text-base uppercase tracking-tight">
                  Withdrawal Tier Restriction
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed italic border-l-2 border-amber-500/50 pl-3 py-1">
                  "{declinedMessage || DEFAULT_DECLINE_MESSAGE}"
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    Required: {tierRequirement}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <Button
            variant="outline"
            onClick={handleResetDefaults}
            className="border-white/10 text-slate-300 hover:bg-white/5 text-xs font-bold"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Defaults
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving || !loaded}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider px-6 h-10 shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? "Saving Configuration..." : "Save Financial Limits"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
