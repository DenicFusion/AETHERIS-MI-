import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, getDocs, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Loader2, ArrowRight, Wallet, Users, CheckCircle2, AlertTriangle, ChevronRight, Copy, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function Workers() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<'upgrade' | 'topup' | 'invited'>('invited');
  const [fundingMode, setFundingMode] = useState<'self' | 'other'>('self');

  const [config, setConfig] = useState<any>({
    enable_upgrade: true,
    upgrade_fee_ngn: 50000,
    new_level1_percent: 60,
    new_level2_percent: 0,
    enable_topup: true,
    min_topup_usd: 10,
    usd_to_ngn_rate: 1500,
    kora_pub_key: 'pk_live_yRJ1XJRGy7hbDqp6P6YjrjY9fargo1LiHgQJrefZ'
  });
  
  const [userData, setUserData] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState<string>('');
  const [topupTag, setTopupTag] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [loadingInvited, setLoadingInvited] = useState(false);
  const [searchTag, setSearchTag] = useState('');

  const baseUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : `https://${window.location.hostname}`;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?redirect=/workers');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      });
      
      const unsubConfig = onSnapshot(doc(db, 'settings', 'workers_config'), (docSnap) => {
        if (docSnap.exists()) {
          setConfig({ ...config, ...docSnap.data() });
        }
      });
      
      return () => {
        unsubUser();
        unsubConfig();
      };
    }
  }, [user]);

  useEffect(() => {
    if (userData?.refCode && activeTab === 'invited') {
      const fetchInvited = async () => {
        setLoadingInvited(true);
        try {
          const q = query(
            collection(db, "users"), 
            where("referredBy", "==", userData.refCode)
          );
          const snap = await getDocs(q);
          const usersList = snap.docs.map(d => ({id: d.id, ...d.data()}));
          // Sort clients side to avoid needing composite index immediately
          usersList.sort((a: any, b: any) => {
             const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
             const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
             return timeB - timeA;
          });
          setInvitedUsers(usersList);
        } catch (e) {
          console.error("Invited users fetch error", e);
        } finally {
          setLoadingInvited(false);
        }
      };
      // Fetch only if empty
      if (invitedUsers.length === 0) {
         fetchInvited();
      } else {
         // Background refresh
         fetchInvited();
      }
    }
  }, [userData?.refCode, activeTab]);

  // Handle Return from Kora / Mock Redirect
  useEffect(() => {
    const status = searchParams.get('status');
    const ref = searchParams.get('ref');
    const tab = searchParams.get('tab');
    
    if (tab === 'topup' && (status === 'success' || status === 'success_mock') && ref) {
      setActiveTab('topup');
      verifyTopup(ref);
    } else if (tab === 'referral' && (status === 'success' || status === 'success_mock_upgrade') && ref) {
      setActiveTab('upgrade');
      verifyUpgrade(ref);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const verifyTopup = async (reference: string) => {
    setVerifying(true);
    try {
      const res = await fetch(`${baseUrl}/api/workers/topup-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.already ? "Top-up was already verified." : "Top-up successful! Balance updated.");
        // Clear params to avoid loop
        navigate('/workers', { replace: true });
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch (err) {
      toast.error('Verification error');
    } finally {
      setVerifying(false);
    }
  };

  const verifyUpgrade = async (reference: string) => {
    setVerifying(true);
    try {
      const res = await fetch(`${baseUrl}/api/workers/upgrade-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.already ? "Upgrade was already verified." : "Upgrade successful! Referral boosted.");
        navigate('/workers', { replace: true });
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch (err) {
      toast.error('Verification error');
    } finally {
      setVerifying(false);
    }
  };

  const ensureKorapayLoaded = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).Korapay !== 'undefined') {
        resolve();
        return;
      }
      const existingScript = document.querySelector('script[src*="korapay-collections"]');
      if (existingScript) {
        let checkCount = 0;
        const interval = setInterval(() => {
          if (typeof (window as any).Korapay !== 'undefined') {
            clearInterval(interval);
            resolve();
          } else {
            checkCount++;
            if (checkCount > 15) {
              clearInterval(interval);
              reject();
            }
          }
        }, 200);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  };

  const handleTopup = async () => {
    const targetTag = fundingMode === 'self' ? userData?.unique_tag : topupTag;

    if (!targetTag) {
      toast.error('Target User Tag is required');
      return;
    }
    if (!topupAmount || Number(topupAmount) < config.min_topup_usd) {
      toast.error(`Minimum top-up is $${config.min_topup_usd}`);
      return;
    }
    
    setIsProcessing(true);
    try {
      await ensureKorapayLoaded();
    } catch (e) {
      toast.error('Payment gateway is currently offline. Please try again.');
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/workers/topup-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedByUserId: user?.uid, targetTag: targetTag, amountUsd: Number(topupAmount) })
      });
      const data = await res.json();
      if (res.ok && data.reference) {
         if (typeof (window as any).Korapay === 'undefined') {
            toast.error('Payment gateway is currently offline. Please refresh.');
            setIsProcessing(false);
            return;
         }

         (window as any).Korapay.initialize({
            key: config.kora_pub_key || 'pk_live_yRJ1XJRGy7hbDqp6P6YjrjY9fargo1LiHgQJrefZ', 
            amount: Math.round(Number(data.amountNgn)),
            currency: 'NGN',
            reference: data.reference,
            customer: { 
              name: String(data.customerName), 
              email: String(data.customerEmail) 
            },
            onClose: () => {
              setIsProcessing(false);
              toast.error('Payment cancelled. Please complete payment to get access.');
            },
            onSuccess: (response: any) => {
              console.log("Payment Successful", response);
              verifyTopup(data.reference);
            }
         });
      } else {
         toast.error(data.error || 'Failed to initiate payment');
         setIsProcessing(false);
      }
    } catch (err) {
      toast.error("Network error");
      setIsProcessing(false);
    }
  };

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      await ensureKorapayLoaded();
    } catch (e) {
      toast.error('Payment gateway is currently offline. Please try again.');
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/api/workers/upgrade-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.uid })
      });
      const data = await res.json();
      if (res.ok && data.reference) {
         if (typeof (window as any).Korapay === 'undefined') {
            toast.error('Payment gateway is currently offline. Please refresh.');
            setIsProcessing(false);
            return;
         }

         (window as any).Korapay.initialize({
            key: config.kora_pub_key || 'pk_live_yRJ1XJRGy7hbDqp6P6YjrjY9fargo1LiHgQJrefZ', 
            amount: Math.round(Number(data.amountNgn)),
            currency: 'NGN',
            reference: data.reference,
            customer: { 
              name: String(data.customerName), 
              email: String(data.customerEmail) 
            },
            onClose: () => {
              setIsProcessing(false);
              toast.error('Payment cancelled. Please complete payment to get access.');
            },
            onSuccess: (response: any) => {
              console.log("Payment Successful", response);
              verifyUpgrade(data.reference);
            }
         });
      } else {
         toast.error(data.error || 'Failed to initiate payment');
         setIsProcessing(false);
      }
    } catch (err) {
      toast.error("Network error");
      setIsProcessing(false);
    }
  };

  if (loading || !user || !userData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isUpgraded = userData?.verified_referrer === true || userData?.isAdmin === true;
  
  const filteredInvited = invitedUsers.filter(u => 
     u.unique_tag?.toLowerCase().includes(searchTag.toLowerCase()) || 
     u.email?.toLowerCase().includes(searchTag.toLowerCase()) || 
     u.fullName?.toLowerCase().includes(searchTag.toLowerCase()) || 
     u.username?.toLowerCase().includes(searchTag.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 pb-24">
      
      {/* Header */}
      <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs font-mono text-primary uppercase tracking-widest">Internal Operations</p>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter">Workers Portal</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-xl">
          Authorized personnel operations. Manage your referred users, top-up wallets, and access your status configurations. 
        </p>

        {verifying && (
          <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-4">
             <Loader2 className="w-5 h-5 text-primary animate-spin" />
             <p className="text-sm text-primary font-medium">Verifying transaction with Gateway...</p>
          </div>
        )}

        <div className="flex gap-6 mt-10 border-b border-white/10 pb-1 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('invited')}
            className={`pb-3 px-1 text-sm font-bold tracking-tight transition-all relative whitespace-nowrap ${activeTab === 'invited' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Invited Users
            {activeTab === 'invited' && (
              <motion.div layoutId="workerTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('topup')}
            className={`pb-3 px-1 text-sm font-bold tracking-tight transition-all relative whitespace-nowrap ${activeTab === 'topup' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Direct Funding
            {activeTab === 'topup' && (
              <motion.div layoutId="workerTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('upgrade')}
            className={`pb-3 px-1 text-sm font-bold tracking-tight transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === 'upgrade' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Authority Hub
            {isUpgraded && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            {activeTab === 'upgrade' && (
              <motion.div layoutId="workerTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        </div>

        <div className="mt-8">
          <AnimatePresence mode="wait">
          
          {activeTab === 'invited' && (
            <motion.div key="invited" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
               <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                 <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" /> Your Network
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Manage and fund users who registered using your referral link.</p>
                 </div>
                 <div className="relative w-full sm:w-auto">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                   <Input 
                      placeholder="Search by name, email or tag..." 
                      className="pl-9 bg-black/40 border-white/10 w-full sm:w-[300px] text-sm h-10 rounded-xl"
                      value={searchTag}
                      onChange={e => setSearchTag(e.target.value)}
                   />
                 </div>
               </div>

               {loadingInvited ? (
                  <div className="flex justify-center py-12">
                     <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
               ) : invitedUsers.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
                     <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                     <h3 className="text-base font-bold text-white mb-2">No Invited Users Yet</h3>
                     <p className="text-sm text-gray-400 max-w-sm mx-auto">Share your referral link on the main dashboard to start building your network and earning commissions.</p>
                  </div>
               ) : filteredInvited.length === 0 ? (
                  <div className="text-center py-10">
                     <p className="text-sm text-gray-500">No users match your search.</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {filteredInvited.map(usr => (
                       <Card key={usr.id} className="bg-[#121826] hover:bg-[#151c2c] transition-colors border-white/5 rounded-2xl overflow-hidden group">
                         <CardContent className="p-5 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-4">
                               <div className="flex items-center gap-3 overflow-hidden">
                                 <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                                   <span className="font-bold text-primary text-sm uppercase">{(usr.fullName || usr.username || 'U')[0]}</span>
                                 </div>
                                 <div className="min-w-0">
                                   <p className="font-bold text-sm text-white truncate">{usr.fullName || usr.username || 'User'}</p>
                                   <p className="text-[10px] text-muted-foreground truncate">{usr.email}</p>
                                 </div>
                               </div>
                            </div>
                            
                            <div className="bg-black/30 p-3 rounded-xl mb-4 border border-white/5 flex items-center justify-between">
                               <div className="flex flex-col">
                                 <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Unique Tag</span>
                                 <span className="text-sm font-mono text-primary font-bold">{usr.unique_tag || 'Unassigned'}</span>
                               </div>
                               {usr.unique_tag && (
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-8 w-8 text-gray-400 hover:text-white"
                                   onClick={() => {
                                      navigator.clipboard.writeText(usr.unique_tag);
                                      toast.success("User Tag Copied!");
                                   }}
                                 >
                                    <Copy className="w-4 h-4" />
                                 </Button>
                               )}
                            </div>

                            <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
                               <Button 
                                 variant="outline" 
                                 className="w-full text-[11px] h-9 border-white/10 hover:bg-white/5"
                                 onClick={() => {
                                    if (usr.unique_tag) {
                                      setTopupTag(usr.unique_tag);
                                      setFundingMode('other');
                                      setActiveTab('topup');
                                    } else {
                                      toast.error("User does not have a unique tag generated yet.");
                                    }
                                 }}
                               >
                                 <Wallet className="w-3 h-3 mr-1.5" /> Fund User
                               </Button>
                               <div className="flex flex-col items-end justify-center text-[10px] text-gray-500">
                                  <span>Joined</span>
                                  <span className="font-mono text-white/70">{usr.createdAt?.toDate ? new Date(usr.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
                               </div>
                            </div>
                         </CardContent>
                       </Card>
                     ))}
                  </div>
               )}
            </motion.div>
          )}

          {activeTab === 'upgrade' && (
            <motion.div key="upgrade" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              
              <Card className="bg-[#111] border-white/10 overflow-hidden shadow-2xl rounded-2xl">
                <CardHeader className="border-b border-white/5 pb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl font-black flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary" />
                        Referral Bonus Boost
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-2">
                        Supercharge your account status to <strong className="text-white">Verified Referrer</strong> and lock in max Tier 1 commissions immediately. You will also unlock the ability to directly fund other user's accounts.
                      </CardDescription>
                    </div>
                    {isUpgraded && (
                      <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        VERIFIED
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Stats */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                      <p className="text-xs uppercase font-bold text-gray-500 tracking-widest">Current Status</p>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Level 1 Bonus</span>
                          <span className="font-bold text-white">{userData.level1_percentage || 10}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">Level 2 Bonus</span>
                          <span className="font-bold text-white">{userData.level2_percentage || 3}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-3 border-t border-white/10">
                          <span className="text-gray-400">Fund Others</span>
                          {isUpgraded ? <span className="font-bold text-emerald-500">Unlocked</span> : <span className="font-bold text-red-400">Locked</span>}
                        </div>
                      </div>
                    </div>

                    {/* Upgraded Stats */}
                    <div className="relative p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-4 overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
                      <p className="relative text-xs uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                         After Upgrade
                      </p>
                      
                      <div className="relative space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-primary/70">Level 1 Bonus</span>
                          <span className="font-black text-primary text-lg">{config.new_level1_percent}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-primary/70">Level 2 Bonus</span>
                          <span className="font-bold text-primary/50">{config.new_level2_percent}%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-3 border-t border-primary/20">
                          <span className="text-primary/70">Account Type</span>
                          <span className="font-black text-white">Verified Referrer</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!isUpgraded ? (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      {config.enable_upgrade ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                           <div>
                             <p className="text-sm text-gray-400 mb-1">One-time upgrade fee</p>
                             <div className="flex items-baseline gap-2">
                               <p className="text-3xl font-black">₦{Number(config.upgrade_fee_ngn).toLocaleString()}</p>
                               <span className="text-xs font-mono text-primary uppercase pt-1">NGN via Kora</span>
                             </div>
                           </div>
                           <Button 
                             size="lg" 
                             disabled={isProcessing}
                             onClick={handleUpgrade}
                             className="w-full sm:w-auto min-w-[200px] h-14 rounded-xl text-base font-bold shadow-[0_0_20px_rgba(30,80,255,0.3)] hover:shadow-[0_0_30px_rgba(30,80,255,0.5)] transition-all"
                           >
                             {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initiate Upgrade"}
                             {!isProcessing && <ExternalLink className="w-4 h-4 ml-2" />}
                           </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 text-yellow-500 rounded-xl">
                          <AlertTriangle className="w-5 h-5" />
                          <p className="text-sm font-medium">Referral upgrades are currently paused by the system administrator.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-8 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                       <p className="font-bold text-lg text-emerald-400 mb-2 flex justify-center items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Account Fully Upgraded!</p>
                       <p className="text-sm text-emerald-500/70">You have maximum Worker authority enabled. All restricted features including network funding are unlocked.</p>
                    </div>
                  )}

                </CardContent>
              </Card>

            </motion.div>
          )}

          {activeTab === 'topup' && (
            <motion.div key="topup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              
              <Card className="bg-[#111] border-white/10 overflow-hidden shadow-2xl rounded-2xl">
                 <CardHeader className="border-b border-white/5 pb-6">
                   <CardTitle className="text-2xl font-black flex items-center gap-3">
                     <Wallet className="w-6 h-6 text-primary" />
                     Direct Wallet Funding
                   </CardTitle>
                   <CardDescription className="text-gray-400 mt-2">
                     Bypass normal crypto deposits by directly funding your own or your network's trading balance via fiat payment gateways.
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="pt-8">

                    {config.enable_topup ? (
                     <div className="max-w-md mx-auto space-y-8">
                       
                       <div className="space-y-6">
                         
                         {/* Mode Selector */}
                         <div className="bg-black/50 p-1 rounded-xl border border-white/5 flex gap-1">
                            <button
                               onClick={() => setFundingMode('self')}
                               className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${fundingMode === 'self' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                               Self Deposit
                            </button>
                            <button
                               onClick={() => {
                                 if (!isUpgraded) {
                                   toast.error("You must be an upgraded Worker to fund other users.");
                                   return;
                                 }
                                 setFundingMode('other');
                               }}
                               className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${fundingMode === 'other' ? 'bg-primary/20 text-primary border-primary/20' : 'text-gray-500 hover:text-white'} ${!isUpgraded ? 'opacity-50' : ''}`}
                            >
                               Fund Network {isUpgraded ? '' : <Lock className="w-3 h-3 ml-1" />}
                            </button>
                         </div>

                         {!isUpgraded && fundingMode === 'other' && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                               <p className="text-sm text-red-500 font-medium">Access Restricted. Only Upgraded Workers can fund other users.</p>
                               <Button onClick={() => setActiveTab('upgrade')} variant="outline" className="mt-3 text-xs h-8 border-red-500/30 text-red-400 hover:bg-red-500/10">Upgrade Now</Button>
                            </div>
                         )}

                         <AnimatePresence mode="popLayout">
                         {fundingMode === 'other' ? (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                             <div className="flex justify-between text-sm mb-1 text-gray-400">
                               <span>Target User Tag</span>
                             </div>
                             <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium whitespace-nowrap overflow-hidden">Tag</span>
                               <Input 
                                 type="text"
                                 value={topupTag}
                                 onChange={(e) => setTopupTag(e.target.value)}
                                 placeholder="@jeff104"
                                 className="pl-14 h-16 text-lg font-black bg-black/50 border-white/10 rounded-2xl focus-visible:ring-primary focus-visible:border-primary"
                               />
                             </div>
                           </motion.div>
                         ) : (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
                              <div>
                                 <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Funding Target</p>
                                 <p className="text-sm font-bold text-white mt-1">My Account</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Your Tag</p>
                                 <p className="text-xs font-mono text-primary font-bold mt-1 bg-primary/10 px-2 py-0.5 rounded">{userData.unique_tag}</p>
                              </div>
                           </motion.div>
                         )}
                         </AnimatePresence>

                         <div className="space-y-2">
                           <div className="flex justify-between text-sm mb-1 text-gray-400">
                             <span>Enter USD Amount</span>
                             <span>Min: ${config.min_topup_usd}</span>
                           </div>
                         <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                           <Input 
                             type="number"
                             min={config.min_topup_usd}
                             value={topupAmount}
                             onChange={(e) => setTopupAmount(e.target.value)}
                             placeholder="1000"
                             className="pl-8 h-16 text-2xl font-black bg-black/50 border-white/10 rounded-2xl focus-visible:ring-primary focus-visible:border-primary transition-colors"
                           />
                         </div>
                       </div>
                       </div>

                       <div className="flex items-center justify-center p-4">
                         <ChevronRight className="w-6 h-6 text-white/20 rotate-90" />
                       </div>

                       <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
                          <p className="text-sm text-gray-400">Expected Naira Equivalent</p>
                          <p className="text-4xl font-black text-primary drop-shadow-md">
                            ₦{topupAmount ? (Number(topupAmount) * Number(config.usd_to_ngn_rate)).toLocaleString() : '0'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Exchange Rate: <span className="font-bold text-gray-300">$1 = ₦{Number(config.usd_to_ngn_rate).toLocaleString()}</span>
                          </p>
                       </div>

                       <Button 
                         size="lg" 
                         disabled={isProcessing || !topupAmount || Number(topupAmount) < config.min_topup_usd || (fundingMode === 'other' && (!topupTag || !isUpgraded))}
                         onClick={handleTopup}
                         className="w-full h-14 rounded-xl text-base font-bold shadow-[0_0_30px_rgba(30,80,255,0.3)] hover:shadow-[0_0_40px_rgba(30,80,255,0.5)] transition-all"
                       >
                         {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Proceed to Payment Gateway"}
                         {!isProcessing && <ExternalLink className="w-5 h-5 ml-2" />}
                       </Button>

                     </div>
                   ) : (
                     <div className="flex items-center justify-center gap-3 p-6 bg-yellow-500/10 text-yellow-500 rounded-xl text-center border border-yellow-500/20">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <p className="text-sm font-medium">Direct wallet funding gateway is currently disabled by the system administrator.</p>
                     </div>
                   )}

                 </CardContent>
              </Card>

            </motion.div>
          )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}

const Lock = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);

