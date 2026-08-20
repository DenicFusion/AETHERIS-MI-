import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { QRCodeSVG } from "qrcode.react";
import { doc, onSnapshot } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

// Network SVG Icons
function TetherIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z" fill="#26A17B"/>
      <path d="M13.62 12.228v-.002c-.088.006-.827.042-1.631.042-.713 0-1.42-.032-1.58-.04v.003c-2.316-.098-4.048-.528-4.048-1.042 0-.513 1.732-.942 4.048-1.042v1.65c.164.01.883.045 1.588.045.79 0 1.527-.034 1.623-.045V10.15c2.31.1 4.037.53 4.037 1.04 0 .513-1.728.943-4.037 1.038zm0 2.215v1.942c-1.127.05-1.623.05-1.623.05s-.565 0-1.588-.05V14.44c-2.738-.135-4.787-.743-4.787-1.478 0-.616 1.442-1.144 3.518-1.378V8.928H5.253V6.75h13.483v2.178h-3.896v2.656c2.07.234 3.507.762 3.507 1.378 0 .735-2.049 1.343-4.787 1.478z" fill="#FFF"/>
    </svg>
  );
}

function BtcIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#F7931A"/>
      <path d="M16.2 10.05c.24-1.61-.99-2.48-2.67-3.06l.55-2.19-1.33-.33-.53 2.13c-.35-.09-.71-.17-1.07-.25l.54-2.14-1.33-.33-.55 2.18c-.29-.07-.58-.14-.86-.21l-1.84-.46-.35 1.42s.99.23.97.24c.54.13.64.49.62.78l-.62 2.51c.04.01.09.02.14.04l-.14-.03-.87 3.5c-.07.16-.24.41-.62.32c.02.01-.97-.24-.97-.24l-.66 1.53 1.73.43c.32.08.64.17.96.25l-.55 2.23 1.33.33.55-2.2c.36.1.72.19 1.07.28l-.55 2.2 1.33.33.56-2.24c2.27.43 3.98.26 4.7-1.8.58-1.66-.03-2.62-1.23-3.24.88-.2 1.54-.78 1.71-1.97zm-3.07 4.29c-.41 1.66-3.2.76-4.1.54l.73-2.93c.9.23 3.79.67 3.37 2.39zm.41-4.32c-.38 1.51-2.94.74-3.76.54l.66-2.66c.82.21 3.49.61 3.1 2.12z" fill="#FFF"/>
    </svg>
  );
}

function EthIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#627EEA"/>
      <path d="M12 3.5l-5.25 8.7L12 15.25l5.25-3.05L12 3.5z" fill="#FFF" fillOpacity="0.6"/>
      <path d="M12 3.5v11.75l5.25-3.05L12 3.5z" fill="#FFF"/>
      <path d="M12 16.25l-5.25-3.05L12 20.5l5.25-7.3L12 16.25z" fill="#FFF" fillOpacity="0.6"/>
      <path d="M12 16.25v4.25l5.25-7.3L12 16.25z" fill="#FFF"/>
      <path d="M12 14.35l-5.25-3.1L12 8.75l5.25 2.5-5.25 3.1z" fill="#FFF" fillOpacity="0.2"/>
      <path d="M12 8.75v5.6l5.25-3.1-5.25-2.5z" fill="#FFF" fillOpacity="0.6"/>
    </svg>
  );
}

function SolIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#141029"/>
      <path d="M5.5 16.8c.1-.1.2-.1.3-.1h12.4c.2 0 .3.2.2.4l-1.3 1.3c-.1.1-.2.1-.3.1H4.4c-.2 0-.3-.2-.2-.4l1.3-1.3zm0-8.6c.1-.1.2-.1.3-.1h12.4c.2 0 .3.2.2.4l-1.3 1.3c-.1.1-.2.1-.3.1H4.4c-.2 0-.3-.2-.2-.4l1.3-1.3zm13-4.3c-.1-.1-.2-.1-.3-.1H5.8c-.2 0-.3.2-.2.4l1.3 1.3c.1.1.2.1.3.1h12.4c.2 0 .3-.2.2-.4l-1.3-1.3z" fill="url(#solGrad)"/>
      <defs>
        <linearGradient id="solGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00FFA3"/>
          <stop offset="0.5" stopColor="#00E0FF"/>
          <stop offset="1" stopColor="#DC1FFF"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

interface TabDepositProps {
  goBack?: () => void;
  navigateTab?: (tab: any) => void;
  activeInvestment?: any;
  formatCurrency?: (val: number) => string;
}

