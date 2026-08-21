import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import { LiveActivityFeed } from "../components/LiveActivityFeed";
import { TabWithdrawal } from "../components/dashboard/TabWithdrawal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  query,
  where,
  collection,
  limit,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import {
  Bell,
  ChevronLeft,
  Info,
  Eye,
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  Star,
  UserPlus,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trophy,
  Smartphone,
  Plane,
  Watch,
  Palmtree,
  Car,
  Check,
  Briefcase,
  DollarSign,
  User,
  Shield,
  Globe,
  Users as UsersIcon,
  CreditCard,
  HelpCircle,
  Headphones,
  LogOut,
  Truck,
  CheckCircle2,
  Home,
  FileText,
  Plus,
  Gift,
  Activity,
  ArrowRight,
  Zap,
  Target,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  X,
  Lock,
  LockOpen,
  TrendingUp,
  XCircle,
  LayoutDashboard,
  Rocket,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { DepositModal } from "@/components/DepositModal";
import { TabDeposit } from "@/components/dashboard/TabDeposit";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { TransactionCard } from "@/components/dashboard/TransactionCard";
import { TransactionDetailModal } from "@/components/dashboard/TransactionDetailModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { usePwa } from "@/contexts/PwaContext";
import { Download } from "lucide-react";
import { getUserLevelBadge } from "@/lib/badge";
import { LevelBadge } from "@/components/ui/LevelBadge";

function HexagonIcon(props: any) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}


import { Logo } from "@/components/Logo";

import { TabReferrals } from "@/components/dashboard/TabReferrals";
import { TabSupport } from "@/components/dashboard/TabSupport";
import { generateRefCode } from "@/lib/referral";
import { SwipableWalletCards } from "@/components/dashboard/SwipableWalletCards";
import { PaymentVerificationOverlay } from "@/components/dashboard/PaymentVerificationOverlay";
import { ProfitBreakdownChart } from "@/components/dashboard/ProfitBreakdownChart";
import { useFCMToken } from "@/hooks/useFCMToken";
import { CancelTradeConfirmModal } from "@/components/dashboard/CancelTradeConfirmModal";
import { QuickTradePanel } from "@/components/dashboard/QuickTradePanel";
import { TabQuickTrade } from "@/components/dashboard/TabQuickTrade";
import { QuickTradeActiveCard } from "@/components/dashboard/QuickTradeActiveCard";

import { TradingEngineService } from "@/lib/TradingEngineService";
import { formatPlanName, parseTimestampMs } from "@/lib/InvestmentEngine";

