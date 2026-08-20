import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, CreditCard, Landmark, Wallet, DollarSign, ChevronDown, QrCode, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doc, getDocs, collection, query, where, addDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface GenericProps {
  user: any;
  onBack: () => void;
  goToDashboard?: () => void;
}

export function ReferralSettings({ user, onBack, goToDashboard }: GenericProps) {
  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right duration-300 h-full p-4 max-w-lg mx-auto w-full">
      <div className="flex items-center mt-2 mb-2">
        <ChevronLeft className="w-6 h-6 text-foreground cursor-pointer mr-2" onClick={onBack} />
        <h2 className="text-base font-semibold text-foreground">Referral & Earnings</h2>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden p-6 space-y-4 shadow-xl">
        <div className="text-center pb-4 border-b border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total Earnings</div>
          <div className="text-3xl font-bold text-primary">${user?.total_referral_earnings?.toFixed(2) || "0.00"}</div>
        </div>

        {(() => {
          const isWorkerUser = user?.verified_referrer || user?.is_worker || user?.role === 'worker';
          const tier1Rate = user?.level1_percentage !== undefined ? user.level1_percentage : (isWorkerUser ? 60 : 10);
          const tier2Rate = user?.level2_percentage !== undefined ? user.level2_percentage : (isWorkerUser ? 0 : 3);
          return (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Tier 1 ({tier1Rate}%)</div>
                <div className="text-lg font-bold text-foreground">${user?.tier1_earnings?.toFixed(2) || "0.00"}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Tier 2 ({tier2Rate}%)</div>
                <div className="text-lg font-bold text-foreground">${user?.tier2_earnings?.toFixed(2) || "0.00"}</div>
              </div>
            </div>
          );
        })()}
      </div>

      <Button className="mt-auto bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 h-12 rounded-xl font-bold" onClick={() => {
        if (goToDashboard) goToDashboard();
        else toast("Referral Dashboard loading...");
      }}>
        Go to Referral Dashboard
      </Button>
    </div>
  );
}