export function TabDeposit({
  goBack,
  navigateTab,
  activeInvestment,
}: TabDepositProps) {
  const [searchParams] = useSearchParams();
  const initialAmount = searchParams.get("amount") || activeInvestment?.amount_per_interval || activeInvestment?.amount || "";
  const initialPlan = searchParams.get("plan") || activeInvestment?.plan || "";

  const { user } = useAuth();

  // Screen State: 'form' -> 'terminal' -> 'success'
  const [step, setStep] = useState<"form" | "terminal" | "success">("form");

  // Amount state
  const [amount, setAmount] = useState<string>(initialAmount ? String(initialAmount) : "25");
  const numericAmount = Math.max(0, Number(amount) || 0);

  // Method Selection: 'fiat' or 'crypto'
  const [method, setMethod] = useState<"fiat" | "crypto">("fiat");

  // Auto-switch / force crypto if amount > 1000
  const isAboveCardLimit = numericAmount > 1000;
  
  useEffect(() => {
    if (isAboveCardLimit) {
      setMethod("crypto");
    }
  }, [numericAmount, isAboveCardLimit]);

  // Crypto Network selection
  const [cryptoNetwork, setCryptoNetwork] = useState<"usdt_trc20" | "usdt_erc20" | "btc" | "eth" | "sol">("usdt_trc20");

  // Execution & Terminal states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [currentTxId, setCurrentTxId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
  const [cryptoTimerLeft, setCryptoTimerLeft] = useState(1200);

  // Sync transaction state if pending checkout session
  useEffect(() => {
    if (!currentTxId) return;
    const unsub = onSnapshot(
      doc(db, "transactions", currentTxId),
      (docSnap) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          if (d.status === "completed") {
            setStep("success");
            toast.success("Deposit Received and Wallet Credited!");
          } else if (["failed", "declined", "cancelled"].includes(d.status)) {
            setError(`Transaction ${d.status}. Please try again.`);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `transactions/${currentTxId}`);
      }
    );
    return () => unsub();
  }, [currentTxId]);

  // Crypto countdown timer
  useEffect(() => {
    if (step !== "terminal" || !paymentData) return;
    const interval = setInterval(() => {
      setCryptoTimerLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, paymentData]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus((prev) => ({ ...prev, [id]: true }));
    toast.success("Copied to clipboard");
    setTimeout(() => setCopyStatus((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    setAmount(raw);
    if (error) setError("");
  };

  const isAmountValid = numericAmount >= 25;

  const handleBack = () => {
    setError("");
    if (step === "terminal") {
      setStep("form");
    } else {
      if (goBack) goBack();
      else if (navigateTab) navigateTab("home");
    }
  };

  // Trigger Direct Payment Initiation
  const handleInitiatePayment = async () => {
    if (!user?.uid) {
      toast.error("You must be logged in to deposit.");
      return;
    }

    if (numericAmount < 25) {
      setError("Minimum deposit requirement is $25.00.");
      return;
    }

    setIsLoading(true);
    setError("");

    const activeMethod = isAboveCardLimit ? "crypto" : method;

    try {
      if (activeMethod === "fiat") {
        const payload = {
          amount: numericAmount.toFixed(2),
          currency: "USD",
          planName: initialPlan || activeInvestment?.plan || "Account Deposit",
          userId: user.uid,
          email: user.email || "",
          paymentProvider: "card",
        };

        const res = await fetch("/api/payments/bachs/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create payment session.");
        }

        const data = await res.json();
        const checkoutUrl = data.checkoutUrl || data.sessionUrl;
        const sessionId = data.checkoutSessionId || data.depositId;

        setCurrentTxId(sessionId);
        setIsLoading(false);

        if ((window as any).Bachs?.Checkout?.open && checkoutUrl) {
          try {
            (window as any).Bachs.Checkout.open({ checkoutUrl });
          } catch {
            window.location.href = checkoutUrl;
          }
        } else if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          setPaymentData({
            id: sessionId,
            type: "fiat",
            provider: "card",
            amount: numericAmount,
            checkoutUrl,
          });
          setStep("terminal");
        }
      } else {
        // Crypto Flow
        const payCurrencyMap: Record<string, string> = {
          usdt_trc20: "usdttrc20",
          usdt_erc20: "usdterc20",
          btc: "btc",
          eth: "eth",
          sol: "sol",
        };

        const payload = {
          amount: numericAmount,
          currency: "usd",
          pay_currency: payCurrencyMap[cryptoNetwork] || "usdttrc20",
          userId: user.uid,
          order_id: `AET_${user.uid.substring(0, 5)}_${Date.now()}`,
        };

        const res = await fetch("/api/payments/crypto/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || "Failed to generate crypto checkout.");
        }

        const networkNames: Record<string, string> = {
          usdt_trc20: "Tron (TRC20)",
          usdt_erc20: "Ethereum (ERC20)",
          btc: "Bitcoin Network",
          eth: "Ethereum Network",
          sol: "Solana Network",
        };

        setPaymentData({
          id: payload.order_id,
          type: "crypto",
          address: data.pay_address || "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
          amount: data.pay_amount || numericAmount,
          currency: (data.pay_currency || cryptoNetwork).toUpperCase(),
          qr: data.pay_address,
          networkName: networkNames[cryptoNetwork] || cryptoNetwork.toUpperCase(),
        });
        setCurrentTxId(payload.order_id);
        setCryptoTimerLeft(1200);
        setStep("terminal");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unable to initiate deposit.");
      toast.error(err.message || "Unable to initiate deposit.");
    } finally {
      setIsLoading(false);
    }
  };

  const cryptoNetworks = [
    {
      id: "usdt_trc20",
      name: "USDT (TRC20)",
      network: "Tron Network",
      icon: TetherIcon,
    },
    {
      id: "usdt_erc20",
      name: "USDT (ERC20)",
      network: "Ethereum Network",
      icon: TetherIcon,
    },
    {
      id: "btc",
      name: "Bitcoin (BTC)",
      network: "Bitcoin Network",
      icon: BtcIcon,
    },
    {
      id: "eth",
      name: "Ethereum (ETH)",
      network: "Ethereum Network",
      icon: EthIcon,
    },
    {
      id: "sol",
      name: "Solana (SOL)",
      network: "Solana Network",
      icon: SolIcon,
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-10 flex flex-col min-h-[calc(100vh-90px)] justify-between animate-in fade-in duration-300">
      <div>
        {/* Top Header & Breadcrumbs */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-slate-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>{step === "form" ? "Back to Dashboard" : "Back"}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
              {step === "form" ? "Step 1 of 2" : "Step 2 of 2"}
            </span>
          </div>
        </div>

        {/* Step Body Content */}
        <AnimatePresence mode="wait">
          {/* STEP FORM: AMOUNT FIRST, THEN METHOD / NETWORK */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-1">
                  Deposit Amount
                </h1>
                <p className="text-sm text-muted-foreground font-medium">
                  {initialPlan ? `Topping up for ${initialPlan}` : "Specify the amount in USD you wish to deposit."}
                </p>
              </div>

              {/* 1. Main Amount Selection Card */}
              <Card className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl relative overflow-hidden">
                <div className="relative max-w-xs mx-auto">
                  <div className="flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl font-black text-primary mr-1">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="25"
                      className="bg-transparent text-4xl sm:text-6xl font-black font-mono text-foreground text-center focus:outline-none w-full tracking-tight"
                    />
                  </div>
                </div>

                {/* Minimum Deposit Tag */}
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      isAmountValid
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    Minimum Deposit: $25.00
                  </span>
                </div>

                {/* Quick Add Presets */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {[25, 50, 100, 250, 500, 1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAmount(preset.toString());
                        if (error) setError("");
                      }}
                      className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        Number(amount) === preset
                          ? "bg-primary text-white border-primary shadow-[0_0_12px_rgba(30,80,255,0.4)]"
                          : "bg-slate-800/80 text-slate-300 border-white/5 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      ${preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>
              </Card>

              {/* 2. DYNAMIC PAYMENT METHOD & NETWORK DISPLAY */}
              {isAboveCardLimit ? (
                /* AUTOMATIC CRYPTO REDIRECT NOTICE WHEN > $1,000 */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-amber-400 uppercase tracking-wide mb-0.5">
                        Card / Fiat Limit Exceeded ($1,000 Max)
                      </div>
                      <p className="text-slate-300 leading-relaxed font-medium">
                        Card & fiat payment gateways support up to $1,000.00 max. Deposits above $1,000 are processed exclusively via Web3 Crypto.
                      </p>
                    </div>
                  </div>

                  {/* SELECT NETWORK DIRECTLY BELOW */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-extrabold text-foreground tracking-wider uppercase text-slate-400">
                      Select Crypto Network
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {cryptoNetworks.map((net) => {
                        const IconComponent = net.icon;
                        const isSelected = cryptoNetwork === net.id;
                        return (
                          <Card
                            key={net.id}
                            onClick={() => setCryptoNetwork(net.id as any)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-slate-900 border-primary shadow-[0_0_20px_rgba(30,80,255,0.2)]"
                                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-800 border border-white/10 shrink-0">
                                  <IconComponent className="w-6 h-6" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">{net.name}</h4>
                                  <p className="text-xs text-muted-foreground font-medium">
                                    {net.network}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "bg-primary border-primary text-white"
                                    : "border-slate-700"
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* WHEN AMOUNT <= $1,000: CHOOSE BETWEEN FIAT/CARD OR CRYPTO */
                <div className="space-y-4 pt-1">
                  <h3 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase">
                    Select Payment Method
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* FIAT / CARD */}
                    <Card
                      onClick={() => setMethod("fiat")}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        method === "fiat"
                          ? "bg-slate-900 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                          Instant
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-foreground">Fiat / Card Payment</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Instant deposit via credit/debit card.
                      </p>
                    </Card>

                    {/* CRYPTOCURRENCY */}
                    <Card
                      onClick={() => setMethod("crypto")}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        method === "crypto"
                          ? "bg-slate-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <BtcIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Web3 Direct
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-foreground">Cryptocurrency</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        USDT, BTC, ETH, SOL and supported chains.
                      </p>
                    </Card>
                  </div>

                  {/* IF CRYPTO SELECTED (AND <= 1000), SHOW NETWORKS BELOW */}
                  {method === "crypto" && (
                    <div className="space-y-3 pt-3">
                      <h3 className="text-xs font-extrabold text-slate-400 tracking-wider uppercase">
                        Select Crypto Network
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        {cryptoNetworks.map((net) => {
                          const IconComponent = net.icon;
                          const isSelected = cryptoNetwork === net.id;
                          return (
                            <Card
                              key={net.id}
                              onClick={() => setCryptoNetwork(net.id as any)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-slate-900 border-primary shadow-[0_0_20px_rgba(30,80,255,0.2)]"
                                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-xl bg-slate-800 border border-white/10 shrink-0">
                                    <IconComponent className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-foreground">{net.name}</h4>
                                    <p className="text-xs text-muted-foreground font-medium">
                                      {net.network}
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? "bg-primary border-primary text-white"
                                      : "border-slate-700"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Warning / Error */}
              {!isAmountValid && numericAmount > 0 && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Deposit amount must be at least $25.00 to continue.</span>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP TERMINAL / ACTIVE PAYMENT DISPLAY */}
          {step === "terminal" && paymentData && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    Payment Terminal
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Complete your deposit using the generated details below.
                </p>
              </div>

              {paymentData.type === "crypto" && (
                <Card className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-5 shadow-xl">
                  {/* Timer */}
                  <div className="inline-flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-amber-400 text-xs font-mono font-bold">
                    <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                    <span>Time Remaining: {formatTimer(cryptoTimerLeft)}</span>
                  </div>

                  {/* QR Code display */}
                  <div className="flex justify-center my-2">
                    <div className="p-4 bg-white rounded-2xl shadow-xl">
                      <QRCodeSVG value={paymentData.address} size={160} />
                    </div>
                  </div>

                  {/* Send Exact Amount with COPY BUTTON */}
                  <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-white/5">
                    <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                      Send Exactly
                    </div>
                    <div className="flex items-center justify-center gap-2.5">
                      <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                        {paymentData.amount} {paymentData.currency}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCopy(`${paymentData.amount}`, "amount")}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 h-8 px-2.5 text-xs font-bold rounded-lg border border-white/10 cursor-pointer flex items-center gap-1.5"
                      >
                        {copyStatus["amount"] ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Address Copy Bar */}
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-white/5 space-y-1.5 text-left">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex justify-between">
                      <span>Deposit Address ({paymentData.networkName})</span>
                      <span className="text-cyan-400 font-bold">Single-Use Address</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-slate-200 break-all select-all font-bold">
                        {paymentData.address}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCopy(paymentData.address, "addr")}
                        className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-200 h-8 px-2.5 text-xs font-bold rounded-lg border border-white/10 cursor-pointer"
                      >
                        {copyStatus["addr"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs text-left flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                    <span>
                      Only send <strong>{paymentData.currency}</strong> to this address. Funds will be credited automatically upon 1 blockchain confirmation.
                    </span>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {/* STEP SUCCESS */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
                  Deposit Confirmed!
                </h1>
                <p className="text-sm text-muted-foreground font-medium max-w-md mx-auto">
                  Your wallet has been credited with ${numericAmount.toFixed(2)}. You can now activate your trading cycles or hold funds in your main balance.
                </p>
              </div>

              <Button
                onClick={() => {
                  if (navigateTab) navigateTab("home");
                  else if (goBack) goBack();
                }}
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-primary/30 cursor-pointer"
              >
                Return to Dashboard
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Navigation CTA Button */}
      {step === "form" && (
        <div className="pt-6 border-t border-white/5 mt-8 sticky bottom-0 bg-[#03060C]/90 backdrop-blur-xl pb-4 sm:pb-0">
          <Button
            disabled={!isAmountValid || isLoading}
            onClick={handleInitiatePayment}
            className="w-full h-13 sm:h-14 bg-gradient-to-r from-cyan-500 via-primary to-emerald-500 hover:opacity-95 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Deposit...</span>
              </>
            ) : (
              <>
                <span>
                  {(isAboveCardLimit || method === "crypto")
                    ? `Proceed to Deposit $${numericAmount || 0} via Crypto`
                    : `Proceed to Pay $${numericAmount || 0} via Card`}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
