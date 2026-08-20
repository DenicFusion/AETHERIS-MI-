import React, { useState, useEffect } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { 
  Landmark, 
  ArrowUpFromLine, 
  Plus, 
  CreditCard, 
  ChevronLeft, 
  ShieldAlert, 
  Lock, 
  X, 
  ArrowRight,
  Crown
} from "lucide-react";
import { WithdrawalReceipt } from "../WithdrawalReceipt";
import { PaymentMethodsSettings } from "../profile/ProfileExtras";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DEFAULT_DECLINE_MESSAGE } from "../admin/DepositWithdrawalSettingsManager";

export function TabWithdrawal({
  availableBalance,
  profitBalance,
  referralBalance,
  preferredCurrency,
  investments = [],
  goBack,
  onNavigateToInvest,
}: {
  availableBalance: number;
  profitBalance: number;
  referralBalance: number;
  preferredCurrency: string;
  investments?: any[];
  goBack: () => void;
  onNavigateToInvest?: () => void;
}) {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [addingMethod, setAddingMethod] = useState(false);

  // User profile data for tier calculation
  const [userProfile, setUserProfile] = useState<any>(null);

  // Form values
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<"main" | "referral">("main");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Real-time generated submission receipt storage
  const [submittedWithdrawal, setSubmittedWithdrawal] = useState<any | null>(null);
  
  // Dynamic minimum thresholds & tier restrictions from global config
  const [minMainConfig, setMinMainConfig] = useState<number>(5000);
  const [minRefConfig, setMinRefConfig] = useState<number>(200);
  const [tierRequirement, setTierRequirement] = useState<string>("QUANTUM");
  const [tierRestrictionEnabled, setTierRestrictionEnabled] = useState<boolean>(false);
  const [tierDeclinedMessage, setTierDeclinedMessage] = useState<string>(DEFAULT_DECLINE_MESSAGE);

  // Tier Restriction Modal Pop-up State
  const [showTierDeclineModal, setShowTierDeclineModal] = useState<boolean>(false);
  const [activeDeclineMessage, setActiveDeclineMessage] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "global"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.minWithdrawalMain !== undefined) setMinMainConfig(Number(data.minWithdrawalMain));
        else if (data.min_withdrawal_main !== undefined) setMinMainConfig(Number(data.min_withdrawal_main));

        if (data.minWithdrawalReferral !== undefined) setMinRefConfig(Number(data.minWithdrawalReferral));
        else if (data.min_withdrawal_ref !== undefined) setMinRefConfig(Number(data.min_withdrawal_ref));

        if (data.withdrawalTierRequirement !== undefined) setTierRequirement(data.withdrawalTierRequirement);
        if (data.withdrawalTierRestrictionEnabled !== undefined) setTierRestrictionEnabled(data.withdrawalTierRestrictionEnabled);
        if (data.withdrawalTierDeclinedMessage) setTierDeclinedMessage(data.withdrawalTierDeclinedMessage);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    });

    const q = query(collection(db, "user_payment_methods"), where("userId", "==", user.uid));
    const unsubMethods = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMethods(docs);
      if (docs.length > 0 && !selectedMethodId) {
        setSelectedMethodId(docs[0].id);
      }
    });

    return () => {
      unsubUser();
      unsubMethods();
    };
  }, [user?.uid]);

  // Computations
  const totalMainBalance = availableBalance + profitBalance;
  const currentAvailable = source === 'main' ? totalMainBalance : referralBalance;
  const minAmount = source === 'main' ? minMainConfig : minRefConfig;
  
  const amountNum = Number(amount);
  const isMinimumReached = amountNum >= minAmount;
  const isBalanceSufficient = amountNum <= currentAvailable;

  // Calculate User Tier Level
  const TIER_LEVELS: Record<string, number> = {
    'NONE': 0,
    'STARTER': 1,
    'CORE': 2,
    'PRIME': 3,
    'QUANTUM': 4,
    'APEX': 5,
    'ULTRA': 6,
    'ALL': 0
  };

  const getUserTier = (): { tierName: string; tierLevel: number } => {
    if (userProfile?.role === 'admin') return { tierName: 'ADMIN / UNRESTRICTED', tierLevel: 99 };

    let level = 0;
    let name = 'STARTER';

    if (userProfile?.tier && TIER_LEVELS[userProfile.tier.toUpperCase()] !== undefined) {
      level = TIER_LEVELS[userProfile.tier.toUpperCase()];
      name = userProfile.tier.toUpperCase();
    }

    // Check active investment plans
    investments.forEach((inv) => {
      if (inv.status === 'active') {
        const pName = (inv.plan_name || inv.planName || '').toUpperCase();
        Object.keys(TIER_LEVELS).forEach((tKey) => {
          if (pName.includes(tKey) && TIER_LEVELS[tKey] > level) {
            level = TIER_LEVELS[tKey];
            name = tKey;
          }
        });
      }
    });

    const totalVal = Math.max(
      userProfile?.total_deposits || 0,
      userProfile?.totalDeposited || 0,
      totalMainBalance || 0
    );

    if (totalVal >= 500000 && level < 6) { level = 6; name = 'ULTRA'; }
    else if (totalVal >= 100000 && level < 5) { level = 5; name = 'APEX'; }
    else if (totalVal >= 50000 && level < 4) { level = 4; name = 'QUANTUM'; }
    else if (totalVal >= 10000 && level < 3) { level = 3; name = 'PRIME'; }
    else if (totalVal >= 3000 && level < 2) { level = 2; name = 'CORE'; }
    else if (totalVal >= 500 && level < 1) { level = 1; name = 'STARTER'; }

    return { tierName: name, tierLevel: level };
  };

  const { tierName: currentUserTierName, tierLevel: currentUserTierLevel } = getUserTier();
  const requiredLevel = TIER_LEVELS[tierRequirement.toUpperCase()] ?? 0;
  const isTierEligible = !tierRestrictionEnabled || tierRequirement === 'ALL' || userProfile?.role === 'admin' || currentUserTierLevel >= requiredLevel;

  const handleWithdraw = async () => {
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amountNum > currentAvailable) {
      toast.error(`Insufficient ${source === 'main' ? 'Total' : 'Referral'} balance`);
      return;
    }
    if (source === 'main' && amountNum < minMainConfig) {
      toast.error(`Minimum withdrawal for Total Balance is $${minMainConfig.toLocaleString()}`);
      return;
    }
    if (source === 'referral' && amountNum < minRefConfig) {
      toast.error(`Minimum referral withdrawal is $${minRefConfig.toLocaleString()}`);
      return;
    }

    const selectedMethod = methods.find(m => m.id === selectedMethodId);
    if (!selectedMethod) {
      toast.error("Please select a withdrawal destination");
      return;
    }

    // Check Tier Restriction ONLY when user has enough balance and meets the minimum threshold
    if (source === 'main' && !isTierEligible) {
      const msg = tierDeclinedMessage || DEFAULT_DECLINE_MESSAGE;
      setActiveDeclineMessage(msg);
      setShowTierDeclineModal(true);
      return;
    }

    // Map saved payment method format to API format
    const isCrypto = selectedMethod.type === 'crypto';
    const methodStr = isCrypto ? 'crypto' : 'wire';
    
    const payloadBankName = isCrypto 
      ? selectedMethod.network || 'Crypto' 
      : selectedMethod.bankName || 'Bank Account';
      
    const payloadAccountNumber = selectedMethod.details || selectedMethod.iban || selectedMethod.accountNumber || '';
    const payloadAccountName = selectedMethod.accountName || selectedMethod.accountHolder || '';
    const payloadRoutingNumber = selectedMethod.swift || '';

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.uid,
          amount: amountNum,
          source,
          method: methodStr,
          bankName: payloadBankName,
          accountName: payloadAccountName,
          accountNumber: payloadAccountNumber,
          routingNumber: payloadRoutingNumber,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an invalid response.");
      }

      const data = await res.json();
      if (!res.ok) {
        if (data.tierDeclined || res.status === 403) {
          setActiveDeclineMessage(data.error || tierDeclinedMessage || DEFAULT_DECLINE_MESSAGE);
          setShowTierDeclineModal(true);
          return;
        }
        throw new Error(data.error || "Withdrawal failed");
      }

      // Set the returned withdrawal object to trigger real-time receipt viewport transition
      setSubmittedWithdrawal(data.withdrawal);
      toast.success("Withdrawal initiated successfully!");
      setAmount("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (addingMethod) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={() => setAddingMethod(false)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white">Manage Payout Methods</h2>
        </div>
        <PaymentMethodsSettings user={user} onBack={() => setAddingMethod(false)} />
      </div>
    );
  }

  // Real-time Viewport Transition: Display Receipt when withdrawal is submitted
  if (submittedWithdrawal) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setSubmittedWithdrawal(null)}
            className="text-slate-400 hover:text-white hover:bg-white/5 gap-2 text-xs uppercase tracking-wider font-bold"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Withdrawal Form
          </Button>
        </div>
        <WithdrawalReceipt withdrawal={submittedWithdrawal} onClose={() => setSubmittedWithdrawal(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={goBack}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <ArrowUpFromLine className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Withdraw Funds</h2>
        </div>
      </div>

      {/* Balance Switcher Pills */}
      <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
        <button
          type="button"
          onClick={() => setSource("main")}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
            source === "main"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Total Balance
        </button>
        <button
          type="button"
          onClick={() => setSource("referral")}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
            source === "referral"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Referral Balance
        </button>
      </div>

      {/* Available to Withdraw Center Card */}
      <div className="text-center py-2 space-y-1">
        <p className="text-xs uppercase font-bold tracking-widest text-slate-400">
          Available to Withdraw
        </p>
        <p className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
          {formatCurrency(currentAvailable)}
        </p>
        <p className="text-[11px] text-slate-500 font-medium pt-1">
          Min. withdrawal: <span className="text-slate-300 font-semibold">{formatCurrency(minAmount)}</span>
        </p>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Amount</span>
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-lg font-bold">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-9 pr-20 text-lg font-semibold text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
          />
          <button
            type="button"
            onClick={() => setAmount(currentAvailable.toString())}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-500/30 transition-colors uppercase tracking-wider cursor-pointer"
          >
            Max
          </button>
        </div>

        {amountNum > 0 && !isMinimumReached && (
          <div className="text-xs text-red-400 pl-1">Minimum withdrawal is {formatCurrency(minAmount)}</div>
        )}
        {amountNum > 0 && !isBalanceSufficient && (
          <div className="text-xs text-red-400 pl-1">Amount exceeds available balance</div>
        )}
      </div>

      {/* Destination Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Withdrawal Destination
          </span>
          <button
            type="button"
            onClick={() => setAddingMethod(true)}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New
          </button>
        </div>

        {methods.length === 0 ? (
          <div
            onClick={() => setAddingMethod(true)}
            className="bg-black/30 border border-dashed border-white/20 rounded-2xl p-6 text-center cursor-pointer hover:bg-white/5 hover:border-white/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5 text-slate-400 group-hover:text-white" />
            </div>
            <p className="text-sm font-medium text-slate-300 mb-1">No payment methods added</p>
            <p className="text-xs text-slate-500">Click here to add a bank account or crypto wallet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {methods.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMethodId(m.id)}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedMethodId === m.id
                    ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedMethodId === m.id ? "bg-blue-500/20" : "bg-[#172554]"
                    }`}
                  >
                    <Landmark
                      className={`w-5 h-5 ${selectedMethodId === m.id ? "text-blue-400" : "text-slate-400"}`}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white uppercase tracking-wide">
                      {m.type === "crypto" ? "Crypto Wallet" : "Bank Account"}
                      {m.network && ` (${m.network})`}
                      {m.bankName && ` - ${m.bankName}`}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {m.details || m.iban || m.accountNumber ? `IBAN/Acc: ${m.details || m.iban || m.accountNumber}` : ""}
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedMethodId === m.id ? "border-blue-500 bg-blue-500" : "border-slate-600"
                  }`}
                >
                  {selectedMethodId === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        className={`w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
          !amountNum || !isMinimumReached || !isBalanceSufficient || !selectedMethodId
            ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-60"
            : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50 hover:scale-[1.01]"
        }`}
        onClick={handleWithdraw}
        disabled={isSubmitting || !amountNum || !isMinimumReached || !isBalanceSufficient || !selectedMethodId}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Processing Request...
          </span>
        ) : (
          `Withdraw Funds`
        )}
      </Button>

      {/* TIER RESTRICTION DECLINE MODAL POP-UP */}
      <Dialog open={showTierDeclineModal} onOpenChange={setShowTierDeclineModal}>
        <DialogContent 
          showCloseButton={false}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92%] sm:w-full max-w-[500px] bg-[#070b18] border border-amber-500/30 text-white p-0 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95)]"
        >
          <div className="relative p-6 sm:p-8 space-y-6 text-center">
            {/* Close X */}
            <button
              onClick={() => setShowTierDeclineModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon Header */}
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
                <Lock className="w-3 h-3" /> Withdrawal Ineligible
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Tier Allocation Notice
              </h3>
            </div>

            {/* Custom Admin Configured Message */}
            <div className="p-4 bg-black/50 rounded-2xl border border-white/10 text-left">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic border-l-2 border-amber-500/60 pl-3.5 py-1">
                "{activeDeclineMessage || tierDeclinedMessage || DEFAULT_DECLINE_MESSAGE}"
              </p>
            </div>

            {/* Tier Comparison Pills */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="p-2 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Your Active Tier</span>
                <span className="text-xs font-black uppercase text-blue-400">{currentUserTierName}</span>
              </div>
              <div className="p-2 text-center border-l border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Required Tier</span>
                <span className="text-xs font-black uppercase text-emerald-400 flex items-center justify-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" /> {tierRequirement}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2 pt-2">
              {onNavigateToInvest && (
                <Button
                  onClick={() => {
                    setShowTierDeclineModal(false);
                    onNavigateToInvest();
                  }}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  Upgrade Portfolio Tier <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowTierDeclineModal(false)}
                className="w-full h-11 border-white/10 hover:bg-white/5 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