export function PaymentMethodsSettings({ user, onBack }: GenericProps) {
  const [methods, setMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Tab: 'crypto' or 'bank'
  const [activeTab, setActiveTab] = useState<'crypto' | 'bank'>('crypto');

  // Crypto form state
  const [cryptoNetwork, setCryptoNetwork] = useState('USDT (TRC20)');
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Bank form state
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');

  // Real-time Firestore payment methods listener
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "user_payment_methods"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMethods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Payment methods error:", err));

    return () => unsub();
  }, [user?.uid]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "user_payment_methods", id));
      toast.success("Payment method removed");
    } catch (e) {
      toast.error("Failed to remove payment method");
    }
  };

  const handleAdd = async () => {
    if (activeTab === 'crypto') {
      if (!walletAddress.trim()) return toast.error("Please enter wallet address");
      setIsLoading(true);
      try {
        await addDoc(collection(db, "user_payment_methods"), {
          userId: user.uid,
          type: 'crypto',
          network: cryptoNetwork,
          details: walletAddress.trim(),
          accountName: `Crypto Wallet (${cryptoNetwork})`,
          createdAt: new Date().toISOString()
        });
        setAdding(false);
        setWalletAddress('');
        toast.success("Payment method saved");
      } catch (e) {
        toast.error("Failed to add payment method");
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!bankName.trim()) return toast.error("Please enter bank name");
      if (!accountHolder.trim()) return toast.error("Please enter account holder name");
      if (!iban.trim()) return toast.error("Please enter IBAN / Account Number");

      setIsLoading(true);
      try {
        await addDoc(collection(db, "user_payment_methods"), {
          userId: user.uid,
          type: 'bank',
          bankName: bankName.trim(),
          accountName: accountHolder.trim(),
          details: `IBAN/Acc: ${iban.trim()}${swift.trim() ? ` | SWIFT: ${swift.trim()}` : ''}`,
          iban: iban.trim(),
          swift: swift.trim(),
          createdAt: new Date().toISOString()
        });
        setAdding(false);
        setBankName('');
        setAccountHolder('');
        setIban('');
        setSwift('');
        toast.success("Payment method saved");
      } catch (e) {
        toast.error("Failed to add payment method");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Landmark className="w-4 h-4 text-emerald-400" />;
      case 'crypto': return <Wallet className="w-4 h-4 text-sky-400" />;
      default: return <CreditCard className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in slide-in-from-right duration-300 h-full p-4 max-w-lg mx-auto w-full relative font-sans">
      <div className="flex items-center justify-between mt-1 mb-1">
        <div className="flex items-center">
          <ChevronLeft className="w-6 h-6 text-foreground cursor-pointer mr-2 hover:opacity-80 transition-opacity" onClick={onBack} />
          <h2 className="text-base font-bold text-foreground">Payment Methods</h2>
        </div>
      </div>

      <div className="space-y-3.5 flex-1">
        {methods.length === 0 && !adding && (
          <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-8 text-center text-slate-400 text-sm">
            <CreditCard className="w-10 h-10 text-slate-500 mx-auto mb-3 opacity-60" />
            <p className="font-semibold text-slate-300 mb-1">No saved payment methods</p>
            <p className="text-xs text-slate-400">Add a bank account or crypto wallet for withdrawals.</p>
          </div>
        )}
        
        {methods.map((m) => (
          <div key={m.id} className="bg-[#0c142b] border border-[#182344] rounded-2xl p-4 flex justify-between items-center text-sm shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#172554] flex items-center justify-center shrink-0">
                  {getTypeIcon(m.type)}
                </div>
                <span className="text-white font-bold uppercase tracking-wider text-xs">
                  {m.type === 'crypto' ? 'Crypto Wallet' : 'Bank Account'}
                  {m.network && ` (${m.network})`}
                  {m.bankName && ` - ${m.bankName}`}
                </span>
              </div>
              {m.accountName && <div className="text-xs text-slate-300 pl-9 font-medium">{m.accountName}</div>}
              <div className="text-xs text-slate-400 font-mono break-all pl-9">{m.details}</div>
            </div>
            <button
              onClick={() => handleDelete(m.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition-colors shrink-0"
              title="Remove Method"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="bg-[#0b1329] p-5 rounded-3xl border border-[#182344] space-y-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Add Payment Method</h3>
            <button
              onClick={() => setAdding(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Top Tabs: Crypto Wallet vs Bank Account */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('crypto')}
              className={`p-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all font-bold text-xs border ${
                activeTab === 'crypto'
                  ? 'bg-[#0f2142] border-[#38bdf8] text-[#38bdf8] shadow-lg shadow-[#38bdf8]/10'
                  : 'bg-[#070c1b] border-[#182344] text-slate-400 hover:text-slate-200 hover:bg-[#0c142b]'
              }`}
            >
              <Wallet className="w-4 h-4 shrink-0" />
              <span>Crypto Wallet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bank')}
              className={`p-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all font-bold text-xs border ${
                activeTab === 'bank'
                  ? 'bg-[#0f2142] border-[#38bdf8] text-[#38bdf8] shadow-lg shadow-[#38bdf8]/10'
                  : 'bg-[#070c1b] border-[#182344] text-slate-400 hover:text-slate-200 hover:bg-[#0c142b]'
              }`}
            >
              <Landmark className="w-4 h-4 shrink-0" />
              <span>Bank Account</span>
            </button>
          </div>

          {/* Crypto Wallet Form */}
          {activeTab === 'crypto' && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">NETWORK</label>
                <button
                  type="button"
                  onClick={() => setIsNetworkOpen(!isNetworkOpen)}
                  className="w-full bg-[#070b13] border border-[#182344] focus:border-[#38bdf8] rounded-xl p-3.5 text-white text-xs font-semibold flex items-center justify-between text-left transition-colors"
                >
                  <span>{cryptoNetwork}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isNetworkOpen ? 'rotate-180' : ''}`} />
                </button>

                {isNetworkOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0a1126] border border-[#182344] rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    {['BTC', 'ETH (ERC20)', 'USDT (ERC20)', 'USDT (TRC20)', 'SOL'].map((net) => (
                      <button
                        key={net}
                        type="button"
                        onClick={() => {
                          setCryptoNetwork(net);
                          setIsNetworkOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                          cryptoNetwork === net
                            ? 'bg-[#182a4d] text-[#38bdf8]'
                            : 'text-slate-200 hover:bg-[#111d3a] hover:text-white'
                        }`}
                      >
                        <span>{net}</span>
                        {cryptoNetwork === net && <div className="w-2 h-2 rounded-full bg-[#38bdf8]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">WALLET ADDRESS</label>
                <div className="relative">
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={e => setWalletAddress(e.target.value)}
                    placeholder="Paste or scan address"
                    className="w-full bg-[#070b13] border border-[#182344] focus:border-[#38bdf8] rounded-xl pl-3.5 pr-10 py-3.5 text-white text-xs font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setWalletAddress(text);
                          toast.success("Pasted address from clipboard");
                        }
                      } catch {
                        toast.error("Clipboard access unavailable");
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-400 transition-colors p-1"
                    title="Paste from clipboard"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Warning Card */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex gap-3 items-start">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/90 leading-relaxed font-medium">
                  Double-check the network matches your wallet. Sending on the wrong network can result in permanent loss of funds.
                </p>
              </div>
            </div>
          )}

          {/* Bank Account Form */}
          {activeTab === 'bank' && (
            <div className="space-y-3.5 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">BANK NAME</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g., Chase Bank"
                  className="w-full bg-[#070b13] border border-[#182344] focus:border-[#38bdf8] rounded-xl p-3.5 text-white text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ACCOUNT HOLDER NAME</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value)}
                  placeholder="Full name on account"
                  className="w-full bg-[#070b13] border border-[#182344] focus:border-[#38bdf8] rounded-xl p-3.5 text-white text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">IBAN / ACCOUNT NUMBER</label>
                <input
                  type="text"
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  placeholder="GB29 NWBK 6016 1331 9268 19"
                  className="w-full bg-[#070b13] border border-[#182344] focus:border-[#38bdf8] rounded-xl p-3.5 text-white text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">SWIFT / BIC</label>
                <input
                  type="text"
                  value={swift}
                  onChange={e => setSwift(e.target.value)}
                  placeholder="e.g., NWBKGB2L"
                  className="w-full bg-[#070b13] border border-[#182344] focus:border-[#38bdf8] rounded-xl p-3.5 text-white text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons: Cancel and Save */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 bg-[#070c1b] border border-[#182344] hover:bg-[#0f172a] text-slate-300 rounded-xl h-12 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isLoading}
              className="flex-1 bg-[#38bdf8] hover:bg-[#0284c7] text-slate-950 rounded-xl h-12 text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-[#38bdf8]/20 transition-all disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <Button className="w-full bg-[#0c142b] hover:bg-[#111c3a] border border-[#182344] h-12 rounded-2xl text-white font-bold text-xs shadow-lg transition-all" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 mr-2 text-primary" /> Add Payment Method
        </Button>
      )}
    </div>
  );
}