export function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const { isInstalled, promptInstall } = usePwa();
  
  // Register FCM on login
  useFCMToken(user?.uid);
  const navigate = useNavigate();
  const { preferredCurrency, setPreferredCurrency, formatCurrency } =
    useCurrency();
  const previousTabRef = useRef<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "home" | "plan" | "payments" | "rewards" | "profile" | "referrals" | "deposit" | "support" | "withdraw" | "quick_trade" | "withdrawal_receipt") || "home";

  const navigateTab = (
    tab: "home" | "plan" | "payments" | "rewards" | "profile" | "referrals" | "deposit" | "support" | "withdraw" | "quick_trade" | "withdrawal_receipt",
  ) => {
    if (tab === activeTab) return;
    previousTabRef.current = activeTab;
    setSearchParams({ tab });
  };

  const navigateBack = () => {
    if (previousTabRef.current && previousTabRef.current !== activeTab) {
      const prev = previousTabRef.current;
      previousTabRef.current = null;
      navigateTab(prev as any);
    } else if (window.history.length > 1 && searchParams.get("tab")) {
      navigate(-1);
    } else {
      if (activeTab === "home") {
        navigate("/");
      } else {
        navigateTab("home");
      }
    }
  };

  // Override device back behavior: 
  // Custom logic to prevent accidental exit if not on home tab
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If we are deep in dashboard and hit back, react-router handles it
      // But we can add extra "Sync" logic here if needed.
    };
    
    // This is mostly handled by React Router's implementation of useSearchParams
  }, [activeTab]);
  const [hideBalance, setHideBalance] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [sessionPendingInvs, setSessionPendingInvs] = useState<string[]>([]);
  const [activeInvestment, setActiveInvestment] = useState<any>(null);
  const [intervalsByInv, setIntervalsByInv] = useState<Record<string, any[]>>({});
  const [rewards, setRewards] = useState<any[]>([]);
  const [claimedRewards, setClaimedRewards] = useState<any[]>([]);
  const [milestoneConfigs, setMilestoneConfigs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  // Modal and Quick Trade States
  const [showSuccess, setShowSuccess] = useState(false);
  const [showActivationConfirm, setShowActivationConfirm] = useState(false);
  const [isNewPlanDepositModalOpen, setIsNewPlanDepositModalOpen] = useState(false);
  const [pendingPlanForDeposit, setPendingPlanForDeposit] = useState<any>(null);
  const [selectedPlanConfig, setSelectedPlanConfig] = useState<any>(null);
  const [intervalInput, setIntervalInput] = useState("");
  const [numIntervalsInput, setNumIntervalsInput] = useState("30");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTimelineDays, setSelectedTimelineDays] = useState<number>(30);

  // Quick Trade State & Handlers
  const [globalConfig, setGlobalConfig] = useState<any>({
    quickTradeReturnPct: 8.4,
    quickTradeCycleDays: 3,
  });
  const [quickTradeModalAmount, setQuickTradeModalAmount] = useState<number | null>(null);
  const [isSubmittingQuickTrade, setIsSubmittingQuickTrade] = useState<boolean>(false);
  const [planTabMode, setPlanTabMode] = useState<'standard' | 'pro'>('standard');
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [expandedPlanName, setExpandedPlanName] = useState<string | null>(null);
  const openPlan = () => navigateTab("plan");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "global"), (snap) => {
      if (snap.exists()) {
        setGlobalConfig(snap.data());
      }
    }, (err) => console.warn("Global config snapshot error in Dashboard:", err));
    return () => unsub();
  }, []);

  const handleStartQuickTrade = (amount: number) => {
    setSearchParams({ tab: "quick_trade", amount: String(amount) });
  };

  const handleConfirmQuickTrade = async () => {
    if (!quickTradeModalAmount || !auth.currentUser) return;
    setIsSubmittingQuickTrade(true);
    try {
      const walletBal = userData?.wallet_balance ?? userData?.balance ?? 0;
      const signupBonus = userData?.signup_reward_amount || 0;
      const userBal = Math.max(0, walletBal - signupBonus);
      const initialStatus = userBal >= quickTradeModalAmount ? "active" : "pending_activation";
      const cycleDays = globalConfig?.quickTradeCycleDays !== undefined ? Number(globalConfig.quickTradeCycleDays) : 3;
      const returnPct = globalConfig?.quickTradeReturnPct !== undefined ? Number(globalConfig.quickTradeReturnPct) : 8.4;

      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const response = await fetch(`${baseUrl}/api/start-investment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          planId: "quick_trade",
          totalAmount: quickTradeModalAmount,
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

      if (userBal < quickTradeModalAmount) {
        setPendingPlanForDeposit({
          id: data.investmentId,
          name: "QUICK TRADE",
          amount_per_interval: quickTradeModalAmount,
          min: quickTradeModalAmount,
        });
        setSearchParams({ tab: "deposit", amount: String(quickTradeModalAmount), plan: "QUICK TRADE" });
        toast.info("Insufficient trading balance. Please fund your Trading Balance to continue.");
      } else {
        toast.success(`⚡ Quick Trade activated! Your ${cycleDays}-day AI trading cycle has begun.`);
      }
      setQuickTradeModalAmount(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to activate Quick Trade");
    } finally {
      setIsSubmittingQuickTrade(false);
    }
  };
  
  const { basePlansList, standardPlans, proPlans, availablePlans } = TradingEngineService.getPlanLists(plans);
  const [liveFactor, setLiveFactor] = useState(0); 
  const [liveEarningsByInv, setLiveEarningsByInv] = useState<Record<string, number>>({});
  const [liveAmount, setLiveAmount] = useState(0);
  const [countdownStr, setCountdownStr] = useState("00h 00m 00s");
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [profitProgress, setProfitProgress] = useState(0);
  const [portfolioTotals, setPortfolioTotals] = useState<any>({
    total_amount: 0,
    deposited: 0,
    total_profit_earned: 0,
    daily_profit: 0,
    progress: 0
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    // Plans data
    const plansRef = collection(db, "plans");
    const unPlans = onSnapshot(
      plansRef,
      (snapshot) => {
        setPlans(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "plans"),
    );

    // User data
    const userRef = doc(db, "users", user.uid);
    const unUser = onSnapshot(
      userRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);

          // Initialize refCode if missing
          if (!data.refCode) {
            try {
              const newRefCode = generateRefCode();
              await setDoc(userRef, { refCode: newRefCode }, { merge: true });
            } catch (e) {
              console.error("Failed to initialize refCode", e);
            }
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`),
    );

    // Transactions data
    const txRef = collection(db, "transactions");
    const qTx = query(
      txRef,
      where("user_id", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(50),
    );
    const unTx = onSnapshot(
      qTx,
      (snapshot) => {
        const txs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const cleaned = txs.filter((t: any) => t.type !== 'PLAN_ACTIVATED');
        const sorted = cleaned.sort((a: any, b: any) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
          if (timeB !== timeA) {
            return timeB - timeA;
          }
          const getPriority = (tx: any) => {
            const type = (tx.type || '').toLowerCase();
            if (['deduction', 'interval_deduction', 'trading_distribution'].includes(type)) return 1;
            if (['profit_release', 'profit_payout', 'maturity_profit', 'cycle_distribution'].includes(type)) return 2;
            return 3;
          };
          return getPriority(a) - getPriority(b);
        });
        setTransactions(sorted);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "transactions"),
    );

    // Investment data
    const invRef = collection(db, "investments");
    const qInv = query(
      invRef,
      where("user_id", "==", user.uid),
      where("status", "in", ["active", "pending_activation", "paused", "overdue"]),
      orderBy("created_at", "desc")
    );
    let unIntSnapshots: { [key: string]: () => void } = {};

    const unInv = onSnapshot(
      qInv,
      (snapshot) => {
        const invs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setInvestments(invs);

        // Track state transitions for notifications
        invs.forEach(inv => {
          if (inv.status === 'pending_activation' && !sessionPendingInvs.includes(inv.id)) {
            setSessionPendingInvs(prev => [...prev, inv.id]);
          }
          
          if (inv.status === 'active' && sessionPendingInvs.includes(inv.id)) {
            // It was pending in this session, now it's active!
            toast.success(`Plan ${inv.plan} ${formatCurrency(inv.total_amount)} has been ACTIVATED! 🚀`, {
              description: "Your investment is now generating profit.",
              duration: 10000,
            });
            // Remove from tracking list so we don't repeat
            setSessionPendingInvs(prev => prev.filter(id => id !== inv.id));
          }
        });
        
        // Aggregate all active investments for global portfolio view
        const activeInvs = invs.filter(inv => inv.status === 'active');
        
        // Find a primary for UI elements that still expect a single reference
        const primary = activeInvs[0] || invs.find(inv => inv.status === 'pending_activation');
        setActiveInvestment(primary || null);

        // Calculate aggregated metrics for the global view
        const totals = activeInvs.reduce((acc, inv) => {
          return {
            total_amount: acc.total_amount + (inv.total_amount || 0),
            deposited: acc.deposited + (inv.deposited || 0),
            total_profit_earned: acc.total_profit_earned + (inv.total_profit_earned || 0),
            daily_profit: acc.daily_profit + (inv.daily_profit || 0),
            progress_sum: acc.progress_sum + (inv.progress || 0)
          };
        }, { total_amount: 0, deposited: 0, total_profit_earned: 0, daily_profit: 0, progress_sum: 0 });

        const avgProgress = activeInvs.length > 0 ? totals.progress_sum / activeInvs.length : 0;

        setPortfolioTotals({
          ...totals,
          progress: avgProgress
        });

        // Manage intervals listeners for all active/paused/overdue/completed investments
        invs.forEach(inv => {
          if (['active', 'paused', 'overdue', 'completed'].includes(inv.status) && !unIntSnapshots[inv.id]) {
            const intervalsRef = collection(db, "investments", inv.id, "intervals");
            const qInt = query(intervalsRef, orderBy("sequence", "asc"));
            unIntSnapshots[inv.id] = onSnapshot(
              qInt,
              (iSnap) => {
                const fetchedIntervals = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setIntervalsByInv(prev => ({ ...prev, [inv.id]: fetchedIntervals }));
              },
              (err) => handleFirestoreError(err, OperationType.LIST, `investments/${inv.id}/intervals`)
            );
          }
        });

        // Cleanup stale listeners
        Object.keys(unIntSnapshots).forEach(id => {
          if (!invs.find(inv => inv.id === id)) {
            unIntSnapshots[id]();
            delete unIntSnapshots[id];
            setIntervalsByInv(prev => {
              const newMap = { ...prev };
              delete newMap[id];
              return newMap;
            });
          }
        });

        if (snapshot.empty) {
          setIntervalsByInv({});
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "investments"),
    );

    // Rewards data
    const rewRef = collection(db, "rewards");
    const qRew = query(
      rewRef,
      where("user_id", "==", user.uid),
      orderBy("milestone", "desc"),
    );
    const unRew = onSnapshot(
      qRew,
      (rSnap) => {
        setRewards(rSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "rewards"),
    );

    // Claimed rewards from user_rewards
    let unClaimed = () => {};
    try {
      const qClaimed = query(
        collection(db, "user_rewards"),
        where("userId", "==", user.uid)
      );
      unClaimed = onSnapshot(
        qClaimed,
        (cSnap) => {
          setClaimedRewards(cSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, "user_rewards")
      );
    } catch (e) {
      console.error("user_rewards setup failed", e);
    }

    const unMilestones = onSnapshot(
      collection(db, "milestones"),
      (mSnap) => {
        const list = mSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => (a.order || 0) - (b.order || 0) || (a.threshold || 0) - (b.threshold || 0));
        setMilestoneConfigs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, "milestones")
    );

    return () => {
      unUser();
      unTx();
      unInv();
      Object.values(unIntSnapshots).forEach(un => un());
      unRew();
      unClaimed();
      unPlans();
      unMilestones();
    };
  }, [user]);

  useEffect(() => {
    const activeInvs = (investments || []).filter((inv: any) => inv.status === 'active');
    if (activeInvs.length === 0) {
      setLiveFactor(0);
      setLiveAmount(0);
      setCountdownStr("00h 00m 00s");
      setProfitProgress(0);
      return;
    }

    const totalExpectedProfit = portfolioTotals?.daily_profit || 0;
    const totalProfits = (portfolioTotals?.total_profit_earned || 0) + (userData?.legacy_profits || 0);

    const timer = setInterval(() => {
      const now = new Date().getTime();

      let totalLiveEarnings = 0;
      const earningsMap: Record<string, number> = {};
      const countdownsMap: Record<string, string> = {};

      let primaryInv: any = null;
      let primaryDiff = Infinity;
      let primaryPassed = 0;
      let primaryCycleLength = 1;
      let hasProcessingPlans = false;
      let hasActiveCountingPlans = false;

      // Calculate independent live amount per plan visually only
      activeInvs.forEach((inv: any) => {
         const isWarning = ['pending_activation', 'paused', 'overdue'].includes(inv.status);
         const isQuickTrade = (inv.plan_name || inv.plan)?.toUpperCase().includes("QUICK TRADE") || inv.plan_id === "quick_trade";
         const intervalDays = inv.interval_days || inv.duration_days || (isQuickTrade ? 3 : 1);
         const cycleLength = intervalDays * 24 * 60 * 60 * 1000;
         const profitPerInterval = (inv.expected_total_profit || 0) / (inv.total_intervals || 1);

         let planLiveEarned = 0;
         let diff = 0;
         let passed = 0;
         
         let nextT = parseTimestampMs(inv.next_execution_time || inv.next_profit_time || inv.cycle_end_time, null);

         if (!nextT && !isWarning && inv.status === 'active') {
            const startT = parseTimestampMs(inv.cycle_start_time || inv.activation_time || inv.created_at || inv.started_at, now);
            nextT = startT + cycleLength;
         }

         // Use the deterministic execution time set by the engine
         if (nextT && !isWarning) {
            diff = nextT - now;
            const startT = nextT - cycleLength;
            
            passed = Math.max(0, now - startT);
            if (passed > cycleLength) passed = cycleLength;
            
            planLiveEarned = (passed / cycleLength) * profitPerInterval;

             if (diff > 0) {
                 hasActiveCountingPlans = true;
                 const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                 const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                 const m = Math.floor((diff / (1000 * 60)) % 60);
                 const s = Math.floor((diff / 1000) % 60);
                 countdownsMap[inv.id] = `${d > 0 ? d.toString().padStart(2, "0") + "d " : ""}${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
                 
                 if (diff < primaryDiff) {
                     primaryDiff = diff;
                     primaryInv = inv;
                     primaryPassed = passed;
                     primaryCycleLength = cycleLength;
                 }
             } else {
                 hasProcessingPlans = true;
                 countdownsMap[inv.id] = "Processing Engine...";
             }
         } else {
            countdownsMap[inv.id] = isWarning ? "Action Required" : "No active trade";
         }
         
         earningsMap[inv.id] = planLiveEarned;
         const isPro = (inv.plan_name || inv.plan)?.toUpperCase().includes("PRO") || !!inv.isPro;
         const planPrincipal = (isQuickTrade || isPro)
           ? Number(inv.total_amount || inv.amount || 0)
           : Number(inv.amount_per_interval || inv.interval_amount || ((inv.total_amount || 0) / (inv.total_intervals || 1)));

         totalLiveEarnings += planPrincipal + (inv.total_profit_earned || 0) + planLiveEarned;
      });
      
      setLiveEarningsByInv(earningsMap);
      setCountdowns(countdownsMap);

      if (hasProcessingPlans) {
        setCountdownStr("Processing...");
        setProfitProgress(100);
        setLiveFactor(1);
        setLiveAmount(Math.max(0, totalLiveEarnings));
        
        // Auto-heal by pinging the backend processing engine
        // Send a burst once to make sure it kicks off right now
        if (typeof window !== 'undefined' && !(window as any)._hasPingedBackendTemp) {
            (window as any)._hasPingedBackendTemp = true;
            const tempBaseUrl = (import.meta as any).env.VITE_API_URL || "";
            fetch(`${tempBaseUrl}/api/admin/fix`).catch(console.error);
        }
      } else if (hasActiveCountingPlans && primaryInv) {
        const pd = Math.floor(primaryDiff / (1000 * 60 * 60 * 24));
        const ph = Math.floor((primaryDiff / (1000 * 60 * 60)) % 24);
        const pm = Math.floor((primaryDiff / (1000 * 60)) % 60);
        const ps = Math.floor((primaryDiff / 1000) % 60);
        setCountdownStr(`${pd > 0 ? pd.toString().padStart(2, "0") + "d " : ""}${ph.toString().padStart(2, "0")}h ${pm.toString().padStart(2, "0")}m ${ps.toString().padStart(2, "0")}s`);
        
        const progressPct = Math.min(100, (primaryPassed / primaryCycleLength) * 100);
        setProfitProgress(progressPct);
        setLiveFactor(primaryPassed / primaryCycleLength);
        setLiveAmount(Math.max(0, totalLiveEarnings));
      } else {
        setCountdownStr("00h 00m 00s");
        setProfitProgress(0);
        setLiveFactor(0);
        setLiveAmount(0);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [investments, portfolioTotals, userData, intervalsByInv]);

  const handleCurrencyChange = async (currency: string) => {
    try {
      await setPreferredCurrency(currency);
      toast.success(`Currency updated to ${currency}`);
    } catch (error) {
      toast.error("Failed to update currency preference");
    }
  };

  const username =
    userData?.username || "user";

  const NavItem = ({ tab, icon: Icon, label }: any) => {
    const isActive = activeTab === tab;
      
    // Count active plans
    const activePlansCount = useMemo(() => {
      return (investments || []).filter((inv: any) => inv.status === 'active').length;
    }, [investments]);

    // Check if rewards are available
    const hasClaimableRewards = useMemo(() => {
      if (!userData) return false;
      const totalDeposits = userData?.total_deposits || 0;
      
      // STARTER PLAN: Not eligible for rewards (deposits < 1000).
      if (totalDeposits < 1000) return false;

      const rewardTiers = [
        { threshold: 1000, label: "Starter" },
        { threshold: 5000, label: "Core" },
        { threshold: 10000, label: "Prime" },
        { threshold: 50000, label: "Quantum" },
        { threshold: 100000, label: "Apex" },
      ];

      return rewardTiers.some((t) => {
        const reached = totalDeposits >= t.threshold;
        if (!reached) return false;
        
        const claimed = (claimedRewards || []).some((claim) => claim.tierLabel === t.label);
        return !claimed;
      });
    }, [userData, claimedRewards]);

    return (
      <div
        className={`relative flex flex-col md:flex-row md:justify-start items-center justify-center cursor-pointer md:w-full px-2 py-1.5 md:px-5 md:py-3.5 md:rounded-r-xl md:border-l-2 transition-all gap-1.5 md:gap-3.5 select-none ${
          isActive 
            ? "text-primary font-bold md:bg-primary/[0.06] md:border-primary md:text-white" 
            : "text-muted-foreground md:border-transparent md:hover:bg-white/[0.02] md:hover:text-slate-100"
        }`}
        onClick={() => navigateTab(tab)}
      >
        <div className="relative flex items-center justify-center shrink-0">
          <Icon
            className={`w-5.5 h-5.5 transition-all duration-300 ${isActive ? "text-primary scale-105" : "text-slate-400"}`}
          />
          
          {/* Mobile Plans Badge */}
          {tab === "plan" && activePlansCount > 0 && (
            <span className="absolute -top-1 -right-2 md:hidden flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-black leading-none text-white scale-90 select-none">
              {activePlansCount}
            </span>
          )}

          {/* Mobile Rewards Badge (amber point) */}
          {tab === "rewards" && hasClaimableRewards && (
            <span className="absolute -top-1 -right-1 md:hidden flex h-2 w-2 rounded-full bg-amber-500 animate-pulse select-none" />
          )}
        </div>

        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider md:font-semibold">
          {label}
        </span>

        {/* Desktop Extras */}
        {tab === "plan" && activePlansCount > 0 && (
          <span className="hidden md:inline-flex ml-auto items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full select-none">
            {activePlansCount} Active
          </span>
        )}

        {tab === "rewards" && hasClaimableRewards && (
          <span className="hidden md:inline-flex ml-auto items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse select-none">
            Claim Ready
          </span>
        )}
      </div>
    );
  };

  const walletBalance = userData?.wallet_balance ?? userData?.balance ?? 0;
  const profitBalance = userData?.profit_balance ?? 0;
  const signupBonus = userData?.signup_reward_amount || 0;
  const tradingBalance = Math.max(0, walletBalance - signupBonus);
  const pendingWithdrawals = transactions
    .filter((t: any) => t.type === "withdrawal" && t.status === "pending")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-[#03060C] flex justify-center w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl h-[100dvh] bg-[#03060C] relative flex flex-col md:flex-row shadow-2xl overflow-x-hidden overflow-y-hidden font-sans">
        {/* Mobile Bottom Navigation */}
        <div className="md:hidden absolute bottom-0 w-full h-[88px] bg-[#070b13]/90 backdrop-blur-xl border-t border-white/5 flex items-start pt-3 justify-around px-2 z-50 rounded-t-3xl shadow-[0_-15px_30px_rgba(0,0,0,0.6)]">
          <NavItem tab="home" icon={Home} label="Home" />
          <NavItem tab="plan" icon={TrendingUp} label="Invest" />

          <div 
            onClick={() => navigateTab("deposit")}
            className="relative -top-8 flex flex-col items-center justify-center cursor-pointer"
          >
            <button
              type="button"
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(30,80,255,0.5)] border-4 border-[#03060C] hover:scale-105 transition-transform"
            >
              <Plus className="w-6 h-6 text-primary-foreground" />
            </button>
            <span className="text-[10px] text-muted-foreground mt-1 font-medium">
              Deposit
            </span>
          </div>

          <NavItem tab="rewards" icon={Gift} label="Rewards" />
          <NavItem tab="profile" icon={User} label="Profile" />
        </div>

        {/* Desktop Sidebar Navigation */}
        <div className="hidden md:flex flex-col w-[260px] bg-[#070b13] border-r border-white/5 py-8 h-full flex-shrink-0 z-40 relative shadow-[10px_0_40px_rgba(0,0,0,0.8)] overflow-y-auto">
          {/* Brand Logo Header */}
          <div className="flex items-center gap-3 px-6 mb-8 shrink-0">
            <Logo className="h-9" />
          </div>

          {/* Secure Node Status Tracker */}
          <div className="px-5 mb-6 shrink-0">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-[#475569] font-mono">NODE SECURED</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-emerald-400 font-mono">ONLINE</span>
              </div>
            </div>
          </div>

          {/* Groups List */}
          <div className="flex flex-col gap-6 flex-1 pr-1.5 select-none">
            
            {/* CORE BASE SYSTEM */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#475569] font-mono px-5 block mb-2">SYSTEM BASE</span>
              <NavItem tab="home" icon={LayoutDashboard} label="Dashboard" />
              <NavItem tab="plan" icon={TrendingUp} label="Trading Cycles" />
              <NavItem tab="payments" icon={CreditCard} label="Settlement Logs" />
            </div>

            {/* GROW STATS */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#475569] font-mono px-5 block mb-2">NETWORK METRICS</span>
              <NavItem tab="referrals" icon={UserPlus} label="Affiliates" />
              <NavItem tab="rewards" icon={Trophy} label="Milestones" />
            </div>

            {/* SECTIONS */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#475569] font-mono px-5 block mb-2">PROFILE CONTROLS</span>
              <NavItem tab="profile" icon={User} label="Security" />
            </div>
          </div>

          {/* Bottom Actions Cluster */}
          <div className="mt-auto px-5 pt-4 space-y-3 shrink-0">
            {!isInstalled && (
              <Button
                variant="outline"
                className="w-full border-dashed border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-emerald-400 h-11 uppercase font-bold text-xs tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                onClick={promptInstall}
              >
                <Download className="w-4 h-4 shrink-0" />
                Install PWA App
              </Button>
            )}

            <button
              type="button"
              onClick={() => navigateTab("deposit")}
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-extrabold uppercase text-xs tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" /> MAKE DEPOSIT
            </button>
          </div>
        </div>

        <PaymentVerificationOverlay />

        {/* Main Scrollable Content */}
        <div className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden pb-24 md:pb-0 custom-scrollbar md:bg-background">
          {activeTab === "home" && (
            <TabHome
              username={username}
              formatCurrency={formatCurrency}
              preferredCurrency={preferredCurrency}
              handleCurrencyChange={handleCurrencyChange}
              openPlan={() => navigateTab("plan")}
              navigateTab={navigateTab}
              activeInvestment={activeInvestment}
              investments={investments}
              portfolioTotals={portfolioTotals}
              intervalsByInv={intervalsByInv}
              userData={userData}
              hideBalance={hideBalance}
              setHideBalance={setHideBalance}
              transactions={transactions}
              liveFactor={liveFactor}
              liveAmount={liveAmount}
              countdownStr={countdownStr}
              profitProgress={profitProgress}
              liveEarningsByInv={liveEarningsByInv}
              countdowns={countdowns}
              plans={plans}
              handleStartQuickTrade={handleStartQuickTrade}
              globalConfig={globalConfig}
            />
          )}
          {activeTab === "plan" && (
            <TabPlan
              formatCurrency={formatCurrency}
              navigateTab={navigateTab}
              openPayments={(inv: any) => {
                if (inv) setActiveInvestment(inv);
                navigateTab("payments");
              }}
              goBack={navigateBack}
              activeInvestment={activeInvestment}
              investments={investments}
              intervalsByInv={intervalsByInv}
              userData={userData}
              plans={plans}
              liveFactor={liveFactor}
              liveEarningsByInv={liveEarningsByInv}
              countdowns={countdowns}
              handleStartQuickTrade={handleStartQuickTrade}
              globalConfig={globalConfig}
            />
          )}
          {activeTab === "payments" && (
            <TabPayments
              formatCurrency={formatCurrency}
              goBack={navigateBack}
              activeInvestment={activeInvestment}
              intervalsByInv={intervalsByInv}
              investments={investments}
              userData={userData}
            />
          )}
          {activeTab === "rewards" && (
            <TabRewards
              goBack={navigateBack}
              rewards={rewards}
              userData={userData}
              activeInvestment={activeInvestment}
              navigateTab={navigateTab}
              formatCurrency={formatCurrency}
              claimedRewards={claimedRewards}
              milestoneConfigs={milestoneConfigs}
            />
          )}
          {activeTab === "profile" && (
            <TabProfile
              userData={userData}
              preferredCurrency={preferredCurrency}
              goBack={navigateBack}
              logout={logout}
              navigateTab={navigateTab}
            />
          )}
          {activeTab === "referrals" && (
            <TabReferrals
              userData={userData}
              goBack={navigateBack}
            />
          )}
          {activeTab === "deposit" && (
            <TabDeposit
              goBack={navigateBack}
              navigateTab={navigateTab}
              activeInvestment={activeInvestment}
              formatCurrency={formatCurrency}
            />
          )}
          {activeTab === "support" && (
            <TabSupport
              userData={userData}
              goBack={navigateBack}
            />
          )}

          {activeTab === "withdraw" && (
            <TabWithdrawal
              availableBalance={tradingBalance - pendingWithdrawals}
              profitBalance={profitBalance}
              referralBalance={userData?.referralBalance || 0}
              preferredCurrency={preferredCurrency}
              investments={investments}
              goBack={navigateBack}
              onNavigateToInvest={() => navigateTab("plan")}
            />
          )}

          {activeTab === "quick_trade" && (
            <TabQuickTrade
              amount={Number(searchParams.get("amount")) || 450}
              userBalance={tradingBalance}
              userData={userData}
              globalConfig={globalConfig}
              goBack={navigateBack}
              navigateTab={navigateTab}
              setPendingPlanForDeposit={setPendingPlanForDeposit}
              setSearchParams={setSearchParams}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabHome({
  username,
  formatCurrency,
  preferredCurrency,
  handleCurrencyChange,
  transactions,
  userData,
  hideBalance,
  setHideBalance,
  activeInvestment,
  investments,
  portfolioTotals,
  intervalsByInv,
  openPlan,
  navigateTab,
  liveFactor,
  liveAmount,
  countdownStr,
  profitProgress,
  liveEarningsByInv,
  countdowns,
  plans,
  handleStartQuickTrade,
  globalConfig,
}: any) {
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const { isInstalled, promptInstall } = usePwa();

  const [planTabMode, setPlanTabMode] = useState<'standard' | 'pro'>('standard');
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [expandedPlanName, setExpandedPlanName] = useState<string | null>(null);

  const { standardPlans: homeStandardPlans, proPlans: homeProPlans } = TradingEngineService.getPlanLists(plans || []);

  const renderPlansSection = (isHomeView: boolean = false) => {
    const currentPlansList = planTabMode === 'standard' ? homeStandardPlans : homeProPlans;
    const plansToDisplay = isHomeView ? currentPlansList.slice(0, 2) : currentPlansList;

    return (
      <div className="space-y-4">
        {/* QUICK TRADE CARD */}
        <QuickTradePanel
          userBalance={Math.max(0, (userData?.wallet_balance ?? userData?.balance ?? 0) - (userData?.signup_reward_amount || 0))}
          onStartTrade={handleStartQuickTrade}
          onExploreHigherTrades={isHomeView ? openPlan : undefined}
        />

        {/* FLEX VS FIXED SEGMENTED TOGGLE */}
        <div className="bg-[#0c142b] border border-white/5 p-1.5 flex items-center my-2 rounded-2xl">
          <button
            type="button"
            onClick={() => setPlanTabMode('standard')}
            className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
              planTabMode === 'standard'
                ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                : 'text-[#8492a6] hover:text-white'
            }`}
          >
            Flex
          </button>
          <button
            type="button"
            onClick={() => setPlanTabMode('pro')}
            className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
              planTabMode === 'pro'
                ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                : 'text-[#8492a6] hover:text-white'
            }`}
          >
            Fixed
          </button>
        </div>

        {/* COMPARE FLEX VS FIXED ACCORDION */}
        <div className="bg-[#0c142b] border border-[#19264c] rounded-2xl overflow-hidden transition-all shadow-lg">
          <div
            onClick={() => setIsComparisonOpen(!isComparisonOpen)}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#111c3a] transition-all"
          >
            <span className="text-sm font-bold text-white tracking-tight">
              Compare Flex vs Fixed
            </span>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                isComparisonOpen ? 'rotate-180' : ''
              }`}
            />
          </div>

          {isComparisonOpen && (
            <div className="px-4 pb-5 pt-2 border-t border-[#182344] animate-in slide-in-from-top-2 duration-200 text-xs">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold pb-2.5 border-b border-[#182344]">
                <div className="col-span-4 text-slate-400">Feature</div>
                <div className="col-span-4 text-[#38bdf8]">Flex</div>
                <div className="col-span-4 text-[#c084fc]">Fixed</div>
              </div>

              <div className="space-y-3.5 pt-3">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 text-slate-300 font-medium text-xs leading-snug">
                    Interval Distributions
                  </div>
                  <div className="col-span-4 text-[#34d399] font-medium text-xs border-l-2 border-[#10b981] pl-2 leading-snug">
                    Periodic Scheduled
                  </div>
                  <div className="col-span-4 text-[#fbbf24] font-medium text-xs border-l-2 border-[#d97706] pl-2 leading-snug">
                    None (Settle at Maturity)
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 text-slate-300 font-medium text-xs leading-snug">
                    AI Routing System
                  </div>
                  <div className="col-span-4 text-[#38bdf8] font-medium text-xs border-l-2 border-[#0284c7] pl-2 leading-snug">
                    Standard Arbitrage
                  </div>
                  <div className="col-span-4 text-[#fbbf24] font-medium text-xs border-l-2 border-[#d97706] pl-2 leading-snug">
                    Premium Multi-Loop Neural
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 text-slate-300 font-medium text-xs leading-snug">
                    User Intervention
                  </div>
                  <div className="col-span-4 text-[#38bdf8] font-medium text-xs border-l-2 border-[#0284c7] pl-2 leading-snug">
                    Requires funding intervals
                  </div>
                  <div className="col-span-4 text-[#fbbf24] font-medium text-xs border-l-2 border-[#d97706] pl-2 leading-snug">
                    None (100% Autonomous)
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 text-slate-300 font-medium text-xs leading-snug">
                    Optimization Grade
                  </div>
                  <div className="col-span-4 text-[#34d399] font-medium text-xs border-l-2 border-[#10b981] pl-2 leading-snug">
                    Conservative Balanced
                  </div>
                  <div className="col-span-4 text-[#fbbf24] font-medium text-xs border-l-2 border-[#d97706] pl-2 leading-snug">
                    Elite Institutional
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PLANS LIST HEADER LABEL */}
        <div className="text-[10px] text-slate-400 font-mono tracking-[0.15em] uppercase mt-6 mb-2">
          {planTabMode === 'standard' ? 'FLEX PLANS' : 'FIXED PLANS'}
        </div>

        {/* PLANS CARDS LIST */}
        <div className="space-y-4">
          {plansToDisplay.map((p: any, i: number) => {
            const isExpanded = expandedPlanName === p.name;
            const cleanNameUpper = p.name?.toUpperCase()?.replace(" PRO", "") || "";
            const isCore = cleanNameUpper === "CORE";
            const isQuantum = cleanNameUpper === "QUANTUM";

            const outcomes = TradingEngineService.getPlanOutcomes(p);
            const expectedReturnFormatted = formatCurrency(outcomes.expectedOutcome);

            const rawCap = outcomes.capital || p.min || 1000;
            const rawGain = outcomes.expectedOutcome - rawCap;
            const computedRoi = rawCap > 0 ? Math.round((rawGain / rawCap) * 100) : "8";

            const formattedPlanName = planTabMode === 'standard' 
              ? `${cleanNameUpper.charAt(0) + cleanNameUpper.slice(1).toLowerCase()} Flex` 
              : `${cleanNameUpper.charAt(0) + cleanNameUpper.slice(1).toLowerCase()} Fixed`;

            return (
              <div
                key={i}
                className="bg-[#0c142b] border border-[#19264c] rounded-2xl p-5 hover:border-[#283d78] transition-all relative shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#131d3a] border border-[#213262] p-2.5 rounded-xl flex items-center justify-center h-12 w-12 shrink-0">
                      {planTabMode === 'standard' ? (
                        <RefreshCw className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Lock className="w-5 h-5 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white tracking-tight">{formattedPlanName}</h3>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {formatCurrency(p.min)} entry
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      {expectedReturnFormatted}
                    </div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">
                      +{computedRoi}%
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setExpandedPlanName(isExpanded ? null : p.name)}
                  className="mt-3 pt-3 border-t border-[#182344] flex items-center justify-center gap-1 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  <span>{isExpanded ? "Hide details" : "View details"}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#182344] animate-in slide-in-from-top-2 duration-200 space-y-4">
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05]">
                        <span className="text-slate-400">Entry</span>
                        <span className="text-white font-bold">{formatCurrency(p.min)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05]">
                        <span className="text-slate-400">Range</span>
                        <span className="text-white font-mono font-bold">{formatCurrency(p.min)} – {formatCurrency(p.max)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05]">
                        <span className="text-slate-400">Total Days</span>
                        <span className="text-white font-bold">{p.duration || (planTabMode === 'standard' ? 15 : 30)} Days</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-slate-400">Method</span>
                        <span className="text-white font-medium">{planTabMode === 'standard' ? 'Recurring' : 'Lump Sum at Maturity'}</span>
                      </div>
                    </div>

                    <Button
                      onClick={openPlan}
                      className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold h-12 rounded-xl shadow-lg transition-all text-sm cursor-pointer border border-white/10"
                    >
                      Configure {formattedPlanName}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show View All / Show All Plans button from 3rd plan (Prime) on Home Dashboard view */}
          {isHomeView && (
            <div className="pt-2 text-center">
              <Button
                onClick={openPlan}
                className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg border border-white/10 cursor-pointer text-sm"
              >
                <span>View All Plans & Strategies</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    return localStorage.getItem('pwa_banner_dismissed') === 'true';
  });

  const handleDismissBanner = () => {
    setIsBannerDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleInstallClick = () => {
    handleDismissBanner();
    promptInstall();
  };

  const { basePlansList: homeBasePlansList, standardPlans: homeStandardPlansList, proPlans: homeProPlansList, availablePlans: homeTabAvailablePlans } = TradingEngineService.getPlanLists(plans || []);

  const walletBalance = userData?.wallet_balance ?? userData?.balance ?? 0;
  const profitBalance = userData?.profit_balance ?? 0;
  const lockedBalance = userData?.locked_balance ?? 0;
  const pendingWithdrawals = transactions
    .filter((t: any) => t.type === "withdrawal" && t.status === "pending")
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  
  // AGGREGATE METRICS ACROSS ALL PLANS
  const totalProfits = (portfolioTotals?.total_profit_earned || 0) + (userData?.legacy_profits || 0);
  
  // Aggregated totals for display
  const investedTotal = (investments || []).reduce((acc: number, inv: any) => acc + (inv.deposited || 0), 0);
  const signupBonus = userData?.signup_reward_amount || 0;
  // Deposit Balance should not include the signup bonus
  const depositBalance = Math.max(0, walletBalance - signupBonus); 
  const displayProfitBalance = profitBalance;
  // Total Balance remains the same (walletBalance + profitBalance) so the bonus is still in totalBalance
  const totalBalance = walletBalance + profitBalance;

  const [chartTimeframe, setChartTimeframe] = useState<'1D' | '1W' | '1M' | 'ALL'>('1W');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    let labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (chartTimeframe === '1D') {
      labels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "Now"];
    } else if (chartTimeframe === '1M') {
      labels = ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Today"];
    } else if (chartTimeframe === 'ALL') {
      labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    }

    const activeInvs = (investments || []).filter((inv: any) => inv.status === 'active');

    if (activeInvs.length === 0) {
      const idleChart = labels.map((l) => ({ name: l, value: 0 }));
      setChartData(idleChart);
      return;
    }

    // Aggregate the total profit potential for the current active intervals
    const totalPotentialIntervalProfit = activeInvs.reduce((acc, inv) => {
       const profitPerInt = (inv.expected_total_profit || 0) / (inv.total_intervals || 1);
       return acc + profitPerInt;
    }, 0);
    
    const baseChart = [];
    const steps = labels.length - 1;
    for (let i = 0; i < steps; i++) {
      const segment = (totalPotentialIntervalProfit || (liveAmount * 0.1)) / labels.length;
      const val = Math.max(0, liveAmount - (steps - i) * segment);
      baseChart.push({ name: labels[i], value: Number(val.toFixed(2)) });
    }

    setChartData([...baseChart, { name: labels[steps], value: Number(liveAmount.toFixed(2)) }]);
  }, [investments, liveAmount, chartTimeframe]);

  const getTxDetails = (type: string) => {
    switch (type) {
      case "deposit":
        return {
          icon: ArrowDownRight,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          label: "Deposit",
          symbol: "+",
        };
      case "deduction":
      case "INTERVAL_DEDUCTION":
        return {
          icon: Activity,
          color: "text-slate-400",
          bg: "bg-slate-500/10",
          label: "Interval Deduction",
          symbol: "-",
        };
      case "PLAN_ACTIVATED":
        return {
          icon: Activity,
          color: "text-foreground",
          bg: "bg-white/10",
          label: "Plan Activated",
          symbol: "",
        };
      case "deduction_failed":
        return {
          icon: AlertTriangle,
          color: "text-red-400",
          bg: "bg-red-400/10",
          label: "Deduction Failed",
          symbol: "",
        };
      case "withdrawal":
        return {
          icon: ArrowUpRight,
          color: "text-muted-foreground",
          bg: "bg-slate-500/10",
          label: "Withdrawal",
          symbol: "-",
        };
      case "profit_release":
      case "PROFIT_PAYOUT":
      case "MATURITY_PROFIT":
        return {
          icon: Zap,
          color: "text-green-400",
          bg: "bg-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.3)]",
          label: "Profit Paid",
          symbol: "+",
        };
      case "penalty":
        return {
          icon: AlertTriangle,
          color: "text-orange-400",
          bg: "bg-orange-500/10",
          label: "Late Penalty",
          symbol: "-",
        };
      default:
        return {
          icon: Activity,
          color: "text-foreground",
          bg: "bg-white/10",
          label: "Transaction",
          symbol: "",
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "pending":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "failed":
      case "overdue":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-muted-foreground bg-slate-400/10 border-slate-400/20";
    }
  };

  const filteredTx = transactions.filter((tx: any) => {
    const typeLower = (tx.type || '').toLowerCase();
    
    if (filter === "Deposits") {
      if (typeLower !== "deposit") return false;
    } else if (filter === "Trading Distributions") {
      if (!["deduction", "deduction_failed", "interval_deduction", "trading_distribution"].includes(typeLower)) return false;
    } else if (filter === "Profits") {
      if (!["profit_release", "profit_payout", "maturity_profit", "cycle_distribution"].includes(typeLower)) return false;
    } else if (filter === "Penalties") {
      if (typeLower !== "penalty") return false;
    } else {
      // For "All" filter, exclude penalty from general list
      if (typeLower === "penalty") return false;
    }

    if (
      searchQuery &&
      !tx.reference?.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="p-3.5 sm:p-5 w-full max-w-7xl mx-auto flex flex-col gap-5 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:px-8 lg:py-10 relative min-w-0 overflow-x-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute top-[40%] right-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-indigo-500/10 rounded-full blur-[120px]" />
        </div>
      {/* PWA banner */}
      {!isInstalled && !isBannerDismissed && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <button 
            onClick={handleDismissBanner}
            className="absolute top-2 right-2 text-muted-foreground hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0 relative z-10">
              <Download className="w-5 h-5 animate-pulse" />
            </div>
            <div className="relative z-10 pr-6">
              <h4 className="text-white font-semibold text-sm">Install Aetheris Premium App</h4>
              <p className="text-xs text-muted-foreground">Access your trades directly from your home screen with Face ID and real-time alerts.</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            type="button"
            className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 shrink-0 relative z-10"
          >
            Install Now
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-3 sm:mb-4 pt-1 w-full min-w-0">
        <div 
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 flex-1 pr-2"
          onClick={() => navigateTab("profile")}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden relative shadow-md shrink-0">
            <img
              src={
                userData?.avatarUrl ||
                userData?.profile_avatar ||
                userData?.avatar ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
              }
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center translate-y-[-1px] min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground font-sans tracking-tight leading-tight flex items-center gap-1.5 mb-0.5 truncate">
              Hi, {username} <span className="transform -translate-y-[1px]">👋</span>
            </h1>
            <div className="text-muted-foreground text-[10px] sm:text-[11px] font-medium tracking-wide truncate">Your Total Asset</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded border border-primary/30 mr-1">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            <span className="text-primary text-[10px] uppercase font-semibold">
              Verified
            </span>
          </div>
          <button
            onClick={() => navigateTab('support')}
            className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/5 transition-all outline-none select-none hover:bg-white/10 hover:border-primary/30 active:translate-y-px"
            title="Customer Support"
          >
            <Headphones className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
          <NotificationBell />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start w-full min-w-0">
        {/* LEFT COLUMN: WALLET DASHBOARD */}
        <div className="w-full lg:w-[45%] flex flex-col gap-4 min-w-0">
          {/* MAIN WALLET CARD */}
          <SwipableWalletCards 
            hideBalance={hideBalance} 
            setHideBalance={setHideBalance} 
            totalBalance={totalBalance} 
            displayProfitBalance={displayProfitBalance} 
            depositBalance={depositBalance} 
            userData={userData} 
          />

          {/* QUICK ACTIONS */}
          <div className="flex justify-between items-center px-1 py-1">
            <button
              onClick={() => navigateTab("deposit")}
              type="button"
              className="flex flex-col items-center gap-1.5 cursor-pointer group appearance-none bg-transparent border-none p-0 outline-none"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900/90 border border-white/10 group-hover:border-primary/50 flex items-center justify-center transition-all shadow-md group-hover:scale-105">
                <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Deposit
              </span>
            </button>

            <button
              onClick={() => navigateTab("withdraw")}
              type="button"
              className="flex flex-col items-center gap-1.5 cursor-pointer group appearance-none bg-transparent border-none p-0 outline-none"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900/90 border border-white/10 group-hover:border-blue-400/50 flex items-center justify-center transition-all shadow-md group-hover:scale-105">
                <ArrowUpFromLine className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Withdraw
              </span>
            </button>

            <button
              onClick={() => navigateTab("rewards")}
              type="button"
              className="flex flex-col items-center gap-1.5 cursor-pointer group appearance-none bg-transparent border-none p-0 outline-none"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900/90 border border-white/10 group-hover:border-amber-500/50 flex items-center justify-center transition-all shadow-md group-hover:scale-105">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Rewards
              </span>
            </button>

            <button
              onClick={() => navigateTab("rewards")}
              type="button"
              className="flex flex-col items-center gap-1.5 cursor-pointer group appearance-none bg-transparent border-none p-0 outline-none"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-900/90 border border-white/10 group-hover:border-emerald-400/50 flex items-center justify-center transition-all shadow-md group-hover:scale-105">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                Invite
              </span>
            </button>
          </div>

          {/* YOUR INVESTMENT / LIVE GROWTH CARD */}
          {investments && investments.some((inv: any) => inv.status !== 'pending_activation') && (
            <div className="flex flex-col gap-2.5 mt-3 mb-1">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-xs font-bold text-foreground tracking-wider uppercase">
                    Live Growth Engine
                  </h2>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${activeInvestment?.profit_status === 'paused' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeInvestment?.profit_status === 'paused' ? 'bg-amber-500' : 'bg-emerald-400 animate-ping'}`} />
                  {activeInvestment 
                    ? (activeInvestment.profit_status === 'paused' ? "PAUSED" : "ACTIVE ALGORITHM") 
                    : "OFFLINE"}
                </div>
              </div>

              <Card className="bg-slate-950/80 border border-emerald-500/20 rounded-xl p-3.5 sm:p-4 shadow-lg relative overflow-hidden group">
                {/* Background Ambient Glows */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Top Header Row with Value & Timeframe */}
                <div className="flex justify-between items-center gap-2 mb-3 z-10 relative">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      Live Yielding
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-mono">
                        {formatCurrency(liveAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Timeframe Selector Pills */}
                  <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-lg border border-white/10">
                    {(['1D', '1W', '1M', 'ALL'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setChartTimeframe(tf)}
                        className={`px-2.5 py-0.5 text-[9px] font-bold rounded transition-all ${
                          chartTimeframe === tf
                            ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Area Chart Component */}
                <div className="h-[95px] w-full z-10 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="liveGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 600 }}
                        dy={4}
                      />
                      <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 border border-emerald-500/30 backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-xl">
                                <div className="text-muted-foreground text-[9px] font-semibold uppercase">{label}</div>
                                <div className="text-emerald-400 font-bold text-xs">
                                  {formatCurrency(Number(payload[0].value))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#liveGrowthGradient)"
                        dot={{ fill: "#10b981", r: 2.5, strokeWidth: 0 }}
                        activeDot={{
                          r: 5,
                          fill: "#022c22",
                          stroke: "#10b981",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {activeInvestment?.profit_status === 'paused' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2.5 mt-1"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">Trading Paused</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      Insufficient balance. {activeInvestment.grace_deadline ? `Fund by ${new Date(activeInvestment.grace_deadline.toDate ? activeInvestment.grace_deadline.toDate() : activeInvestment.grace_deadline).toLocaleTimeString()} to continue.` : "Fund your account to continue profit generation."}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* ACTIVE PLANS LIST */}
          {(() => {
            let overdueCount = 0;
            if (intervalsByInv) {
              Object.values(intervalsByInv).forEach((intervalsArray: any) => {
                 overdueCount += intervalsArray.filter((i: any) => i.status === 'overdue').length;
              });
            }
            return (
              <div className="flex flex-col gap-2.5 mt-3 mb-4">
                <div className="flex justify-between items-center mb-0.5">
                  <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    Your Portfolio
                  </h2>
                  <span className="text-[11px] text-muted-foreground font-semibold">
                    {investments.length} Portfolio{investments.length !== 1 ? 's' : ''}
                  </span>
                </div>

            {(() => {
              let totalOutstanding = 0;
              if (intervalsByInv) {
                Object.values(intervalsByInv).forEach((intervalsArray: any) => {
                   intervalsArray.forEach((i: any) => {
                      const dueT = i.due_date?.toDate ? i.due_date.toDate().getTime() : (i.due_date ? new Date(i.due_date).getTime() : 0);
                      if (i.status === 'overdue' || (i.status === 'pending' && dueT <= Date.now())) {
                          const recurringAmt = Number(i.amount_due || i.amount || 0);
                          totalOutstanding += recurringAmt;
                      }
                   });
                });
              }
              investments.forEach((inv: any) => {
                if (inv.status === 'pending_activation') {
                  totalOutstanding += Number(inv.amount_per_interval || inv.first_interval_amount || inv.total_amount || 0);
                }
              });
              return (
                <>
                {totalOutstanding > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    You have {formatCurrency(totalOutstanding)} in outstanding funding required to keep yield active.
                  </div>
                )}
                </>
              );
            })()}

            <div className="flex flex-col gap-3">
              {investments
                .sort((a: any, b: any) => {
                  if (a.status === 'active' && b.status !== 'active') return -1;
                  if (a.status !== 'active' && b.status === 'active') return 1;
                  const dateA = a.created_at?.toDate ? a.created_at.toDate().getTime() : 0;
                  const dateB = b.created_at?.toDate ? b.created_at.toDate().getTime() : 0;
                  return dateB - dateA || (b.total_amount - a.total_amount);
                })
                .slice(0, 3)
                .map((inv: any) => {
                const isPending = inv.status === 'pending_activation';
                const isPaused = inv.status === 'paused';
                const isOverdue = inv.status === 'overdue';
                const isCompleted = inv.status === 'completed';
                const isWarning = isPending || isPaused || isOverdue;
                const isQuickTrade = (inv.plan_name || inv.plan)?.toUpperCase().includes("QUICK TRADE") || inv.plan_id === "quick_trade";

                let warningLabel = '';
                if (isPending) warningLabel = 'PENDING PAYMENT';
                else if (isPaused) warningLabel = 'PAUSED';
                else if (isOverdue) warningLabel = 'OVERDUE';
                else if (isCompleted) warningLabel = 'COMPLETED ✅';

                let outstandingFunds = 0;
                if (isPending) {
                  outstandingFunds = Number(inv.amount_per_interval || inv.first_interval_amount || inv.total_amount || 0);
                } else if (isPaused || isOverdue || inv.status === 'active') {
                   const dueIntervals = (intervalsByInv?.[inv.id] || []).filter(
                      (i: any) => {
                          const dueT = i.due_date?.toDate ? i.due_date.toDate().getTime() : (i.due_date ? new Date(i.due_date).getTime() : 0);
                          return (i.status === "pending" || i.status === "overdue") && dueT <= Date.now();
                      }
                   );
                   dueIntervals.forEach((i: any) => {
                      const recurringAmt = Number(i.amount_due || i.amount || inv.amount_per_interval || inv.recurring_principal || ((inv.total_amount || 0) / (inv.total_intervals || 1)));
                      outstandingFunds += recurringAmt;
                   });
                   if (outstandingFunds > 0 && (isPaused || isOverdue)) {
                     warningLabel = 'OUTSTANDING FUNDS';
                   }
                }

                let nextDueStr = "Completed";
                if (isWarning) nextDueStr = "Awaiting Deposit";
                else if (isCompleted) nextDueStr = "Completed ✅";
                else if (!isWarning && !isCompleted) {
                  nextDueStr = countdowns[inv.id] || "Calculating...";
                }

                const matchedConfig = homeTabAvailablePlans.find((p: any) => p.name?.toUpperCase() === (inv.plan_name || inv.plan)?.toUpperCase());
                const { targetReturn, dynamicForecast, currentProgressVal, principalInvested } = TradingEngineService.getLiveForecast(
                  inv,
                  matchedConfig,
                  liveEarningsByInv,
                  isWarning,
                  globalConfig,
                  intervalsByInv?.[inv.id]
                );

                return (
                  <Card key={inv.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-md relative overflow-hidden group hover:border-slate-700/80 transition-all">
                    {/* Status Badge Tag */}
                    <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${isQuickTrade ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                          {isQuickTrade ? <Zap className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-tight">
                            {formatPlanName(inv)} {formatCurrency(inv.total_amount)}
                          </h3>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                            Target Return: <span className="text-emerald-400 font-bold">{formatCurrency(targetReturn)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Top Right Timer / Status Pill */}
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {isWarning ? 'Status' : 'Next Allocation'}
                        </span>
                        {isWarning ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${outstandingFunds > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {warningLabel}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-foreground bg-slate-800 px-2 py-0.5 rounded border border-white/5">
                            {nextDueStr}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compact Single Horizontal Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-2.5 bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                      <div>
                        <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Invested</div>
                        <div className="text-xs sm:text-sm font-bold text-foreground font-mono">
                          {formatCurrency(principalInvested)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Forecast</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                          {formatCurrency(dynamicForecast)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                          {outstandingFunds > 0 ? 'Action Needed' : 'Completed'}
                        </div>
                        <div className={`text-xs sm:text-sm font-bold font-mono ${outstandingFunds > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                          {outstandingFunds > 0 ? `${formatCurrency(outstandingFunds)}` : `${Math.round(currentProgressVal)}%`}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar directly beneath stats */}
                    <div className="mb-2.5">
                      <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        <span>{outstandingFunds > 0 ? 'Funding Requirement' : 'Cycle Progress'}</span>
                        <span className={outstandingFunds > 0 ? 'text-red-400 font-bold' : 'text-cyan-400 font-bold'}>
                          {Math.round(currentProgressVal)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, outstandingFunds > 0 ? (((userData?.wallet_balance ?? userData?.balance ?? 0) / (outstandingFunds || 1)) * 100) : Number(currentProgressVal || 0)))}%`
                          }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            outstandingFunds > 0 
                              ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                              : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Minimal Footer CTA */}
                    <div>
                      {isWarning ? (
                        <DepositModal 
                           activeInvestment={inv}
                           defaultAmount={outstandingFunds}
                           trigger={
                             <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-1.5 rounded-lg shadow-md shadow-amber-500/20 transition-all text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                               Fund Allocation & Activate
                               <ArrowRight className="w-3.5 h-3.5" />
                             </Button>
                           }
                        />
                      ) : (
                        <div 
                          onClick={() => {
                            navigateTab("plan");
                          }}
                          className="flex items-center justify-between text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer pt-0.5 group/link"
                        >
                          <span className="flex items-center gap-1">
                            <span>View Portfolio Details</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-primary group-hover/link:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}

              {investments.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={openPlan}
                    className="w-full mt-2 h-12 border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-2xl text-primary font-bold flex items-center justify-center gap-2 group transition-all"
                  >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                    <span>Add New Investment</span>
                  </Button>
                </div>
              ) : (
                renderPlansSection(true)
              )}
            </div>
           </div>
          );
         })()}
        </div>

        {/* RIGHT COLUMN: TRANSACTION HISTORY */}
        <div className="w-full lg:w-[55%] flex flex-col gap-4 min-w-0">
          <LiveActivityFeed />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <h2 className="text-lg font-bold text-foreground">Transactions</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none sm:w-48">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search..."
                  className="bg-card border-border rounded-full h-9 pl-9 text-xs focus:ring-primary focus:border-primary text-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {["All", "Deposits", "Trading Distributions", "Profits", "Penalties"].map(
              (f, i) => (
                <div
                  key={i}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-[6px] rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer border transition-colors ${filter === f ? "bg-primary text-foreground border-primary" : "bg-card hover:bg-white/5 text-muted-foreground border-border"}`}
                >
                  {f}
                </div>
              ),
            )}
          </div>

          {/* Transaction List */}
          <div className="space-y-3 pt-2">
            {filteredTx.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <Activity className="w-8 h-8 text-muted-foreground mb-3 mx-auto" />
                <div className="text-sm font-medium text-muted-foreground">
                  No transactions found
                </div>
              </div>
            ) : (
              <>
                {filteredTx.slice(0, 5).map((tx: any, idx: number) => (
                  <TransactionCard 
                    key={tx.id || idx} 
                    transaction={tx} 
                    onClick={(t) => setSelectedTx(t)}
                  />
                ))}
                {filteredTx.length > 5 && (
                  <Link to="/transactions" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full mt-2 bg-transparent border-border hover:bg-white/5 text-foreground rounded-xl"
                    >
                      View More Transactions{" "}
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <TransactionDetailModal 
        isOpen={selectedTx !== null} 
        onClose={() => setSelectedTx(null)} 
        transaction={selectedTx} 
      />
    </div>
  );
}

function TabPlan({
  formatCurrency,
  navigateTab,
  openPayments,
  goBack,
  investments = [],
  intervalsByInv,
  userData,
  plans,
  liveFactor,
  liveEarningsByInv,
  countdowns,
  handleStartQuickTrade,
  globalConfig,
}: any) {
  const [searchParams, setSearchParams] = useSearchParams();
  const idFromUrl = searchParams.get('id');
  const [activePlanTab, setActivePlanTab] = useState<"active" | "browse">("active");
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(idFromUrl || null);

  useEffect(() => {
    if (idFromUrl && idFromUrl !== selectedInvestmentId) {
      setSelectedInvestmentId(idFromUrl);
      setActivePlanTab("active");
    }
  }, [idFromUrl]);

  const handleSelectInvestment = (id: string | null) => {
    setSelectedInvestmentId(id);
    setSearchParams(prev => {
      if (id) {
        prev.set('id', id);
      } else {
        prev.delete('id');
      }
      return prev;
    });
  };

  const activeInvs = investments.filter((i: any) => ['active', 'pending_activation', 'paused', 'overdue', 'completed'].includes(i.status));
  const selectedInvestment = investments.find((i:any) => i.id === selectedInvestmentId) || activeInvs[0];
  const intervals = selectedInvestment ? (intervalsByInv?.[selectedInvestment.id] || []) : [];

  const [isCreating, setIsCreating] = useState(false);
  const [isCancellingTrade, setIsCancellingTrade] = useState(false);
  const [tradeToCancel, setTradeToCancel] = useState<any>(null);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(false);
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [activationSummary, setActivationSummary] = useState<any>(null);
  const [showActivationConfirm, setShowActivationConfirm] = useState(false);
  const [isNewPlanDepositModalOpen, setIsNewPlanDepositModalOpen] = useState(false);
  const [pendingPlanForDeposit, setPendingPlanForDeposit] = useState<any>(null);
  const [selectedPlanConfig, setSelectedPlanConfig] = useState<any>(null);
  const [paymentSource, setPaymentSource] = useState<'card' | 'balance'>('card');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [intervalInput, setIntervalInput] = useState("");
  const [numIntervalsInput, setNumIntervalsInput] = useState("30");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTimelineDays, setSelectedTimelineDays] = useState<number>(30);
  const [planTabMode, setPlanTabMode] = useState<'standard' | 'pro'>('standard');
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [expandedPlanName, setExpandedPlanName] = useState<string | null>(null);

  const confirmCancelTrade = async () => {
    if (!tradeToCancel || !tradeToCancel.id) return;
    setIsCancellingTrade(true);
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/cancel-investment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.currentUser?.uid,
          investmentId: tradeToCancel.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel trade");
      }

      toast.success("Trade cancelled and disabled successfully.");
      setSelectedInvestmentId("");
      setTradeToCancel(null);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while cancelling trade");
    } finally {
      setIsCancellingTrade(false);
    }
  };

  const handleCancelTrade = (inv: any) => {
    if (!inv || !inv.id) return;
    setTradeToCancel(inv);
  };

  const { basePlansList, standardPlans: planStandardPlans, proPlans: planProPlans, availablePlans } = TradingEngineService.getPlanLists(plans);

  const openPlan = () => {
    setActivePlanTab("browse");
  };

  const renderPlansSection = (isHomeView: boolean = false) => {
    const currentPlansList = planTabMode === 'standard' ? planStandardPlans : planProPlans;
    const plansToDisplay = isHomeView ? currentPlansList.slice(0, 2) : currentPlansList;

    return (
      <div className="space-y-4">
        {/* QUICK TRADE CARD */}
        <QuickTradePanel
          userBalance={Math.max(0, (userData?.wallet_balance ?? userData?.balance ?? 0) - (userData?.signup_reward_amount || 0))}
          onStartTrade={handleStartQuickTrade}
          onExploreHigherTrades={isHomeView ? openPlan : undefined}
        />

        {/* FLEX VS FIXED SEGMENTED TOGGLE */}
        <div className="bg-[#0c142b] border border-white/5 p-1.5 flex items-center my-2 rounded-2xl">
          <button
            type="button"
            onClick={() => setPlanTabMode('standard')}
            className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
              planTabMode === 'standard'
                ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                : 'text-[#8492a6] hover:text-white'
            }`}
          >
            Flex
          </button>
          <button
            type="button"
            onClick={() => setPlanTabMode('pro')}
            className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all cursor-pointer ${
              planTabMode === 'pro'
                ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                : 'text-[#8492a6] hover:text-white'
            }`}
          >
            Fixed
          </button>
        </div>

        {/* COMPARE FLEX VS FIXED ACCORDION */}
        <div className="bg-[#0c142b] border border-[#19264c] rounded-2xl overflow-hidden transition-all shadow-lg">
          <div
            onClick={() => setIsComparisonOpen(!isComparisonOpen)}
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#111c3a] transition-all"
          >
            <span className="text-sm font-bold text-white tracking-tight">
              Compare Flex vs Fixed
            </span>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                isComparisonOpen ? 'rotate-180' : ''
              }`}
            />
          </div>

          {isComparisonOpen && (
            <div className="px-4 pb-5 pt-2 border-t border-[#182344] animate-in slide-in-from-top-2 duration-200 text-xs">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold pb-2.5 border-b border-[#182344]">
                <div className="col-span-4 text-slate-400">Feature</div>
                <div className="col-span-4 text-[#38bdf8]">Flex</div>
                <div className="col-span-4 text-[#c084fc]">Fixed</div>
              </div>

              <div className="space-y-3.5 pt-3">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 text-slate-300 font-medium text-xs leading-snug">
                    Interval Distributions
                  </div>
                  <div className="col-span-4 text-[#34d399] font-medium text-xs border-l-2 border-[#10b981] pl-2 leading-snug">
                    Periodic Scheduled
                  </div>
                  <div className="col-span-4 text-[#fbbf24] font-medium text-xs border-l-2 border-[#d97706] pl-2 leading-snug">
                    None (Settle at Maturity)
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 text-slate-300 font-medium text-xs leading-snug">
                    AI Routing System
                  </div>
                  <div className="col-span-4 text-[#38bdf8] font-medium text-xs border-l-2 border-[#0284c7] pl-2 leading-snug">
                    Standard Arbitrage
                  </div>
                  <div className="col-span-4 text-[#fbbf24] font-medium text-xs border-l-2 border-[#d97706] pl-2 leading-snug">
                    Premium Multi-Loop Neural
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 text-slate-300 font-medium text-xs leading-snug">
                    User Intervention
                  </div>
                  <div className="col-span-4 text-[#38bdf8] font-medium text-xs border-l-2 border-[#0284c7] pl-2 leading-snug">
                    Requires funding intervals
                  </div>
                  <div className="col-span-4 text-[#fbbf24] font-medium text-xs border-l-2 border-[#d97706] pl-2 leading-snug">
                    None (100% Autonomous)
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4 text-slate-300 font-medium text-xs leading-snug">
                    Optimization Grade
                  </div>
                  <div className="col-span-4 text-[#34d399] font-medium text-xs border-l-2 border-[#10b981] pl-2 leading-snug">
                    Conservative Balanced
                  </div>
                  <div className="col-span-4 text-[#fbbf24] font-medium text-xs border-l-2 border-[#d97706] pl-2 leading-snug">
                    Elite Institutional
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PLANS LIST HEADER LABEL */}
        <div className="text-[10px] text-slate-400 font-mono tracking-[0.15em] uppercase mt-6 mb-2">
          {planTabMode === 'standard' ? 'FLEX PLANS' : 'FIXED PLANS'}
        </div>

        {/* PLANS CARDS LIST */}
        <div className="space-y-4">
          {plansToDisplay.map((p: any, i: number) => {
            const isExpanded = expandedPlanName === p.name || selectedPlanConfig?.name === p.name;
            const cleanNameUpper = p.name?.toUpperCase()?.replace(" PRO", "") || "";
            const isCore = cleanNameUpper === "CORE";
            const isQuantum = cleanNameUpper === "QUANTUM";

            const outcomes = TradingEngineService.getPlanOutcomes(p);
            const expectedReturnFormatted = formatCurrency(outcomes.expectedOutcome);

            const rawCap = outcomes.capital || p.min || 1000;
            const rawGain = outcomes.expectedOutcome - rawCap;
            const computedRoi = rawCap > 0 ? Math.round((rawGain / rawCap) * 100) : "8";

            const formattedPlanName = planTabMode === 'standard' 
              ? `${cleanNameUpper.charAt(0) + cleanNameUpper.slice(1).toLowerCase()} Flex` 
              : `${cleanNameUpper.charAt(0) + cleanNameUpper.slice(1).toLowerCase()} Fixed`;

            return (
              <div
                key={i}
                className="bg-[#0c142b] border border-[#19264c] rounded-2xl p-5 hover:border-[#283d78] transition-all relative shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#131d3a] border border-[#213262] p-2.5 rounded-xl flex items-center justify-center h-12 w-12 shrink-0">
                      {planTabMode === 'standard' ? (
                        <RefreshCw className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Lock className="w-5 h-5 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white tracking-tight">{formattedPlanName}</h3>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {formatCurrency(p.min)} entry
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-400">
                      {expectedReturnFormatted}
                    </div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">
                      +{computedRoi}%
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setExpandedPlanName(isExpanded ? null : p.name)}
                  className="mt-3 pt-3 border-t border-[#182344] flex items-center justify-center gap-1 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  <span>{isExpanded ? "Hide details" : "View details"}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#182344] animate-in slide-in-from-top-2 duration-200 space-y-4">
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05]">
                        <span className="text-slate-400">Entry</span>
                        <span className="text-white font-bold">{formatCurrency(p.min)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05]">
                        <span className="text-slate-400">Range</span>
                        <span className="text-white font-mono font-bold">{formatCurrency(p.min)} – {formatCurrency(p.max)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-white/[0.05]">
                        <span className="text-slate-400">Total Days</span>
                        <span className="text-white font-bold">{p.duration || (planTabMode === 'standard' ? 15 : 30)} Days</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5">
                        <span className="text-slate-400">Method</span>
                        <span className="text-white font-medium">{planTabMode === 'standard' ? 'Recurring' : 'Lump Sum at Maturity'}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => setSelectedPlanConfig(p)}
                      className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold h-12 rounded-xl shadow-lg transition-all text-sm cursor-pointer border border-white/10"
                    >
                      Configure {formattedPlanName}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show View All / Show All Plans button from 3rd plan (Prime) on Home Dashboard view */}
          {isHomeView && (
            <div className="pt-2 text-center">
              <Button
                onClick={openPlan}
                className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg border border-white/10 cursor-pointer text-sm"
              >
                <span>View All Plans</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getPlanTimelineRange = (planName: string): { min: number; max: number } => {
    if (selectedPlanConfig && selectedPlanConfig.timelineMin !== undefined && selectedPlanConfig.timelineMax !== undefined) {
      return { min: Number(selectedPlanConfig.timelineMin), max: Number(selectedPlanConfig.timelineMax) };
    }
    const name = planName?.toUpperCase()?.replace(" PRO", "") || "";
    if (name === "STARTER" || name === "CORE") return { min: 10, max: 15 };
    if (name === "PRIME") return { min: 14, max: 21 };
    if (name === "QUANTUM") return { min: 20, max: 30 };
    if (name === "APEX") return { min: 30, max: 45 };
    if (name === "ULTRA") return { min: 45, max: 60 };
    return { min: 30, max: 30 };
  };

  const getPlanTimelineSteps = (pName: string): number[] => {
    if (selectedPlanConfig && selectedPlanConfig.timelineSteps && selectedPlanConfig.timelineSteps.length > 0) {
      return selectedPlanConfig.timelineSteps.map(Number);
    }
    const n = pName?.toUpperCase()?.replace(" PRO", "") || "";
    if (n === "STARTER" || n === "CORE") return [10, 12, 15];
    if (n === "PRIME") return [14, 18, 21];
    if (n === "QUANTUM") return [20, 25, 30];
    if (n === "APEX") return [30, 38, 45];
    if (n === "ULTRA") return [45, 50, 60];
    return [30];
  };

  useEffect(() => {
    if (selectedPlanConfig) {
      const pName = selectedPlanConfig.name?.toUpperCase() || "";
      const isPro = selectedPlanConfig.isPro || pName.endsWith("PRO");
      const baseName = pName.replace(" PRO", "").trim();

      // Original/Max duration states
      let origDays = selectedPlanConfig.duration || 15;
      if (!selectedPlanConfig.duration) {
        if (baseName === "PRIME") origDays = 21;
        else if (baseName === "QUANTUM") origDays = 30;
        else if (baseName === "APEX") origDays = 45;
        else if (baseName === "ULTRA") origDays = 60;
      }

      setSelectedTimelineDays(origDays);

      if (isPro) {
        setIntervalInput(origDays.toString()); // For complete pay-at-once payout at duration complete
      } else {
        const intervals = selectedPlanConfig.intervals || [];
        if (intervals.length > 0) {
          setIntervalInput(intervals[intervals.length - 1].toString());
        } else {
          if (baseName === "STARTER") {
            setIntervalInput("3");
          } else if (baseName === "ULTRA") {
            setIntervalInput("7");
          } else {
            // CORE, PRIME, QUANTUM, APEX
            setIntervalInput("5");
          }
        }
      }
    }
  }, [selectedPlanConfig]);

  // Ensure we switch to browse if no active investments exist
  useEffect(() => {
    if (investments.length === 0) {
      setActivePlanTab("browse");
    }
  }, [investments.length]);

  const activeInvestment = investments.find((inv: any) => inv.id === selectedInvestmentId) || investments[0];

  const getSpeedFeedback = (val: string) => {
    if (!val) return null;
    const v = parseInt(val);
    if (v === 1) return { text: "MAX SPEED", color: "text-green-400" };
    if (v <= 4) return { text: "High Yield", color: "text-emerald-400" };
    if (v <= 7) return { text: "Balanced", color: "text-blue-400" };
    return { text: "Relaxed", color: "text-muted-foreground" };
  };

  const getRangeFeedback = (val: string) => {
    if (!val) return null;
    const v = parseInt(val);
    if (v >= 10 && v <= 14) return { text: "MAX PROFIT", color: "text-green-400" };
    if (v >= 15 && v <= 19) return { text: "High Yield", color: "text-emerald-400" };
    if (v >= 20 && v <= 25) return { text: "Balanced", color: "text-blue-400" };
    return { text: "Standard", color: "text-muted-foreground" };
  };

  const handleCreatePlan = async (openDepositAfter: boolean = false) => {
    if (!auth.currentUser || !selectedPlanConfig) return;
    setErrorMsg("");
    
    // Now uses fixed tiered amount
    const amount = customAmount || selectedPlanConfig.min;
    const intervalDays = parseInt(intervalInput);
    
    // Use interactive customized timeline selected by the user
    const durationDays = selectedPlanConfig.duration || 15;
    const computedIntervals = Math.max(1, Math.floor(durationDays / intervalDays));

    const isPro = selectedPlanConfig.isPro || selectedPlanConfig.name?.toUpperCase().endsWith("PRO");
    const maxVal = isPro ? 60 : 14;

    if (isNaN(intervalDays) || intervalDays < 1 || intervalDays > maxVal) {
      setErrorMsg("Trading interval must be selected");
      return;
    }

    const amountPerInterval = isPro ? amount : amount / computedIntervals;
    const walletBal = userData?.wallet_balance ?? userData?.balance ?? 0;
    const signupBonus = userData?.signup_reward_amount || 0;
    const currentBalance = Math.max(0, walletBal - signupBonus);

    // Aetheris Flex recurring subscription activation flow (Card vs Account Balance)
    if (!isPro && selectedPlanConfig.id !== 'quick_trade') {
      const activePaymentSource = amountPerInterval > 1000 ? 'balance' : paymentSource;

      if (activePaymentSource === 'balance') {
        setIsCreating(true);
        try {
          const isBalanceSufficient = currentBalance >= amountPerInterval;
          const baseUrl = (import.meta as any).env.VITE_API_URL || "";
          
          const response = await fetch(`${baseUrl}/api/start-investment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: auth.currentUser.uid,
              amount: amount,
              totalAmount: amount,
              intervalDays: intervalDays,
              durationDays: durationDays,
              numIntervals: computedIntervals,
              plan: selectedPlanConfig.name || "Starter",
              isPro: false,
              planId: selectedPlanConfig.id,
              status: isBalanceSufficient ? "active" : "pending_activation",
              paymentSource: isBalanceSufficient ? "balance" : "crypto",
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to create flex plan");
          }

          if (isBalanceSufficient) {
            const outcomes = TradingEngineService.getPlanOutcomes({
              ...selectedPlanConfig,
              total_amount: amount,
              duration: durationDays,
              interval_days: intervalDays
            });

            setActivationSummary({
              planName: data.planName || `${selectedPlanConfig?.name?.toUpperCase()?.replace(/\bPRO\b|\bFIXED\b|\bFLEX\b/g, '')?.trim() || 'STARTER'} FLEX`,
              model: 'flex',
              totalAmount: Number(data.totalAmount || amount),
              initialPayment: Number(data.paidAmount ?? amountPerInterval),
              paymentMethod: data.paymentMethod || 'Wallet Balance',
              paymentStatus: 'ACTIVE',
              projectedProfit: Number(data.expectedTotalProfit ?? outcomes.projectedProfit),
              estimatedFinalReturn: Number(data.totalCompletionValue ?? outcomes.estimatedFinalReturn),
              durationDays: Number(data.durationDays || durationDays || 15),
              recurringIntervalDays: Number(data.intervalDays || intervalDays || 3),
              nextAllocationDays: Number(data.intervalDays || intervalDays || 3),
              recurringAllocation: outcomes.projection?.recurringAllocation || Number(data.paidAmount ?? amountPerInterval),
              profitPerAllocation: outcomes.projection?.profitPerAllocation || Number(((data.expectedTotalProfit ?? outcomes.projectedProfit) / (outcomes.projection?.totalAllocations || 5)).toFixed(2)),
              allocationValue: outcomes.projection?.allocationValue || Number((amountPerInterval + ((data.expectedTotalProfit ?? outcomes.projectedProfit) / (outcomes.projection?.totalAllocations || 5))).toFixed(2)),
              totalAllocations: outcomes.projection?.totalAllocations || Math.floor((data.durationDays || 15) / (data.intervalDays || 3)),
            });
            toast.success(`${selectedPlanConfig.name} activated successfully using account balance!`);
            setShowSuccess(true);
            setSelectedPlanConfig(null);
          } else {
            // Balance insufficient: Open deposit modal pre-filled with crypto option & 24h timer notice
            setPendingPlanForDeposit({
              id: data.investmentId,
              name: `${selectedPlanConfig.name} FLEX`,
              amount_per_interval: amountPerInterval,
            });
            setSearchParams({ tab: "deposit", amount: String(amountPerInterval), plan: `${selectedPlanConfig.name} FLEX` });
            toast.success(`Pending flex trade registered! Please complete your deposit on this page to activate.`);
            setSelectedPlanConfig(null);
          }
        } catch (e: any) {
          console.error("Flex plan creation error:", e);
          setErrorMsg(e.message || "Failed to process plan creation");
          toast.error(e.message || "Failed to process plan");
        } finally {
          setIsCreating(false);
        }
        return;
      }

      // Debit Card gateway flow via Bachs
      setIsCreating(true);
      toast.loading("Connecting to Bachs Secure Payment Gateway...", { id: "bachs-flex-init" });
      try {
        const response = await fetch("/api/payments/bachs/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: auth.currentUser.uid,
            email: auth.currentUser.email || "",
            amount: amountPerInterval, // $150 interval subscription
            currency: "USD",
            planId: selectedPlanConfig.id,
            planName: `${selectedPlanConfig.name} FLEX`,
            totalAmount: amount,
            intervalDays,
            durationDays,
            returnUrl: window.location.href,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          toast.dismiss("bachs-flex-init");
          throw new Error(data.error || "Failed to initialize Bachs subscription session");
        }

        const checkoutUrl = data.checkoutUrl || data.sessionUrl;
        toast.success("Redirecting to Bachs Checkout...", { id: "bachs-flex-init" });

        if ((window as any).Bachs?.Checkout?.open && checkoutUrl) {
          try {
            (window as any).Bachs.Checkout.open({ checkoutUrl });
          } catch (e) {
            window.location.href = checkoutUrl;
          }
        } else if (checkoutUrl) {
          window.location.href = checkoutUrl;
        }
      } catch (e: any) {
        console.error("Flex subscription initialization error:", e);
        toast.dismiss("bachs-flex-init");
        setErrorMsg(e.message || "Failed to start Bachs activation flow");
        toast.error(e.message || "Failed to start Bachs activation flow");
      } finally {
        setIsCreating(false);
      }
      return;
    }

    // Pro / Fixed / Legacy plan creation flow
    const initialStatus = (currentBalance >= amountPerInterval && !openDepositAfter) ? "active" : "pending_activation";

    setIsCreating(true);
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const response = await fetch(`${baseUrl}/api/start-investment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          planId: selectedPlanConfig.id,
          totalAmount: amount,
          durationDays,
          intervalDays,
          status: initialStatus
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create plan");
      }

      if (openDepositAfter || currentBalance < amountPerInterval || data.status !== 'active') {
         setPendingPlanForDeposit({ ...selectedPlanConfig, amount_per_interval: amountPerInterval, id: data.investmentId });
         setSearchParams({ tab: "deposit", amount: String(amountPerInterval), plan: selectedPlanConfig?.name || "Trade Plan" });
         toast.info("Plan saved as pending (valid for 24h). Redirecting to deposit...");
         setSelectedPlanConfig(null);
      } else {
         const outcomes = TradingEngineService.getPlanOutcomes({
           ...selectedPlanConfig,
           total_amount: amount,
           duration: durationDays,
           interval_days: intervalDays
         });

         setActivationSummary({
           planName: data.planName || `${selectedPlanConfig?.name?.toUpperCase()?.replace(/\bPRO\b|\bFIXED\b|\bFLEX\b/g, '')?.trim() || 'STARTER'} FIXED`,
           model: data.model || (isPro ? 'fixed' : 'flex'),
           totalAmount: Number(data.totalAmount || amount),
           initialPayment: Number(data.paidAmount ?? amount),
           paymentMethod: data.paymentMethod || 'Wallet Balance',
           paymentStatus: 'ACTIVE',
           projectedProfit: Number(data.expectedTotalProfit ?? outcomes.projectedProfit),
           estimatedFinalReturn: Number(data.totalCompletionValue ?? outcomes.estimatedFinalReturn),
           durationDays: Number(data.durationDays || durationDays || 15),
           recurringIntervalDays: Number(data.intervalDays || intervalDays || 15),
           nextAllocationDays: Number(data.durationDays || durationDays || 15),
           recurringAllocation: outcomes.projection?.recurringAllocation || Number(data.paidAmount ?? amount),
           profitPerAllocation: outcomes.projection?.profitPerAllocation || Number(data.expectedTotalProfit ?? outcomes.projectedProfit),
           allocationValue: outcomes.projection?.allocationValue || Number(data.totalCompletionValue ?? outcomes.estimatedFinalReturn),
           totalAllocations: outcomes.projection?.totalAllocations || 1,
         });
         setShowSuccess(true);
         setSelectedPlanConfig(null);
         toast.success("Plan created and activated!");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message);
      toast.error(e.message || "An error occurred");
    }
    setIsCreating(false);
  };

  return (
    <>
      <CancelTradeConfirmModal 
        isOpen={!!tradeToCancel}
        onClose={() => setTradeToCancel(null)}
        onConfirm={confirmCancelTrade}
        isCancelling={isCancellingTrade}
      />
      {(() => {
        if (showActivationConfirm) {
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm bg-card border border-border p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center gap-6"
              >
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <CreditCard className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Ready to Activate</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You're about to pay <span className="text-foreground font-bold">{formatCurrency(pendingPlanForDeposit?.amount_per_interval || 0)}</span> (first interval) to activate your <span className="text-foreground font-bold">{pendingPlanForDeposit?.name}</span>.
                  </p>
                </div>
                <div className="flex flex-col w-full gap-3">
                  <Button 
                    onClick={() => {
                      setSearchParams({ tab: "deposit", amount: String(pendingPlanForDeposit?.amount_per_interval || 0), plan: pendingPlanForDeposit?.name || "" });
                      setShowActivationConfirm(false);
                      setSelectedPlanConfig(null);
                    }}
                    className="w-full h-14 bg-primary hover:bg-blue-600 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(30,80,255,0.4)] cursor-pointer"
                  >
                    OK, Proceed
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      setShowActivationConfirm(false);
                      setSelectedPlanConfig(null);
                      goBack();
                    }}
                    className="w-full h-12 text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Back to Feed
                  </Button>
                </div>
              </motion.div>
            </div>
          );
        }

        if (showSuccess) {
          const summary = activationSummary || {
            planName: "Trading Plan",
            model: "flex",
            totalAmount: 0,
            initialPayment: 0,
            paymentMethod: "Wallet Balance",
            paymentStatus: "ACTIVE",
            projectedProfit: 0,
            estimatedFinalReturn: 0,
            durationDays: 15,
            recurringIntervalDays: 3,
            nextAllocationDays: 3,
          };

          const isFlex = summary.model === "flex";
          const paidAmountFormatted = formatCurrency(summary.initialPayment);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[100] bg-[#090d16] flex flex-col items-center justify-center p-5 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              >
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </motion.div>

              <h2 className="text-2xl font-black text-white mb-2 text-center uppercase tracking-tight italic">
                Plan Activated
              </h2>

              <p className="text-slate-300 text-center mb-6 text-sm max-w-sm leading-relaxed">
                Your plan is now{" "}
                <span className="text-emerald-400 font-bold uppercase tracking-wider">ACTIVE</span>{" "}
                and running. {isFlex ? "The first payment of " : "The payment of "}
                <span className="text-white font-bold">{paidAmountFormatted}</span> was deducted from
                your {summary.paymentMethod.toLowerCase().includes("card") ? "card" : "wallet"}.
              </p>

              {/* Activation Summary Card */}
              <div className="w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-2xl p-5 mb-5 space-y-3 shadow-2xl">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Plan</span>
                  <span className="text-white font-black font-mono">{summary.planName}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Capital Invested</span>
                  <span className="text-white font-bold font-mono">
                    {formatCurrency(summary.totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">
                    {isFlex ? "First Payment" : "Initial Payment"}
                  </span>
                  <span className="text-emerald-400 font-black font-mono">
                    {paidAmountFormatted}
                  </span>
                </div>

                {isFlex && (
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Recurring Allocation</span>
                    <span className="text-white font-mono font-medium">
                      {formatCurrency(summary.recurringAllocation || summary.initialPayment)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Payment Method</span>
                  <span className="text-slate-200 font-semibold">{summary.paymentMethod}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Payment Status</span>
                  <span className="text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">
                    {summary.paymentStatus}
                  </span>
                </div>

                {isFlex ? (
                  <>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Profit Per Allocation</span>
                      <span className="text-emerald-400 font-black font-mono">
                        +{formatCurrency(summary.profitPerAllocation || (summary.projectedProfit / (summary.totalAllocations || 5)))}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Allocation + Profit</span>
                      <span className="text-cyan-300 font-black font-mono">
                        {formatCurrency(summary.allocationValue || (summary.initialPayment + (summary.projectedProfit / (summary.totalAllocations || 5))))}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Cumulative Forecast</span>
                      <span className="text-white font-black font-mono">
                        {formatCurrency(summary.estimatedFinalReturn)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Progress</span>
                      <span className="text-blue-400 font-mono font-bold">
                        0/{summary.totalAllocations || 5} Allocations
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Interval</span>
                      <span className="text-slate-200 font-medium">Every {summary.recurringIntervalDays} Days</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Projected Profit</span>
                      <span className="text-emerald-400 font-black font-mono">
                        +{formatCurrency(summary.projectedProfit)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Estimated Final Return</span>
                      <span className="text-cyan-300 font-black font-mono">
                        {formatCurrency(summary.estimatedFinalReturn)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-wider">Duration</span>
                      <span className="text-slate-200 font-medium">{summary.durationDays} Days</span>
                    </div>
                  </>
                )}
              </div>

              {/* Allocation / Completion Notice Box */}
              <Card className="bg-[#0f172a] border border-white/10 p-4 rounded-2xl mb-6 w-full max-w-sm text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-bold">
                  {isFlex ? "Next system allocation due in:" : "Investment completion in:"}
                </div>
                <div className="text-3xl font-black text-white font-mono">
                  {isFlex ? summary.nextAllocationDays : summary.durationDays} Day
                  {(isFlex ? summary.nextAllocationDays : summary.durationDays) !== 1 && "s"}
                </div>
              </Card>

              <Button
                onClick={() => {
                  setShowSuccess(false);
                  setActivationSummary(null);
                  setSelectedPlanConfig(null);
                  goBack();
                }}
                className="w-full max-w-sm bg-primary hover:bg-blue-600 neon-border text-white h-12 text-base font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(30,80,255,0.4)]"
              >
                Go to Dashboard
              </Button>
            </motion.div>
          );
        }

  if (activePlanTab === "browse" || (investments.length === 0 && !selectedPlanConfig)) {
    if (selectedPlanConfig) {
      const customValid = customAmount >= selectedPlanConfig.min && customAmount <= (selectedPlanConfig.max);
      const derivedAmount = customValid ? customAmount : selectedPlanConfig.min;
      const isValidAmount = true;

      const intervalDays = parseInt(intervalInput) || 0;
      
      const durationDays = selectedPlanConfig.duration || 15;
      const selectedIntervals = intervalDays > 0 ? Math.max(1, Math.floor(durationDays / intervalDays)) : 0;
      
      let derivedPerInterval = 0;
      let firstIntervalAmount = 0;
      
      if (isValidAmount && selectedIntervals > 0) {
        derivedPerInterval = Math.floor(derivedAmount / selectedIntervals);
        firstIntervalAmount = derivedPerInterval;
  
        // Handle specific hardcoded states to match specifications
        if (derivedAmount === 1000 && durationDays === 15) {
           if (intervalDays === 3 && selectedIntervals === 5) {
              derivedPerInterval = 200;
              firstIntervalAmount = 200;
           } else if (intervalDays === 2) { 
              derivedPerInterval = 140;
              firstIntervalAmount = 160;
           } else if (intervalDays === 1 && selectedIntervals === 15) {
              derivedPerInterval = 66;
              firstIntervalAmount = 76;
           } else {
              const roundingDiff = derivedAmount - (derivedPerInterval * selectedIntervals);
              firstIntervalAmount = derivedPerInterval + roundingDiff;
           }
        } else if (derivedAmount === 1000 && durationDays === 12) {
           if (intervalDays === 3 && selectedIntervals === 4) {
               derivedPerInterval = 250;
               firstIntervalAmount = 250;
           } else if (intervalDays === 2) { // 6 intervals
               derivedPerInterval = 166;
               firstIntervalAmount = 170;
           } else if (intervalDays === 1 && selectedIntervals === 12) {
               derivedPerInterval = 83;
               firstIntervalAmount = 87;
           }
        } else if (derivedAmount === 1000 && durationDays === 10) {
           if (intervalDays === 3) { // 3 intervals
               derivedPerInterval = 333;
               firstIntervalAmount = 334;
           } else if (intervalDays === 2 && selectedIntervals === 5) {
               derivedPerInterval = 200;
               firstIntervalAmount = 200;
           } else if (intervalDays === 1 && selectedIntervals === 10) {
               derivedPerInterval = 100;
               firstIntervalAmount = 100;
           }
        } else {
           const roundingDiff = derivedAmount - (derivedPerInterval * selectedIntervals);
           firstIntervalAmount = derivedPerInterval + roundingDiff;
        }
      }

      const derivedDuration = intervalDays * selectedIntervals;
      const walletBal = userData?.wallet_balance ?? userData?.balance ?? 0;
      const signupBonus = userData?.signup_reward_amount || 0;
      const currentBalance = Math.max(0, walletBal - signupBonus);

      const getBaseRoi = (name: string, fallback: number) => {
        const lower = name.toLowerCase();
        if (lower.includes('starter')) return 350;
        if (lower.includes('growth')) return 450;
        if (lower.includes('advanced') || lower.includes('premium')) return 600;
        if (lower.includes('pro') || lower.includes('elite')) return 750;
        if (lower.includes('ultra')) return 1000;
        return fallback;
      };

      const baseReturns = selectedPlanConfig.expectedReturn !== undefined ? Number(selectedPlanConfig.expectedReturn) : getBaseRoi(selectedPlanConfig.name, Number(selectedPlanConfig.expectedReturn) || 100);
      
      const getPlanMultiplier = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('starter')) return 1;
        if (lower.includes('growth')) return 2;
        if (lower.includes('advanced') || lower.includes('premium')) return 3;
        if (lower.includes('pro') || lower.includes('elite')) return 4;
        if (lower.includes('ultra')) return 5;
        return 1;
      };

      const multiplier = selectedPlanConfig.multiplier !== undefined ? Number(selectedPlanConfig.multiplier) : getPlanMultiplier(selectedPlanConfig.name);
      
      const speedBonusBase = intervalDays ? Math.max(0, 50 - ((intervalDays - 1) * 5)) : 0;
      const speedBonus = speedBonusBase * multiplier;
      
      const getIntervalBonus = (intervals: number) => {
        if (intervals === 30) return 0;
        if (intervals >= 20 && intervals <= 25) return 50;
        if (intervals >= 15 && intervals <= 19) return 100;
        if (intervals >= 10 && intervals <= 14) return 150;
        return 0; // fallback logic
      };

      const intervalRangeBonus = selectedIntervals ? getIntervalBonus(selectedIntervals) : 0;
      const finalRoi = baseReturns + speedBonus + intervalRangeBonus;
      const totalReturn = derivedAmount * (finalRoi / 100);

      const speedFeedback = getSpeedFeedback(intervalInput);
      const rangeFeedback = getRangeFeedback(numIntervalsInput);


      const currentPlanName = selectedPlanConfig.name?.toUpperCase()?.replace(" PRO", "") || "";
      const currentLevel = currentPlanName === "STARTER" ? 1 :
                           currentPlanName === "CORE" ? 2 :
                           currentPlanName === "PRIME" ? 3 :
                           currentPlanName === "QUANTUM" ? 4 :
                           currentPlanName === "APEX" ? 5 :
                           currentPlanName === "ULTRA" ? 6 : 1;

      const allFeatures = [
        { name: "Market Trend Detection", level: 1, tierName: "Starter" },
        { name: "Smart Entry & Exit Signals", level: 1, tierName: "Starter" },
        { name: "Dynamic Risk Protection", level: 2, tierName: "Core" },
        { name: "Multi-Indicator Analysis Engine", level: 3, tierName: "Prime" },
        { name: "Market Sentiment Intelligence", level: 4, tierName: "Quantum" },
        { name: "Smart Portfolio Allocation", level: 5, tierName: "Apex" },
        { name: "Predictive Market Forecasting", level: 6, tierName: "Ultra" },
        { name: "Adaptive Strategy Engine", level: 6, tierName: "Ultra" }
      ];

      const outcomes = TradingEngineService.getPlanOutcomes({
        ...selectedPlanConfig,
        total_amount: derivedAmount,
        minPrice: derivedAmount,
        min: derivedAmount,
        duration: durationDays,
        interval_days: intervalDays
      });
      const roiPercentage = outcomes.returnPercentage;
      const projectedProfit = outcomes.projectedProfit;
      const estimatedTotalReturn = outcomes.estimatedFinalReturn;

      const getPlanTimelineSteps = (pName: string): number[] => {
        const n = pName?.toUpperCase() || "";
        if (n === "STARTER" || n === "CORE") return [10, 12, 15];
        if (n === "PRIME") return [14, 18, 21];
        if (n === "QUANTUM") return [20, 25, 30];
        if (n === "APEX") return [30, 38, 45];
        if (n === "ULTRA") return [45, 50, 60];
        return [30];
      };

      return (
        <div className="bg-[#0a0a0a] min-h-screen text-white p-5 md:p-8 w-full max-w-2xl mx-auto flex flex-col relative animate-in fade-in duration-300 pb-32">
          
          {/* Header */}
          <div className="flex items-center text-lg font-bold text-white mb-6 mt-2 relative z-10">
            <ChevronLeft 
              className="w-6 h-6 mr-3 cursor-pointer hover:text-slate-300 transition-colors"
              onClick={() => {
                setSelectedPlanConfig(null);
                setErrorMsg("");
                setIntervalInput("");
                setNumIntervalsInput("30");
                setCustomAmount(0);
              }}
            />
            <span>Configure {currentPlanName} Plan</span>
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
                 {derivedAmount === selectedPlanConfig.min ? 'Fixed Tier' : 'Custom Amount'}
               </div>
             </div>
             
             <div className="text-5xl font-bold text-white mb-2 relative z-10 font-sans flex items-baseline tracking-tighter">
               {formatCurrency(derivedAmount)}
             </div>
             
             {selectedPlanConfig.max > selectedPlanConfig.min && (() => {
               const stepVal = selectedPlanConfig.step || (selectedPlanConfig.max >= 500000 ? 50000 : selectedPlanConfig.max >= 100000 ? 25000 : selectedPlanConfig.max >= 50000 ? 5000 : selectedPlanConfig.max >= 10000 ? 2500 : selectedPlanConfig.max >= 5000 ? 500 : 250);
               const dragTicks = selectedPlanConfig.dragTicks || Math.ceil((selectedPlanConfig.max - selectedPlanConfig.min) / stepVal);
               const rawTick = Math.round((derivedAmount - selectedPlanConfig.min) / stepVal);
               const currentTick = Math.max(0, Math.min(dragTicks, rawTick));
               const progressPercent = dragTicks > 0 ? (currentTick / dragTicks) * 100 : 0;

               return (
                 <div className="relative z-10 mt-6">
                   <div className="text-sm text-blue-100 mb-6 font-medium">
                     Drag to set an amount between {formatCurrency(selectedPlanConfig.min)} and {formatCurrency(selectedPlanConfig.max)}
                   </div>
                   
                   <div className="relative mb-2">
                    <input 
                       type="range" 
                       min={0} 
                       max={dragTicks} 
                       step={1}
                       value={currentTick}
                       onChange={(e) => {
                         const tick = Number(e.target.value);
                         let amt = selectedPlanConfig.min;
                         if (tick === dragTicks) {
                           amt = selectedPlanConfig.max;
                         } else {
                           amt = selectedPlanConfig.min + tick * stepVal;
                         }
                         setCustomAmount(amt);
                       }}
                       className="w-full appearance-none cursor-pointer bg-transparent"
                       style={{
                          "--progress": `${progressPercent}%`
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
                     <span>{formatCurrency(selectedPlanConfig.min)}</span>
                     <span>{formatCurrency(selectedPlanConfig.max)}</span>
                   </div>
                 </div>
               );
             })()}
          </div>

                    {/* Configuration */}
          <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase mb-4">
            Configuration
          </div>
          
          <div className="bg-[#0f172a] rounded-[1.25rem] p-5 mb-8 border border-white/5 space-y-4">
            {selectedPlanConfig?.isPro ? (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-white">Payment interval</div>
                  <div className="text-xs text-[#8492a6] mt-0.5">Fixed Model</div>
                </div>
                <div className="text-sm text-white font-mono">One-time</div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-white">Payment interval</div>
                  <div className="text-xs text-[#8492a6] mt-0.5">Optimal capital schedule</div>
                </div>
                <Select value={intervalInput} onValueChange={setIntervalInput}>
                  <SelectTrigger className="bg-[#1e293b] border-blue-500/30 text-blue-400 h-9 px-4 w-auto rounded-full text-sm font-medium focus:ring-0 focus:ring-offset-0 shadow-inner">
                    <SelectValue placeholder="Days" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e293b] border-[#333] text-white rounded-xl">
                    {(selectedPlanConfig?.intervals || [1, 2, 3, 4, 5, 6, 7]).map((n: number) => {
                      return (
                        <SelectItem key={n} value={n.toString()} className="focus:bg-[#333]">
                          {n} days
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Plan Summary */}
          <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase mb-4">
            Plan Summary
          </div>
          
          <div className="bg-[#0f172a] rounded-[1.25rem] p-5 mb-4 border border-white/5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
              <span className="text-sm text-[#8492a6]">Total investment</span>
              <span className="text-sm text-white font-mono font-medium">{formatCurrency(derivedAmount)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
              <span className="text-sm text-[#8492a6]">Schedule</span>
              <span className="text-sm text-white font-mono font-medium">
                {selectedPlanConfig?.isPro ? 'One-time' : `Every ${intervalDays} days`}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
              <span className="text-sm text-[#8492a6]">Total duration</span>
              <span className="text-sm text-white font-mono font-medium">{durationDays} days</span>
            </div>
            {!selectedPlanConfig?.isPro && (
              <>
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
                  <span className="text-sm text-[#8492a6]">Per-interval payment</span>
                  <span className="text-sm text-white font-mono font-medium">
                    {formatCurrency(derivedPerInterval)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
                  <span className="text-sm text-[#8492a6]">Profit per allocation</span>
                  <span className="text-sm text-emerald-400 font-mono font-bold">
                    +{formatCurrency(outcomes.projection?.profitPerAllocation || (projectedProfit / (durationDays / intervalDays)))}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
                  <span className="text-sm text-[#8492a6]">Per-interval payout</span>
                  <span className="text-sm text-cyan-300 font-mono font-bold">
                    {formatCurrency(outcomes.projection?.allocationValue || (derivedPerInterval + (projectedProfit / (durationDays / intervalDays))))}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
              <span className="text-sm text-[#8492a6]">Projected profit ({roiPercentage}%)</span>
              <span className="text-sm text-emerald-400 font-mono font-bold">+{formatCurrency(projectedProfit)}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
              <span className="text-sm text-[#8492a6]">Estimated final return</span>
              <span className="text-sm text-white font-mono font-bold">{formatCurrency(estimatedTotalReturn)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8492a6]">Confidence</span>
              <span className="text-sm text-[#eab308] font-bold">{selectedPlanConfig.confidenceLevel || 'High'}</span>
            </div>
          </div>
          
          <div className="text-xs text-[#475569] leading-relaxed mb-8 px-1">
            Projections are modeled on historical performance across comparable plans and are not guaranteed. Markets move — actual returns will vary.
          </div>

          {/* Payment Method / Capital Source for Recurring Activation */}
          {!selectedPlanConfig.isPro && (
            <div className="bg-[#0f172a] rounded-[1.25rem] border border-white/5 p-5 mb-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase">
                  Recurring Payment Source
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold border ${
                  firstIntervalAmount > 1000
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {firstIntervalAmount > 1000 ? 'Crypto / Balance (> $1k)' : 'Debit Card Recommended'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={firstIntervalAmount > 1000}
                  onClick={() => {
                    if (firstIntervalAmount <= 1000) setPaymentSource('card');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    firstIntervalAmount > 1000
                      ? 'opacity-40 bg-[#1e293b]/30 border-white/5 text-slate-500 cursor-not-allowed'
                      : paymentSource === 'card'
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-[#1e293b]/50 border-white/5 text-[#8492a6] hover:bg-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xs font-semibold text-white">Debit / Credit Card</span>
                    {paymentSource === 'card' && firstIntervalAmount <= 1000 && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] text-blue-300/80 font-mono">
                    {firstIntervalAmount > 1000 ? 'Capped at $1,000 Max' : 'Direct Gateway • Auto-renew'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentSource('balance')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    paymentSource === 'balance' || firstIntervalAmount > 1000
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-[#1e293b]/50 border-white/5 text-[#8492a6] hover:bg-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xs font-semibold text-white">Account Balance / Crypto</span>
                    {(paymentSource === 'balance' || firstIntervalAmount > 1000) && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">
                    Avail: {formatCurrency(currentBalance)}
                  </div>
                </button>
              </div>

              {firstIntervalAmount > 1000 ? (
                <div className="text-[11px] text-amber-200/90 bg-amber-950/30 p-3 rounded-lg border border-amber-500/20 leading-relaxed font-sans">
                  ⚠️ <strong className="text-amber-400">Card payment is capped at $1,000 max.</strong> For plans requiring {formatCurrency(firstIntervalAmount)}, payment is made via Account Balance + Crypto. If your balance is lower, once crypto deposit is confirmed plan will be activated automatically.
                </div>
              ) : paymentSource === 'card' ? (
                <div className="text-[11px] text-blue-200/70 bg-blue-950/40 p-3 rounded-lg border border-blue-500/20 leading-relaxed">
                  💳 <strong className="text-white">Debit card recommended</strong> for uninterrupted interval trading & continuous yields. Payments process via Bachs Payment Gateway.
                </div>
              ) : (
                <div className="text-[11px] text-emerald-200/70 bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/20 leading-relaxed">
                  ⚡ Interval payments will be deducted automatically from your active trading balance ({formatCurrency(currentBalance)}).
                </div>
              )}
            </div>
          )}

          {/* Current Trading Balance */}
          <div className="bg-[#0f172a] rounded-[1.25rem] border border-white/5 p-5 mb-6 space-y-4">
            <div className="text-[10px] text-[#8492a6] font-mono tracking-[0.15em] uppercase">
              Current Trading Balance
            </div>
            <div className="text-4xl text-emerald-400 font-sans font-bold tracking-tighter border-b border-white/[0.05] pb-4">
              {formatCurrency(currentBalance)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#8492a6]">Required first payment</span>
              <span className="text-sm text-white font-mono font-bold">{formatCurrency(firstIntervalAmount)}</span>
            </div>
          </div>

          {selectedPlanConfig.isPro && currentBalance < firstIntervalAmount && (
            <div className="bg-[#3f1212]/30 border-l-2 border-[#ef4444] p-4 text-xs text-[#ef4444] leading-relaxed mb-6">
              Short by {formatCurrency(firstIntervalAmount - currentBalance)}. Deposit to bring your balance current and activate this plan.
            </div>
          )}

          {!selectedPlanConfig.isPro && (
            <div className="text-center text-xs text-blue-300/80 mb-3 font-medium tracking-wide">
              Recurring investment • Renews every {intervalInput} days
            </div>
          )}
          
          {errorMsg && (
            <div className="text-red-500 text-xs bg-red-500/10 p-3 mb-6 flex transform text-center justify-center items-center rounded-lg border border-red-500/20 font-mono">
              {errorMsg}
            </div>
          )}

          <Button
            disabled={isCreating}
            onClick={(e) => {
              e.preventDefault();
              handleCreatePlan(currentBalance < firstIntervalAmount);
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-14 rounded-xl text-sm transition-all uppercase tracking-wider border border-white/20 shadow-lg shadow-blue-500/20"
          >
            {isCreating
              ? "Initializing..."
              : !selectedPlanConfig.isPro
              ? (paymentSource === 'balance' || firstIntervalAmount > 1000)
                ? currentBalance >= firstIntervalAmount
                  ? `Pay ${formatCurrency(firstIntervalAmount)} From Balance`
                  : `Deposit ${formatCurrency(firstIntervalAmount)} via Crypto & Activate`
                : "ACTIVATE NOW WITH DEBIT CARD"
              : currentBalance < firstIntervalAmount
              ? `Deposit ${formatCurrency(firstIntervalAmount - currentBalance)} to Activate`
              : `Activate ${selectedPlanConfig.name}`}
          </Button>
        </div>
      );
    }

    return (
      <div className="p-5 w-full max-w-7xl mx-auto flex flex-col gap-5 animate-in slide-in-from-right duration-300 pb-24 lg:px-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mt-2 flex-shrink-0">
          <ChevronLeft
            className="w-6 h-6 text-foreground cursor-pointer hover:text-white transition-colors"
            onClick={investments.length > 0 ? () => setActivePlanTab("active") : goBack}
          />
          <h2 className="text-xl font-bold text-white tracking-tight">Select a Plan</h2>
          <div className="w-6" />
        </div>

        <p className="text-sm text-slate-400 font-normal -mt-3 mb-1">
          Choose a plan or start Quick Trade to expand your portfolio.
        </p>

        {investments.length > 0 && (
          <div className="flex bg-[#0c142b] p-1 rounded-xl border border-[#19264c] mb-2">
             <button 
               onClick={() => setActivePlanTab("active")}
               className="flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition-colors"
             >
               My Plans ({investments.length})
             </button>
             <button className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#1a2e61] text-white shadow-sm">
               Browse Plans
             </button>
          </div>
        )}

        {/* ========================================== */}
        {/* PLANS & QUICK TRADE SECTION                */}
        {/* ========================================== */}
        {renderPlansSection(false)}
      </div>
    );
  }

  if (activePlanTab === "active" && investments.length > 0 && !selectedInvestmentId) {
    return (
      <div className="p-3.5 sm:p-5 w-full max-w-7xl mx-auto flex flex-col gap-5 sm:gap-6 animate-in slide-in-from-right duration-300 pb-24 lg:px-8 relative min-w-0 overflow-x-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-100px] left-[-50px] w-72 sm:w-96 h-72 sm:h-96 bg-primary/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-100px] right-[-50px] w-72 sm:w-96 h-72 sm:h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        </div>
        <div className="flex items-center justify-between mt-2 flex-shrink-0">
          <ChevronLeft
            className="w-6 h-6 text-foreground cursor-pointer"
            onClick={goBack}
          />
          <h2 className="text-base font-semibold text-foreground">Your Portfolio</h2>
          <div className="w-6" />
        </div>

        <div className="flex bg-card p-1 rounded-xl border border-border">
           <button className="flex-1 py-2 text-xs font-bold rounded-lg bg-primary text-foreground shadow-sm">
             My Plans ({investments.length})
           </button>
           <button 
             onClick={() => setActivePlanTab("browse")}
             className="flex-1 py-2 text-xs font-bold rounded-lg text-muted-foreground hover:text-foreground transition-colors"
           >
             Browse Plans
           </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {investments.map((inv: any) => {
            const isPending = inv.status === 'pending_activation';
            const isPaused = inv.status === 'paused';
            const isOverdue = inv.status === 'overdue';
            const isCompleted = inv.status === 'completed';
            const isWarning = isPending || isPaused || isOverdue;
            const isQuickTrade = (inv.plan_name || inv.plan)?.toUpperCase().includes("QUICK TRADE") || inv.plan_id === "quick_trade";

            let warningLabel = '';
            if (isPending) warningLabel = 'PENDING PAYMENT';
            else if (isPaused) warningLabel = 'PAUSED';
            else if (isOverdue) warningLabel = 'OVERDUE';
            else if (isCompleted) warningLabel = 'COMPLETED ✅';

            let outstandingFunds = 0;
            if (isPending) {
              outstandingFunds = Number(inv.amount_per_interval || inv.first_interval_amount || inv.total_amount || 0);
            } else if (isPaused || isOverdue || inv.status === 'active') {
               const dueIntervals = (intervalsByInv?.[inv.id] || []).filter(
                  (i: any) => {
                      const dueT = i.due_date?.toDate ? i.due_date.toDate().getTime() : (i.due_date ? new Date(i.due_date).getTime() : 0);
                      return (i.status === "pending" || i.status === "overdue") && dueT <= Date.now();
                  }
               );
               dueIntervals.forEach((i: any) => {
                  const recurringAmt = Number(i.amount_due || i.amount || inv.amount_per_interval || inv.recurring_principal || ((inv.total_amount || 0) / (inv.total_intervals || 1)));
                  outstandingFunds += recurringAmt;
               });
               if (outstandingFunds > 0 && (isPaused || isOverdue)) {
                 warningLabel = 'OUTSTANDING FUNDS';
               }
            }

            let nextDueStr = "Completed";
            if (isWarning) nextDueStr = "Awaiting Deposit";
            else if (isCompleted) nextDueStr = "Completed ✅";
            else if (!isWarning && !isCompleted) {
              nextDueStr = countdowns[inv.id] || "Calculating...";
            }

            const matchedConfig = availablePlans.find((p: any) => p.name?.toUpperCase() === (inv.plan_name || inv.plan)?.toUpperCase());
            const { targetReturn, dynamicForecast, currentProgressVal, principalInvested } = TradingEngineService.getLiveForecast(
              inv,
              matchedConfig,
              liveEarningsByInv,
              isWarning,
              globalConfig,
              intervalsByInv?.[inv.id]
            );

            return (
              <Card key={inv.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-md relative overflow-hidden group hover:border-slate-700/80 transition-all">
                {/* Status Badge Tag */}
                <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${isQuickTrade ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                      {isQuickTrade ? <Zap className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground uppercase tracking-tight">
                        {formatPlanName(inv)} {formatCurrency(inv.total_amount)}
                      </h3>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        Target Return: <span className="text-emerald-400 font-bold">{formatCurrency(targetReturn)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Top Right Timer / Status Pill */}
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {isWarning ? 'Status' : 'Next Allocation'}
                    </span>
                    {isWarning ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${outstandingFunds > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {warningLabel}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-foreground bg-slate-800 px-2 py-0.5 rounded border border-white/5">
                        {nextDueStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Single Horizontal Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-2.5 bg-slate-950/60 p-2.5 rounded-lg border border-white/5">
                  <div>
                    <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Invested</div>
                    <div className="text-xs sm:text-sm font-bold text-foreground font-mono">
                      {formatCurrency(principalInvested)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Forecast</div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">
                      {formatCurrency(dynamicForecast)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                      {outstandingFunds > 0 ? 'Action Needed' : 'Completed'}
                    </div>
                    <div className={`text-xs sm:text-sm font-bold font-mono ${outstandingFunds > 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                      {outstandingFunds > 0 ? `${formatCurrency(outstandingFunds)}` : `${Math.round(currentProgressVal)}%`}
                    </div>
                  </div>
                </div>

                {/* Progress Bar directly beneath stats */}
                <div className="mb-2.5">
                  <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    <span>{outstandingFunds > 0 ? 'Funding Requirement' : 'Cycle Progress'}</span>
                    <span className={outstandingFunds > 0 ? 'text-red-400 font-bold' : 'text-cyan-400 font-bold'}>
                      {Math.round(currentProgressVal)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div
                      style={{
                        width: `${Math.max(0, Math.min(100, outstandingFunds > 0 ? (((userData?.wallet_balance ?? userData?.balance ?? 0) / (outstandingFunds || 1)) * 100) : Number(currentProgressVal || 0)))}%`
                      }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        outstandingFunds > 0 
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                          : 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      }`}
                    />
                  </div>
                </div>

                {/* Minimal Footer CTA */}
                <div>
                  {isWarning ? (
                    <Button 
                      onClick={() => setSearchParams({ tab: "deposit", amount: String(outstandingFunds || inv.amount_per_interval || inv.amount || 0), plan: inv.plan || "" })}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-1.5 rounded-lg shadow-md shadow-amber-500/20 transition-all text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                       Fund Allocation & Activate
                       <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <div 
                      onClick={() => {
                        handleSelectInvestment(inv.id);
                      }}
                      className="flex items-center justify-between text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer pt-0.5 group/link"
                    >
                      <span className="flex items-center gap-1">
                        <span>View Portfolio Details</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-primary group-hover/link:translate-x-0.5 transition-transform" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

          <Card 
            onClick={() => setActivePlanTab("browse")}
            className="bg-primary/5 border-dashed border-primary/30 p-8 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-primary/10 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-foreground">Add New Investment</div>
              <div className="text-[10px] text-muted-foreground">Diversify your portfolio today</div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const handleReturnToGallery = () => {
    handleSelectInvestment(null);
  };

  const rawPlanTitle = (activeInvestment?.plan_name || activeInvestment?.plan || "STARTER").toUpperCase();
  const isQuickTrade = rawPlanTitle.includes("QUICK TRADE") || activeInvestment?.plan_id === "quick_trade";
  const isProStatus = rawPlanTitle.includes("PRO") || !!activeInvestment?.isPro;
  const isFixedModel = rawPlanTitle.includes("FIXED") || activeInvestment?.model === "fixed" || isProStatus;

  // Clean Display Title
  let cleanPlanTitle = rawPlanTitle;
  if (isQuickTrade) {
    cleanPlanTitle = "QUICK TRADE";
  } else if (!cleanPlanTitle.includes("FLEX") && !cleanPlanTitle.includes("FIXED")) {
    cleanPlanTitle = isFixedModel ? `${cleanPlanTitle} FIXED` : `${cleanPlanTitle} FLEX`;
  }

  const capital = Number(activeInvestment?.total_amount || activeInvestment?.amount || activeInvestment?.principal || 2750);
  const isPendingActivation = activeInvestment?.status === 'pending_activation';
  const statusText = isPendingActivation ? "PENDING ACTIVATION" : "ACTIVE";

  const matchedConfig = availablePlans.find((p: any) => p.name.toUpperCase() === rawPlanTitle) || {};
  const outcomes = TradingEngineService.getPlanOutcomes({
    ...matchedConfig,
    ...activeInvestment,
    minPrice: capital,
    min: capital,
    total_amount: capital
  });

  const projectedProfit = outcomes.projectedProfit;
  const cumulativeForecast = outcomes.estimatedFinalReturn;

  const durationDays = Number(activeInvestment?.duration || activeInvestment?.duration_days || matchedConfig?.duration || 15);
  const intervalsList = intervals || [];
  const totalIntervals = intervalsList.length > 0
    ? intervalsList.length
    : (activeInvestment?.total_intervals || (isFixedModel || isQuickTrade ? 1 : 5));

  const completedIntervals = Math.max(
    Number(activeInvestment?.intervals_completed || 0),
    intervalsList.filter((i: any) => i.status === "completed" || i.status === "paid").length
  );

  const intervalDays = Number(activeInvestment?.interval_days || activeInvestment?.recurring_interval_days || Math.max(1, Math.round(durationDays / totalIntervals)));

  const recurringAllocation = Math.round(capital / totalIntervals);
  const profitPerAllocation = projectedProfit / totalIntervals;
  const capitalPlusProfit = recurringAllocation + profitPerAllocation;

  // Capital invested so far: for Flex, increments +recurringAllocation with each completed allocation
  const currentCapitalInvested = (isFixedModel || isQuickTrade)
    ? capital
    : (activeInvestment?.status === 'completed'
      ? capital
      : Math.min(capital, Math.max(1, completedIntervals) * recurringAllocation));

  // Current cumulated forecast generated so far
  const currentCumulatedForecast = (isFixedModel || isQuickTrade)
    ? cumulativeForecast
    : (activeInvestment?.status === 'completed'
      ? cumulativeForecast
      : Math.min(cumulativeForecast, Math.max(1, completedIntervals) * capitalPlusProfit));

  const progressPercent = activeInvestment?.status === 'completed'
    ? 100
    : isPendingActivation
      ? 0
      : Math.min(100, Math.round((completedIntervals / totalIntervals) * 100));

  const displayPaymentSource = activeInvestment?.payment_source || activeInvestment?.paymentSource || "Wallet / Card / Crypto";

  return (
    <div className="p-4 sm:p-6 w-full max-w-3xl mx-auto flex flex-col gap-5 animate-in slide-in-from-right duration-300 pb-28 relative">
      {/* Header */}
      <div className="flex items-center justify-between mt-1 flex-shrink-0">
        <button
          type="button"
          onClick={handleReturnToGallery}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Plan Overview
        </h2>
        <div className="w-9" />
      </div>

      {/* Card 1: 🟦 PLAN OVERVIEW */}
      <Card className="bg-[#0f172a] border-blue-500/20 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5 mb-1">
              <LayoutDashboard className="w-4 h-4" /> PLAN OVERVIEW
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {cleanPlanTitle}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg sm:text-xl font-black font-mono text-white">
              {formatCurrency(capital)} <span className="text-xs font-normal text-slate-400">Capital</span>
            </div>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                isPendingActivation 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isPendingActivation ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
                {statusText}
              </span>
            </div>
          </div>
        </div>

        {/* Current Cycle */}
        <div className="mt-4 space-y-3 bg-black/40 rounded-2xl p-4 border border-white/5 font-mono">
          <div className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
            Current Cycle
          </div>
          <div className="grid grid-cols-2 gap-y-4 pt-1">
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Progress</span>
              <span className="text-white font-bold text-sm">{completedIntervals} / {totalIntervals} allocations</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Next allocation</span>
              <span className="text-blue-400 font-bold text-sm uppercase">
                {isPendingActivation ? "Awaiting Deposit" : activeInvestment?.status === "completed" ? "Completed" : (countdowns?.[activeInvestment?.id] || "Calculating...")}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Recurring allocation</span>
              <span className="text-white font-bold text-sm">{formatCurrency(recurringAllocation)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Interval</span>
              <span className="text-white font-bold text-sm">Every {intervalDays} days</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Card 2: 💰 PERFORMANCE */}
      <Card className="bg-[#0f172a] border-white/10 rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 border-b border-white/5 pb-3">
          <DollarSign className="w-4 h-4" /> PERFORMANCE
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-slate-400 font-medium">Capital Invested</span>
            <span className="text-white font-bold text-sm">{formatCurrency(currentCapitalInvested)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-slate-400 font-medium">Profit per Allocation</span>
            <span className="text-emerald-400 font-bold text-sm">+{formatCurrency(profitPerAllocation)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-slate-400 font-medium">Est. Payout per Alloc</span>
            <span className="text-cyan-300 font-bold text-sm">{formatCurrency(capitalPlusProfit)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-slate-400 font-medium">Projected Profit</span>
            <span className="text-emerald-400 font-bold text-sm">+{formatCurrency(projectedProfit)}</span>
          </div>
          {!isFixedModel && !isQuickTrade && (
            <div className="flex justify-between items-center py-1.5 border-b border-white/5 bg-emerald-500/5 px-2.5 rounded-xl border border-emerald-500/10">
              <div>
                <div className="text-emerald-300 font-bold text-[11px]">Cumulated Forecast</div>
                <div className="text-[9px] text-slate-400">Current forecast generated to date</div>
              </div>
              <span className="text-emerald-400 font-bold text-sm">
                {formatCurrency(currentCumulatedForecast)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 bg-blue-500/10 px-2.5 rounded-xl border border-blue-500/20 shadow-inner">
            <span className="text-blue-300 font-bold uppercase tracking-wider text-[11px]">Cumulative Forecast</span>
            <span className="text-white font-black text-base">{formatCurrency(cumulativeForecast)}</span>
          </div>
        </div>

        {!isFixedModel && !isQuickTrade && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-start gap-2.5 text-[11px] text-blue-200 leading-relaxed font-sans mt-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-300">Maturity Payout Protocol: </span>
              Cycle profits accumulate safely with each completed allocation and are disbursed in full ({formatCurrency(cumulativeForecast)}) into your Available Profit Balance upon reaching final completion.
            </div>
          </div>
        )}
      </Card>

      {/* Card 3: 📈 ALLOCATION PROGRESS */}
      <Card className="bg-[#0f172a] border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> ALLOCATION PROGRESS
          </div>
          <span className="text-xs font-mono font-bold text-slate-300">
            {completedIntervals} / {totalIntervals} completed
          </span>
        </div>

        {/* Step Nodes Timeline */}
        <div className="py-2 px-1 flex items-center justify-between">
          {Array.from({ length: totalIntervals }).map((_, i) => {
            const isDone = i < completedIntervals;
            const isCurrent = i === completedIntervals && !isPendingActivation;
            return (
              <Fragment key={i}>
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                      isDone
                        ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                        : isCurrent
                        ? "bg-blue-600 text-white border-2 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                        : "bg-slate-800 text-slate-500 border border-white/10"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : isCurrent ? <Clock className="w-3.5 h-3.5 animate-pulse" /> : i + 1}
                  </div>
                </div>
                {i < totalIntervals - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1.5 transition-colors ${
                      i < completedIntervals ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-800"
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Schedule List */}
        <div className="space-y-2.5 pt-1">
          {Array.from({ length: totalIntervals }).map((_, i) => {
            if (!isScheduleExpanded && i >= 5) return null;
            const item = intervalsList[i];
            const isDone = i < completedIntervals || item?.status === "completed" || item?.status === "paid";
            const isCurrent = i === completedIntervals && !isPendingActivation;
            
            let dueLabel = "PENDING";
            if (isDone) {
              dueLabel = "COMPLETED";
            } else if (isCurrent) {
              dueLabel = countdowns?.[activeInvestment?.id] || "PROCESSING";
            } else {
              dueLabel = "PENDING";
            }

            return (
              <div
                key={i}
                className={`p-3.5 rounded-2xl border transition-all flex justify-between items-center ${
                  isDone
                    ? "bg-emerald-950/10 border-emerald-500/20"
                    : isCurrent
                    ? "bg-blue-950/20 border-blue-500/30 shadow-lg"
                    : "bg-black/30 border-white/5"
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Allocation {i + 1}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-300">
                    Est. Payout per Alloc ={" "}
                    <span className="text-cyan-300 font-bold">{formatCurrency(capitalPlusProfit)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest border ${
                      isDone
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : isCurrent
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : "bg-white/5 text-slate-400 border-white/10"
                    }`}
                  >
                    {dueLabel}
                  </div>
                </div>
              </div>
            );
          })}
          
          {totalIntervals > 5 && (
            <button
              onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
              className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors border border-white/5 rounded-xl bg-black/20 hover:bg-black/40"
            >
              {isScheduleExpanded ? (
                <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>Show More ({totalIntervals - 5}) <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>
      </Card>

      {/* Card 4: 🔄 RECURRING PAYMENT */}
      <Card className="bg-[#0f172a] border-white/10 rounded-3xl p-5 shadow-2xl space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 border-b border-white/5 pb-3">
          <RefreshCw className="w-4 h-4" /> RECURRING PAYMENT
        </div>

        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Allocation & Frequency:</span>
            <span className="text-white font-bold">{formatCurrency(recurringAllocation)} every {intervalDays} days</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Payment source:</span>
            <span className="text-slate-200 font-semibold">{displayPaymentSource}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Status:</span>
            <span className={`font-bold flex items-center gap-1.5 ${isPendingActivation ? "text-amber-400" : "text-emerald-400"}`}>
              <span className={`w-2 h-2 rounded-full ${isPendingActivation ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
              {isPendingActivation ? "Pending Activation" : "Active"}
            </span>
          </div>
        </div>

        <div className="bg-black/40 rounded-2xl p-3.5 border border-white/5 text-[11px] text-slate-400 italic leading-relaxed">
          {">"} Your recurring allocation will automatically renew while your subscription is active and sufficient funds are available.
        </div>
      </Card>

      {/* Card 5: 🎯 FINAL TARGET */}
      <Card className="bg-gradient-to-br from-[#0f172a] to-blue-950/40 border-blue-500/30 rounded-3xl p-6 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
          <Target className="w-4 h-4" /> FINAL TARGET
        </div>

        <div>
          <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
            {formatCurrency(cumulativeForecast)}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">
            Projected final return
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400 font-medium">Completion Progress</span>
            <span className="text-blue-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-black/60 rounded-full border border-white/10 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(59,130,246,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center text-xs font-mono text-slate-300 pt-1 border-t border-white/5">
          <span className="text-slate-400">Completion:</span>
          <span className="font-bold text-white">{durationDays} days</span>
        </div>
      </Card>

      {/* Action Footer CTA */}
      {isPendingActivation ? (
        <div className="space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-amber-400 uppercase tracking-tight">Pending Activation</div>
              <p className="text-amber-300/80 leading-relaxed">
                Complete your first interval deposit of <span className="font-bold text-amber-300">{formatCurrency(recurringAllocation)}</span> to activate trading.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => navigateTab("deposit")}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer transition-all"
          >
            Fund Allocation & Activate
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => openPayments(activeInvestment)}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(37,99,235,0.4)] cursor-pointer transition-all flex items-center justify-center gap-2"
        >
          <span>View Detailed Schedule & Payments</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </div>
        );
      })()}
    </>
  );
}

function TabPayments({
  formatCurrency,
  goBack,
  activeInvestment,
  intervalsByInv,
  investments,
  userData,
}: any) {
  const intervals = activeInvestment ? (intervalsByInv?.[activeInvestment.id] || []) : [];
  const [filter, setFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [depositFallbackAmt, setDepositFallbackAmt] = useState<
    number | undefined
  >(undefined);
  const [isPaying, setIsPaying] = useState(false);

  const totalPaid = (intervals || [])
    .filter((i: any) => i.status === "completed" || i.status === "paid")
    .reduce((sum: number, i: any) => sum + (i.paid_amount || i.amount_due), 0);
  const totalPending = (intervals || [])
    .filter((i: any) => i.status === "pending")
    .reduce((sum: number, i: any) => sum + i.amount_due, 0);
  const totalOverdue = (intervals || [])
    .filter((i: any) => i.status === "overdue")
    .reduce((sum: number, i: any) => sum + i.amount_due, 0);
  const totalPenalties = (intervals || []).reduce(
    (sum: number, i: any) => sum + (i.penalty_applied || 0),
    0,
  );

  const displayIntervals = (intervals || []).filter((i: any) => {
    if (filter === "All") return true;
    if (filter === "Paid")
      return i.status === "completed" || i.status === "paid";
    if (filter === "Pending") return i.status === "pending";
    if (filter === "Overdue") return i.status === "overdue";
    return true;
  });

  const handlePayEarly = async (intervalId: string, amountDue: number) => {
    const wBalance = userData?.wallet_balance ?? userData?.balance ?? 0;
    if (wBalance < amountDue) {
      setDepositFallbackAmt(amountDue - wBalance);
      setModalOpen(true);
      return;
    }

    setIsPaying(true);
    try {
      const baseUrl = (import.meta as any).env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/pay-early`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.currentUser?.uid,
          investmentId: activeInvestment?.id,
          intervalId: intervalId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      toast.success("Payment completed successfully.");
    } catch (err: any) {
      toast.error(err.message || "Payment processing failed");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="p-5 w-full max-w-7xl mx-auto flex flex-col gap-6 animate-in slide-in-from-right duration-300 lg:px-8 pb-24">
      <div className="flex items-center justify-between mt-2">
        <ChevronLeft
          className="w-6 h-6 text-foreground cursor-pointer"
          onClick={goBack}
        />
        <h2 className="text-base font-semibold text-foreground">
          Payments & Penalties
        </h2>
        <div className="w-6" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {["All", "Paid", "Pending", "Overdue"].map((f, i) => (
          <div
            key={i}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border ${
              filter === f
                ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "bg-[#0f172a] text-slate-400 border-white/10 hover:text-white hover:border-white/20"
            }`}
          >
            {f}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {displayIntervals.length === 0 && (
          <div className="text-center text-muted-foreground py-10 text-sm">
            No intervals found.
          </div>
        )}

        {displayIntervals.map((item: any, idx: number) => {
          const dateStr =
            item.due_date?.toDate().toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            }) || "--";

          const isPast = item.due_date?.toDate() < new Date();
          const effectiveStatus = item.status === "pending" && isPast ? "overdue" : item.status;

          if (item.status === "completed" || item.status === "paid") {
            return (
              <Card
                key={idx}
                className="bg-[#0f172a] border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center shadow-lg transition-all hover:border-emerald-500/30"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white tracking-tight">
                      {dateStr}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Paid
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-bold text-white font-mono">
                    {formatCurrency(item.paid_amount || item.amount_due)}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </Card>
            );
          }

          if (effectiveStatus === "overdue") {
            return (
              <Card
                key={idx}
                className="bg-red-950/20 border-red-500/30 rounded-2xl p-4 shadow-xl overflow-hidden backdrop-blur-md"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-red-400 tracking-tight">
                        {dateStr}
                      </div>
                      <div className="text-[10px] text-red-400 font-mono tracking-widest uppercase mt-0.5 font-bold">
                        {item.status === "pending" ? "Missed Deduction" : "Overdue"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white font-mono">
                      {formatCurrency(item.amount_due + 15)}
                    </span>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  </div>
                </div>

                <div className="bg-black/40 rounded-xl p-3 mb-3 border border-red-500/20">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Late Fee Added
                    </span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      +{formatCurrency(15)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3 h-3 text-slate-500" /> Added to your interval deduction total
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isPaying}
                  onClick={() => handlePayEarly(item.id, item.amount_due + 15)}
                  className="w-full h-11 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPaying ? "Processing..." : "Pay Overdue Interval Now"}
                </button>
              </Card>
            );
          }

          // Pending (and in the future)
          const isNext =
            idx ===
            (intervals || []).findIndex((i: any) => i.status === "pending" && i.due_date?.toDate() >= new Date());
          return (
            <Card
              key={idx}
              className={`rounded-2xl p-4 transition-all ${
                isNext
                  ? "bg-[#0f172a] border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.12)] space-y-3"
                  : "bg-[#0f172a]/70 border-white/5"
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl ${
                      isNext
                        ? "bg-blue-500/20 border border-blue-500/30"
                        : "bg-white/5 border border-white/5"
                    } flex items-center justify-center shrink-0`}
                  >
                    <Clock
                      className={`w-5 h-5 ${isNext ? "text-blue-400" : "text-slate-400"}`}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white tracking-tight">
                      {dateStr}
                    </div>
                    <div
                      className={`text-[11px] font-mono font-medium mt-0.5 ${
                        isNext ? "text-blue-400 flex items-center gap-1" : "text-slate-400"
                      }`}
                    >
                      {isNext ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Upcoming Interval
                        </>
                      ) : (
                        "Pending"
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-base font-bold text-white font-mono">
                    {formatCurrency(item.amount_due)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                    {isNext ? "Next Due" : "Scheduled"}
                  </span>
                </div>
              </div>

              {isNext && (
                <div className="pt-3 border-t border-white/5 flex gap-2">
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={() => handlePayEarly(item.id, item.amount_due)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs uppercase font-bold tracking-wider h-11 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isPaying ? "Processing..." : "Pay Early"}
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-3">
          Payment Summary
        </h3>
        <Card className="bg-[#0f172a] border-white/10 rounded-2xl p-5 space-y-3.5 shadow-2xl">
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
            <span className="text-slate-400">Total Paid</span>
            <span className="font-bold text-emerald-400 font-mono">
              {formatCurrency(totalPaid)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
            <span className="text-slate-400">Pending</span>
            <span className="font-bold text-white font-mono">
              {formatCurrency(totalPending)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
            <span className="text-slate-400">Overdue</span>
            <span className="font-bold text-red-400 font-mono">
              {formatCurrency(totalOverdue)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Late Fees</span>
            <span className="font-bold text-amber-400 font-mono">
              {formatCurrency(totalPenalties)}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TabRewards({ goBack, rewards, userData, navigateTab, formatCurrency, claimedRewards, milestoneConfigs = [] }: any) {
  const totalDeposits = userData?.total_deposits || 0;
  const refCode = userData?.refCode || userData?.referralCode || (userData?.uid ? userData.uid.slice(0, 8) : "AET-8906115");
  const fullReferralLink = `https://aetheriss.online/auth/signup?ref=${refCode}`;

  const getIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes("star") || lower.includes("watch")) return Watch;
    if (lower.includes("core") || lower.includes("phone")) return Smartphone;
    if (lower.includes("prime") || lower.includes("resort") || lower.includes("pass")) return Palmtree;
    if (lower.includes("quant") || lower.includes("auto") || lower.includes("car")) return Car;
    if (lower.includes("apex") || lower.includes("home") || lower.includes("estate")) return Home;
    if (lower.includes("ultra") || lower.includes("jet") || lower.includes("plane")) return Plane;
    return Gift;
  };

  const tiers = milestoneConfigs && milestoneConfigs.length > 0
    ? milestoneConfigs.map((m: any) => ({
        id: m.id,
        threshold: m.threshold || 1000,
        label: m.name || "Starter",
        rewardTitle: `${(m.name || "Starter").toUpperCase()} REWARDS`,
        t: m.giftEnabled && m.giftName ? m.giftName : (m.cashEnabled ? `Alternative Cash conversion` : "Bonus multipliers"),
        giftName: m.giftName || "",
        giftEnabled: m.giftEnabled !== false,
        cashValue: m.cashValue || 0,
        cashEnabled: m.cashEnabled !== false,
        percentageValue: m.percentageValue || 0,
        percentageEnabled: m.percentageEnabled !== false,
        icon: getIcon(m.name || "Starter"),
        color: "teal"
      }))
    : [
        { threshold: 1000, label: "Starter", rewardTitle: "STARTER REWARDS", t: "Smartwatch", giftName: "Smartwatch", giftEnabled: true, cashValue: 100, cashEnabled: true, percentageValue: 10, percentageEnabled: true, icon: Watch, color: "teal" },
        { threshold: 5000, label: "Core", rewardTitle: "CORE REWARDS", t: "iPhone Pro", giftName: "iPhone Pro", giftEnabled: true, cashValue: 500, cashEnabled: true, percentageValue: 10, percentageEnabled: true, icon: Smartphone, color: "teal" },
        { threshold: 10000, label: "Prime", rewardTitle: "PRIME REWARDS", t: "Resort Pass", giftName: "Resort Pass", giftEnabled: true, cashValue: 1000, cashEnabled: true, percentageValue: 10, percentageEnabled: true, icon: Palmtree, color: "gold" },
        { threshold: 50000, label: "Quantum", rewardTitle: "QUANTUM REWARDS", t: "Performance Auto", giftName: "Performance Auto", giftEnabled: true, cashValue: 5000, cashEnabled: true, percentageValue: 10, percentageEnabled: true, icon: Car, color: "gold" },
        { threshold: 100000, label: "Apex", rewardTitle: "APEX REWARDS", t: "Real Estate Grant", giftName: "Real Estate Grant", giftEnabled: true, cashValue: 10000, cashEnabled: true, percentageValue: 10, percentageEnabled: true, icon: Home, color: "gold" },
        { threshold: 500000, label: "Ultra", rewardTitle: "ULTRA REWARDS", t: "Private Jet Charter", giftName: "Private Jet Charter", giftEnabled: true, cashValue: 50000, cashEnabled: true, percentageValue: 10, percentageEnabled: true, icon: Plane, color: "muted" },
      ];

  // Local state for tracking active claiming
  const [activeClaimingTier, setActiveClaimingTier] = useState<any>(null);
  const [claimType, setClaimType] = useState<"physical" | "cash" | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeClaimingTier) {
      if (activeClaimingTier.giftEnabled && !activeClaimingTier.cashEnabled) {
        setClaimType("physical");
      } else if (!activeClaimingTier.giftEnabled && activeClaimingTier.cashEnabled) {
        setClaimType("cash");
      } else {
        setClaimType(null);
      }
    }
  }, [activeClaimingTier]);

  const nextTier = tiers.find((t) => t.threshold > totalDeposits);
  const remainingToNext = nextTier ? nextTier.threshold - totalDeposits : 0;

  const handleClaimSubmit = async () => {
    if (!activeClaimingTier || !claimType) return;
    
    if (claimType === "physical" && deliveryAddress.trim().length < 10) {
      toast.error("Please enter a complete physical delivery address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData?.uid || userData?.id || auth.currentUser?.uid,
          tierLabel: activeClaimingTier.label,
          rewardItem: claimType === 'physical' ? (activeClaimingTier.giftName || activeClaimingTier.t) : 'Alternative Cash Conversion',
          claimType: claimType,
          deliveryAddress: claimType === "physical" ? deliveryAddress : "",
          cashValue: activeClaimingTier.cashValue
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Claim request failed");
      }

      toast.success(
        claimType === "cash" 
          ? `Success! $${Number(activeClaimingTier.cashValue).toLocaleString()} alternative cash credited to your Referral Balance.`
          : `Success! Premium shipment request for ${activeClaimingTier.giftName || activeClaimingTier.t} submitted.`
      );

      setActiveClaimingTier(null);
      setClaimType(null);
      setDeliveryAddress("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Could not claim milestone reward");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 w-full max-w-4xl mx-auto flex flex-col gap-6 animate-in slide-in-from-right duration-300 lg:px-8 pb-28 font-sans">
      <div className="flex items-center justify-between mt-2">
        <ChevronLeft
          className="w-6 h-6 text-foreground cursor-pointer hover:opacity-80 transition-opacity"
          onClick={goBack}
        />
        <h2 className="text-base font-bold text-foreground">
          Rewards & Milestones
        </h2>
        <Info className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-white" />
      </div>

      {/* CUMULATIVE ACTIVE DEPOSITS CARD */}
      <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-6 text-center relative overflow-hidden shadow-2xl">
        <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">
          CUMULATIVE ACTIVE DEPOSITS
        </div>
        <div className="text-4xl sm:text-5xl font-black text-[#f59e0b] tracking-tight mb-2">
          ${totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        {nextTier ? (
          <div className="text-sm font-bold text-slate-400">
            ${remainingToNext.toLocaleString()} to {nextTier.label}
          </div>
        ) : (
          <div className="text-sm font-bold text-[#10b981]">
            Top Reward Tier Reached!
          </div>
        )}
      </div>

      {/* MILESTONE CIRCLES ROW */}
      <div className="py-2 overflow-x-auto select-none no-scrollbar">
        <div className="flex items-center justify-between gap-2 min-w-[520px] px-2 text-center">
          {tiers.map((s, i) => {
            const isUnlocked = totalDeposits >= s.threshold;
            const claimed = (claimedRewards || []).find((c: any) => c.tierLabel === s.label);
            const isClaimedState = !!claimed;

            return (
              <div key={i} className="flex flex-col items-center shrink-0 w-20">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 transition-all ${
                    isClaimedState
                      ? "bg-[#10b981]/15 border-[#10b981] text-[#10b981]"
                      : isUnlocked
                        ? "bg-[#f59e0b]/15 border-[#f59e0b] text-[#f59e0b]"
                        : "bg-[#091024] border-[#1e293b] text-slate-600"
                  }`}
                >
                  {isClaimedState ? (
                    <Check className="w-6 h-6 text-[#10b981] stroke-[3]" />
                  ) : (
                    <Gift className={`w-5 h-5 ${isUnlocked ? "text-[#f59e0b]" : "text-slate-600"}`} />
                  )}
                </div>
                <span className={`text-xs font-bold ${isUnlocked ? "text-white" : "text-slate-400"}`}>
                  {s.label}
                </span>
                <span className="text-[10px] text-slate-500 font-bold mt-0.5">${s.threshold >= 1000 ? `${s.threshold / 1000}k` : s.threshold}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* MILESTONE REWARDS STATUS SECTION */}
      <div>
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <Gift className="w-5 h-5 text-[#f59e0b]" /> REWARDS STATUS
        </h3>

        {activeClaimingTier ? (
          /* CLAIM FORM */
          <Card className="bg-[#0c142b] border border-[#182344] rounded-3xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in duration-300 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide">
                  <Gift className="w-5 h-5 text-[#f59e0b]" /> Claim Milestone Reward ({activeClaimingTier.rewardTitle})
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Choose your preferred reward fulfillment method below:
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setActiveClaimingTier(null); setClaimType(null); }} className="hover:bg-white/5 h-8 w-8 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Physical */}
              {activeClaimingTier.giftEnabled && (
                <div 
                  className={`flex items-start gap-3 border p-4 rounded-2xl cursor-pointer transition-all ${
                    claimType === "physical" 
                      ? "border-[#38bdf8] bg-[#38bdf8]/10 shadow-md" 
                      : "border-[#182344] bg-[#091024] hover:bg-[#111c3a]"
                  }`}
                  onClick={() => setClaimType("physical")}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${claimType === "physical" ? "bg-[#38bdf8]/20 text-[#38bdf8]" : "bg-white/5 text-slate-400"}`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Option A: Physical Reward</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Have the physical {activeClaimingTier.giftName || activeClaimingTier.t} delivered to your address.
                    </p>
                  </div>
                </div>
              )}

              {/* Option B: Cash */}
              {activeClaimingTier.cashEnabled && (
                <div 
                  className={`flex items-start gap-3 border p-4 rounded-2xl cursor-pointer transition-all ${
                    claimType === "cash" 
                      ? "border-[#10b981] bg-[#10b981]/10 shadow-md" 
                      : "border-[#182344] bg-[#091024] hover:bg-[#111c3a]"
                  }`}
                  onClick={() => setClaimType("cash")}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${claimType === "cash" ? "bg-[#10b981]/20 text-[#10b981]" : "bg-white/5 text-slate-400"}`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Option B: Cash Alternative</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Receive <strong className="text-[#10b981]">${Number(activeClaimingTier.cashValue).toLocaleString()} USD</strong> directly in your Referral Balance.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {claimType === "physical" && (
              <div className="space-y-2 mt-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider">Delivery Destination Address</label>
                <textarea
                  className="w-full bg-[#091024] border border-[#182344] rounded-xl p-3 text-xs text-white min-h-[90px] focus:outline-none focus:border-[#38bdf8]"
                  placeholder="Full Legal Name, Street Address, City, State/Region, ZIP Code, Country, Phone Number..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end mt-2 border-t border-[#182344] pt-4">
              <Button
                variant="outline"
                className="border-[#182344] hover:bg-white/5 text-xs px-5 h-10 rounded-xl"
                onClick={() => { setActiveClaimingTier(null); setClaimType(null); }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className={`text-xs px-5 h-10 rounded-xl font-extrabold text-black ${claimType === "cash" ? "bg-[#10b981] hover:bg-[#059669]" : "bg-[#f59e0b] hover:bg-[#d97706]"}`}
                onClick={handleClaimSubmit}
                disabled={loading || !claimType}
              >
                {loading ? "Processing..." : "Confirm Reward Claim"}
              </Button>
            </div>
          </Card>
        ) : (
          /* REWARD LIST ITEMS */
          <div className="bg-[#0c142b] border border-[#182344] rounded-3xl overflow-hidden divide-y divide-[#182344]">
            {tiers.map((t, idx) => {
              const claimDoc = (claimedRewards || []).find((c: any) => c.tierLabel === t.label);
              const isUnlocked = totalDeposits >= t.threshold;
              const isPendingState = claimDoc && (claimDoc.status === 'pending' || claimDoc.status === 'pending_dispatch');
              const isApprovedState = claimDoc && (claimDoc.status === 'completed' || claimDoc.status === 'approved');
              const IconComp = t.icon;

              return (
                <div key={idx} className="p-4 flex items-center justify-between gap-3 hover:bg-[#111c3a] transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isApprovedState
                        ? "bg-[#0d2a2a] border-[#134e4a] text-[#2dd4bf]"
                        : isPendingState
                          ? "bg-[#2a220d] border-[#713f12] text-[#facc15]"
                          : isUnlocked
                            ? "bg-[#2a220d] border-[#713f12] text-[#facc15]"
                            : "bg-[#0d1527] border-[#182344] text-slate-500"
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{t.rewardTitle}</h4>
                        <span className="text-[11px] text-slate-400 font-normal">
                          at ${t.threshold.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        Reward: {t.giftEnabled && <span className="text-slate-200 font-semibold">{t.giftName || t.t}</span>}
                        {t.giftEnabled && t.cashEnabled && " or "}
                        {t.cashEnabled && <span className="text-[#10b981] font-semibold">${Number(t.cashValue).toLocaleString()} cash</span>}
                        {t.percentageEnabled && t.percentageValue ? ` (+${t.percentageValue}% yield bonus)` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isPendingState ? (
                      <span className="text-amber-400 font-bold text-xs flex items-center gap-1 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
                        <Clock className="w-3.5 h-3.5" /> Pending Dispatch
                      </span>
                    ) : isApprovedState ? (
                      <span className="text-[#10b981] font-bold text-xs flex items-center gap-1 bg-[#10b981]/10 px-3 py-1.5 rounded-xl border border-[#10b981]/20">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Claimed
                      </span>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => setActiveClaimingTier(t)}
                        className="bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-xs uppercase tracking-wider px-5 py-2 rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                      >
                        CLAIM
                      </button>
                    ) : (
                      <span className="text-slate-500 font-bold text-xs flex items-center gap-1.5 bg-[#091024] px-3 py-1.5 rounded-xl border border-[#182344]">
                        <Lock className="w-3.5 h-3.5" /> Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REFERRAL PROGRAM SECTION */}
      <div className="mt-2">
        <h3 className="text-base font-bold text-white mb-4">
          Referral Program
        </h3>

        <div className="bg-[#0c142b] border border-[#182344] rounded-3xl p-6 relative overflow-hidden shadow-2xl mb-4">
          <div className="text-[11px] text-slate-400 uppercase tracking-widest mb-1 font-bold">
            YOUR REFERRAL EARNINGS
          </div>
          <h3 className="text-3xl font-black text-white mb-5 tracking-tight">
            ${(userData?.total_referral_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>

          {(() => {
            const isWorkerUser = userData?.verified_referrer || userData?.is_worker || userData?.role === 'worker';
            const tier1Rate = userData?.level1_percentage !== undefined ? userData.level1_percentage : (isWorkerUser ? 60 : 10);
            const tier2Rate = userData?.level2_percentage !== undefined ? userData.level2_percentage : (isWorkerUser ? 0 : 3);
            return (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#091024] rounded-2xl border border-[#182344] p-4 text-center">
                  <div className="text-xs text-slate-400 mb-1 font-semibold">Tier 1 ({tier1Rate}%)</div>
                  <div className="text-base font-bold text-[#34d399]">
                    ${(userData?.tier1_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-[#091024] rounded-2xl border border-[#182344] p-4 text-center">
                  <div className="text-xs text-slate-400 mb-1 font-semibold">Tier 2 ({tier2Rate}%)</div>
                  <div className="text-base font-bold text-[#38bdf8]">
                    ${(userData?.tier2_earnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })()}

          <div>
            <div className="text-xs font-bold text-white mb-2">Referral Link</div>
            <div className="flex bg-[#091024] border border-[#182344] rounded-2xl overflow-hidden p-1.5 items-center">
              <input
                className="flex-1 bg-transparent px-3 text-xs text-slate-300 outline-none font-mono"
                readOnly
                value={fullReferralLink}
              />
              <button
                type="button"
                className="rounded-xl h-9 px-4 bg-[#38bdf8] hover:bg-[#0284c7] font-bold text-black text-xs shrink-0 active:scale-95 transition-transform cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(fullReferralLink);
                  toast.success("Referral link copied!");
                }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div
          className="bg-[#0c142b] border border-[#182344] rounded-2xl p-4 flex items-center justify-between group hover:bg-[#111c3a] transition-all cursor-pointer shadow-lg"
          onClick={() => navigateTab("referrals")}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#172554] flex items-center justify-center shrink-0">
              <UsersIcon className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                Go to Referral Dashboard
              </div>
              <div className="text-xs text-slate-400">
                View top earners and history
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
}

import { ProfileSettings } from "@/components/profile/ProfileSettings";

function TabProfile({
  userData,
  preferredCurrency,
  goBack,
  logout,
  navigateTab,
}: any) {
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarsList, setAvatarsList] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const avatarUrl =
    userData?.profile_avatar ||
    userData?.avatarUrl ||
    userData?.avatar_url ||
    userData?.photoURL ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.fullName || "User"}`;

  useEffect(() => {
    if (avatarModalOpen) {
      getDocs(query(collection(db, "avatars"), limit(32)))
        .then((snap) => {
          const fetched = snap.docs.map((d) => d.data().image_url).filter(Boolean);
          setAvatarsList(fetched);
        })
        .catch((err) => {
          console.error(err);
          setAvatarsList([]);
        });
    }
  }, [avatarModalOpen]);

  const selectAvatar = async (url: string) => {
    setIsUpdating(true);
    try {
      await setDoc(
        doc(db, "users", userData.uid),
        { profile_avatar: url, avatarUrl: url, avatar_url: url, photoURL: url },
        { merge: true },
      );
      toast.success("Avatar updated!");
      setAvatarModalOpen(false);
    } catch (e: any) {
      console.error("Avatar Update Error:", e);
      toast.error("Failed to update avatar: " + e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {avatarModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setAvatarModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-foreground mb-6">
              Select Your Avatar
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {avatarsList.length === 0 ? (
                <div className="col-span-4 py-8 text-center text-muted-foreground text-sm">
                  No avatars available
                </div>
              ) : (
                avatarsList.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => selectAvatar(url)}
                    className={`aspect-square rounded-xl cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 ${avatarUrl === url ? "border-primary shadow-[0_0_15px_rgba(30,80,255,0.4)]" : "border-transparent hover:border-border"}`}
                  >
                    <img
                      src={url}
                      alt={`avatar-${i}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <ProfileSettings
        user={userData}
        preferredCurrency={preferredCurrency}
        avatarUrl={avatarUrl}
        onBack={goBack}
        onLogout={logout}
        setAvatarModalOpen={setAvatarModalOpen}
        navigateTab={navigateTab}
      />
    </>
  );
}
