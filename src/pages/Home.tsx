import { useEffect, useState, useRef } from 'react';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { CommunityScrollTestimonials } from '../components/CommunityScrollTestimonials';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Activity, 
  Zap, 
  Shield, 
  ChevronRight, 
  CheckCircle2, 
  Star, 
  Car, 
  Home as HomeIcon, 
  BrainCircuit, 
  Globe, 
  TrendingUp, 
  Hexagon, 
  BarChart3, 
  Clock, 
  Wallet, 
  Lock, 
  Cpu, 
  Server, 
  Users, 
  DollarSign, 
  Award, 
  Check, 
  ArrowUpRight, 
  Shuffle, 
  Smartphone 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useConfig } from '@/contexts/GlobalConfigContext';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Absolute Default Plans for clean graceful fallback
const defaultPremiumPlans = [
  { name: "STARTER", price: 1000, baseReturn: "Projected Outline", maxBonus: "Basic AI Trading", capacity: 84, color: "#3B82F6", duration: "10-15 Days", textHex: "text-blue-400", borderHex: "border-blue-500/20" },
  { name: "CORE", price: 5000, baseReturn: "Projected Outline", maxBonus: "Advanced Intelligence", capacity: 91, popular: true, color: "#8B5CF6", duration: "15 Days", textHex: "text-violet-400", borderHex: "border-violet-500/30" },
  { name: "PRIME", price: 10000, baseReturn: "Projected Outline", maxBonus: "Multi-Market Analytics", capacity: 67, color: "#EC4899", duration: "21 Days", textHex: "text-pink-400", borderHex: "border-pink-500/20" },
  { name: "QUANTUM", price: 50000, baseReturn: "Projected Outline", maxBonus: "Institutional Systems", capacity: 42, color: "#10B981", duration: "30 Days", textHex: "text-emerald-400", borderHex: "border-emerald-500/20" },
  { name: "APEX", price: 100000, baseReturn: "Projected Outline", maxBonus: "Strategic Allocation", capacity: 18, color: "#F59E0B", duration: "45 Days", textHex: "text-amber-400", borderHex: "border-amber-500/40" },
  { name: "ULTRA", price: 500000, baseReturn: "Projected Outline", maxBonus: "Enterprise Infrastructure", capacity: 8, color: "#EF4444", duration: "60 Days", textHex: "text-red-400", borderHex: "border-red-500/40" }
];

const milestonePrizes = [
  { tier: "L1 Threshold (STARTER)", title: "AirPods Max / Smartwatch", desc: "Unlock premium smart wearable assets compiled on STARTER cycle milestones.", tech: "Cap. Alloc. >= $1,000 Required", icon: Smartphone },
  { tier: "L2 Threshold (CORE)", title: "Apple Eco Kit / iPhone Pro", desc: "Premium mobile device and eco assets allocated automatically for CORE members.", tech: "Cap. Alloc. >= $5,000 Required", icon: Smartphone },
  { tier: "L3 Threshold (PRIME)", title: "Global Luxury Resort Pass", desc: "VIP flights and 5-star resort accommodations unlocked globally.", tech: "Cap. Alloc. >= $10,000 Required", icon: Globe },
  { tier: "L4 Threshold (QUANTUM)", title: "Performance Auto Premium", desc: "Direct lease payouts on sports sedans or equivalent performance auto allocations.", tech: "Cap. Alloc. >= $50,000 Required", icon: Car },
  { tier: "L5 Threshold (APEX/ULTRA)", title: "Elite Real Estate Funding", desc: "Elite living quarters funding grants and workspace credits.", tech: "Cap. Alloc. >= $100,000 Required", icon: HomeIcon }
];

const faqsList = [
  { q: "How does Aetheris generate systematic outcomes?", a: "Aetheris deploys high-velocity, market-neutral AI modules. Our algorithms target structural pricing variations across major cryptocurrency exchanges, global forex pairs, and high-frequency digital asset markets to locked, predictable micro-margins." },
  { q: "What is the gradual interval deposit structure?", a: "Instead of risking large lump sums upfront, users select interval payment windows (ranging from 1 to 14 days). Regular interval funding mitigates market entry risk, maintains network equilibrium, and grants additional outcome rewards up to +150%." },
  { q: "Is the initial capital protected?", a: "Every cycle utilizes automated stop-loss locks and decentralized collateral shielding to preserve primary capital. This strategy guarantees a capital preservation efficiency ratio exceeding 99.8% under high volatility." },
  { q: "Are funds accessible during an active cycle?", a: "Assets are allocated directly to the designated liquidity engine for the cycle's duration. This ensures consistent trade volume capacity. Cycle increments accumulate directly inside your wallet and are updated continuously." },
  { q: "How are milestone rewards processed?", a: "Once your overall cycle completion meter crosses the 25%, 50%, 75%, and 100% boundaries, physical and experiential prize claims unlock inside your account dashboard for direct claiming or cash-equivalent conversion." }
];

// Curated live global activity ledger for organic energy and extreme authenticity
const simulatedGlobalActivities = [
  { country: "United Kingdom", flag: "🇬🇧", action: "Allocated $50,000 into Growth Phase", time: "Just now", type: "deposit", val: "$50,000" },
  { country: "Germany", flag: "🇩🇪", action: "Completed Interval Deposit via Cash App", time: "2s ago", type: "payment", val: "$2,500" },
  { country: "Singapore", flag: "🇸🇬", action: "AI Engine compiled arbitrage distribution outcome", time: "18s ago", type: "profit", val: "+$684.36" },
  { country: "United States", flag: "🇺🇸", action: "Unlocked Level 1 Smartwatch Milestone Reward", time: "45s ago", type: "reward", val: "Approved" },
  { country: "Hong Kong", flag: "🇭🇰", action: "Initiated deep-pool liquidity settlement", time: "1m ago", type: "system", val: "Completed" },
  { country: "Norway", flag: "🇳🇴", action: "Allocated $100,000 into Fixed Option", time: "2m ago", type: "deposit", val: "$100,000" },
  { country: "Switzerland", flag: "🇨🇭", action: "Completed Instant Cash Transfer", time: "3m ago", type: "payment", val: "£10,000" },
  { country: "United Arab Emirates", flag: "🇦🇪", action: "Active node processed cross-exchange path", time: "4m ago", type: "system", val: "0.2ms avg" }
];

// Simulated real-time execution log tickers from our AI models
const liveArbitrageTicks = [
  { symbol: "BTC/USDT", exchange: "Binance ➔ Coinbase", margin: "+0.14%", type: "buy", icon: "⚡" },
  { symbol: "EUR/USD", exchange: "Interactive ➔ Saxo", margin: "+0.08%", type: "sell", icon: "📈" },
  { symbol: "ETH/EUR", exchange: "Kraken ➔ Gemini", margin: "+0.22%", type: "buy", icon: "💎" },
  { symbol: "GBP/USD", exchange: "LMAX ➔ Currenex", margin: "+0.11%", type: "sell", icon: "✨" },
  { symbol: "SOL/USDC", exchange: "OKX ➔ Bybit", margin: "+0.29%", type: "buy", icon: "☄️" },
  { symbol: "GOLD/USD", exchange: "Kitco ➔ Bullion", margin: "+0.05%", type: "buy", icon: "🏆" }
];

export function Home() {
  const { hero } = useConfig();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();

  // Plans state loading dynamically from Firestore
  const [plans, setPlans] = useState<any[]>(defaultPremiumPlans);
  
  // Interactive Simulator States
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(1); // Default Growth
  const [simAmount, setSimAmount] = useState(50000);
  const [simIntervalDays, setSimIntervalDays] = useState(7);
  const [openFaqIndexes, setOpenFaqIndexes] = useState<number[]>([]);
  const [tickIndex, setTickIndex] = useState(0);

  // Statistics counters animations
  const [stats, setStats] = useState({
    deposits: 12489110,
    members: 14291,
    uptime: 99.98,
    txs: 4812
  });

  // Global activity cycle state
  const [activityIndex, setActivityIndex] = useState(0);

  // Live premium ticking countdown timer for automated node settlement displays
  const [timerString, setTimerString] = useState("02 : 14 : 36");
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setTimerString(prev => {
        const parts = prev.split(" : ").map(Number);
        let s = parts[2] || 0;
        let m = parts[1] || 0;
        let h = parts[0] || 0;
        if (s > 0) {
          s--;
        } else {
          s = 59;
          if (m > 0) {
            m--;
          } else {
            m = 59;
            if (h > 0) {
              h--;
            } else {
              h = 23;
            }
          }
        }
        return [
          String(h).padStart(2, '0'),
          String(m).padStart(2, '0'),
          String(s).padStart(2, '0')
        ].join(" : ");
      });
    }, 1000);
    return () => clearInterval(countdownInterval);
  }, []);

  // Intersection observer for fade-in animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Fetch plans dynamically from Database to support remote modification
  useEffect(() => {
    const plansRef = collection(db, 'plans');
    const unsubscribePlans = onSnapshot(plansRef, (snapshot) => {
      const plansData: any[] = [];
      snapshot.forEach((doc) => {
        plansData.push({ id: doc.id, ...doc.data() });
      });
      if (plansData.length > 0) {
        plansData.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
        
        // Enrich downloaded firebase plans with customized color variables for aesthetic fidelity
        const enrichedPlans = plansData.map((p, idx) => {
          const defaultScheme = defaultPremiumPlans[idx] || defaultPremiumPlans[defaultPremiumPlans.length - 1];
          return {
            ...p,
            color: defaultScheme.color,
            textHex: defaultScheme.textHex,
            borderHex: defaultScheme.borderHex,
            // mapping attributes
            price: p.minPrice || p.price || defaultScheme.price,
            baseReturn: p.baseReturn || p.expectedReturn || defaultScheme.baseReturn,
            maxBonus: p.maxBonus || 150,
            duration: p.duration || defaultScheme.duration,
            capacity: p.capacity || defaultScheme.capacity,
          };
        });
        setPlans(enrichedPlans);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'plans');
    });

    return () => unsubscribePlans();
  }, []);

  // Live Simulation Compounding Values & Live Ticker Increments
  useEffect(() => {
    const interval = setInterval(() => {
      // Dynamic statistics simulation
      setStats(prev => ({
        deposits: prev.deposits + Math.floor(Math.random() * 210) + 15,
        members: prev.members + (Math.random() > 0.85 ? 1 : 0),
        uptime: 99.98 + (Math.random() > 0.95 ? (Math.random() * 0.01 - 0.005) : 0),
        txs: prev.txs + Math.floor(Math.random() * 4) + 1
      }));

      // Scroll tickers
      setTickIndex(prev => (prev + 1) % liveArbitrageTicks.length);
      setActivityIndex(prev => (prev + 1) % simulatedGlobalActivities.length);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const activePlan = plans[selectedPlanIndex] || plans[0] || defaultPremiumPlans[0];
  const activePlanPrice = activePlan?.price || 15000;

  // Let's compute instant projections:
  const getIntervalBonusCalculation = (days: number) => {
    if (days <= 2) return 150;
    if (days <= 5) return 120;
    if (days <= 8) return 100;
    if (days <= 10) return 80;
    return 50;
  };

  const calculatedIntervalBonus = getIntervalBonusCalculation(simIntervalDays);
  const baseYieldPerc = activePlan?.baseReturn || activePlan?.expectedReturn || 100;
  const calculatedTotalYieldPercentage = baseYieldPerc + calculatedIntervalBonus;
  const simulatedValueResult = Math.round(simAmount * (1 + calculatedTotalYieldPercentage / 100));

  return (
    <div className="flex flex-col min-h-screen bg-[#05050A] text-foreground select-none relative w-full overflow-clip">
      
      {/* Live Activity Social Proof */}
      <LiveActivityFeed />

      {/* LUXURY AMBIENT BACKGROUNDS (No ugly lines) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[5%] left-[10%] w-[350px] lg:w-[650px] h-[350px] lg:h-[650px] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute top-[25%] right-[5%] w-[300px] lg:w-[600px] h-[300px] lg:h-[600px] bg-violet-600/5 rounded-full blur-[160px]" />
        <div className="absolute top-[50%] left-[5%] w-[400px] lg:w-[700px] h-[400px] lg:h-[700px] bg-pink-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[350px] lg:w-[600px] h-[350px] lg:h-[600px] bg-emerald-500/5 rounded-full blur-[130px]" />
      </div>

      {/* Selected Admin Custom Hero Media Background */}
      <div className="absolute inset-0 z-[-1] opacity-15 hero-fade-in mask-image:linear-gradient(to_bottom,black_40%,transparent_100%) pointer-events-none">
        {hero?.url ? (
          hero.type === 'image' ? (
            <img 
              src={hero.url} 
              alt="Aetheris Engine" 
              className="object-cover w-full h-full grayscale-[50%] contrast-125" 
              crossOrigin="anonymous" 
              onError={(e) => {
                e.currentTarget.src = "/AEhero.jpg";
              }}
            />
          ) : (
            <video autoPlay loop muted playsInline className="object-cover w-full h-full grayscale-[50%] contrast-125" src={hero.url} crossOrigin="anonymous" />
          )
        ) : null}
      </div>

      {/* ======================================= */}
      {/* 1. HERO SECTION                        */}
      {/* ======================================= */}
      <section className="relative w-full pt-32 pb-24 lg:pt-40 lg:pb-36 flex items-center justify-center overflow-hidden z-10 min-h-[750px] lg:min-h-[880px]">
        {/* Full-width Immersive Hero Background (Text overlayed beautifully) */}
        <div className="absolute inset-0 z-0 select-none">
          {hero?.url ? (
            hero.type === 'video' ? (
              <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover opacity-35 contrast-[1.1] brightness-[0.55] grayscale-[20%]" 
                src={hero.url} 
                crossOrigin="anonymous" 
              />
            ) : (
              <img 
                src={hero.url} 
                alt="Aetheris Immersive Backdrop" 
                className="w-full h-full object-cover opacity-35 contrast-[1.1] brightness-[0.55] grayscale-[20%]" 
                crossOrigin="anonymous" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "/AEhero.jpg";
                }}
              />
            )
          ) : (
            /* Majestic futuristic cyber starry universe fallback with orbital neon rings */
            <div className="absolute inset-0 bg-[#040409]">
              {/* Radial gradient glow representing the high-tech Aetheris network power core on the right side */}
              <div className="absolute top-[15%] right-[-10%] w-[600px] lg:w-[1000px] h-[600px] lg:h-[1000px] bg-gradient-to-r from-primary/15 via-violet-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
              <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
              
              {/* Starry space / constellation vector style particles */}
              <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              {/* Futuristic coordinate grids matching screenshot mood */}
              <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>
          )}
          
          {/* Black radial/linear vignettes for guaranteed white-text readability according to guidelines */}
          <div className="absolute inset-y-0 left-0 w-full lg:w-[65%] bg-gradient-to-r from-[#05050A] via-[#05050A]/95 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-transparent to-[#05050A]/70 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-full lg:w-[40%] bg-gradient-to-l from-black/50 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
            
            {/* Left Content Column (Strict Left-Aligned/One-Sided Layout matching the screenshot) */}
            <div className="lg:col-span-8 flex flex-col items-start text-left w-full">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
                <ChipIndicator />
                AI-Powered Wealth Engine
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] xl:text-[4.8rem] font-black tracking-tight leading-[0.96] text-white uppercase mb-6 drop-shadow-lg">
                Build Digital <br /> Wealth Through <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#EC4899]">Autonomous</span> Systems
              </h1>
              
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mb-8 leading-relaxed">
                Aetheris combines advanced intelligence market-neutral index feeds with high-velocity compound engines. Initiate custom local micro-allocations directly and unlock premium physical milestone payouts globally.
              </p>

              {/* Action Buttons with robust mobile screen fit */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-10">
                <Link to={user ? "/dashboard" : "/auth/signup"} className="w-full sm:w-auto">
                  <Button size="lg" className="h-14 px-8 text-xs font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-full shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 group transition-all duration-300 transform active:scale-95 border-none w-full">
                    {user ? "Dashboard" : "Start Investing"}
                    <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Button>
                </Link>
                <a href="#growth-protocol" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-xs font-bold uppercase tracking-widest rounded-full border-white/10 bg-white/[0.02] hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 w-full">
                    Learn More
                  </Button>
                </a>
              </div>

              {/* "TRUSTED BY INVESTORS WORLDWIDE" Section */}
              <div className="w-full mb-8 pt-4 border-t border-white/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 mb-4 font-mono">
                  Trusted By Investors Worldwide
                </div>
                <div className="flex flex-wrap items-center gap-6 sm:gap-8 opacity-65 grayscale hover:opacity-100 transition-all select-none">
                  {/* SSL SECURED LOGO */}
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-white" fill="currentColor" fillOpacity={0.15} />
                    <span className="text-[10px] font-black text-white tracking-tighter">SSL SECURED</span>
                  </div>
                  {/* COMODO SECURE */}
                  <div className="flex items-center gap-1">
                    <Lock className="w-4 h-4 text-[#E61C24]" />
                    <span className="text-[10px] font-black text-white/95">COMODO <span className="text-[#E61C24]">SECURE</span></span>
                  </div>
                  {/* VISA */}
                  <div className="flex items-center gap-1 font-serif italic text-white font-extrabold tracking-tight scale-90">
                    <span className="text-xs text-blue-400 font-black">V</span>
                    <span className="text-[10px] text-white/90 font-black">ISA</span>
                  </div>
                  {/* MASTERCARD */}
                  <div className="flex items-center scale-90">
                    <span className="w-3 h-3 rounded-full bg-[#EB001B]/80 mr-[-5px]"></span>
                    <span className="w-3 h-3 rounded-full bg-[#F79E1B]/80"></span>
                  </div>
                  {/* PAYPAL */}
                  <div className="flex items-center gap-0.5 font-bold italic text-white/90 text-xs scale-90">
                    <span className="text-blue-400 font-extrabold">P</span>
                    <span className="text-blue-500 font-extrabold">Pay</span>
                  </div>
                </div>
              </div>

            </div>



          </div>
        </div>
      </section>

      {/* ======================================= */}
      {/* 2. LIVE STATISTICS & TRUST BAR          */}
      {/* ======================================= */}
      <section className="relative py-12 border-y border-white/5 bg-secondary/20 backdrop-blur-xl z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 justify-items-center items-center font-mono">
            
            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-1">
                ${(stats.deposits / 1000000).toFixed(2)}M
              </span>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-primary" /> Total Secured Pool
              </span>
            </div>

            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {stats.members.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-violet-500" /> Active Nodes Globally
              </span>
            </div>

            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {stats.txs.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-blue-400" /> Hourly AI Trades Executed
              </span>
            </div>

            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                {stats.uptime.toFixed(3)}%
              </span>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                <Server className="w-3 h-3 text-emerald-400" /> Server Node Uptime
              </span>
            </div>

            <div className="text-center md:text-left flex flex-col items-center md:items-start col-span-2 md:col-span-1">
              <div className="flex gap-1.5 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white font-black">USD</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/45">EUR</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/45">GBP</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-primary" /> Global Currency Support
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================= */}
      {/* 3. SECURE GATEWAY / PAYMENT METHOD       */}
      {/* ======================================= */}
      <section className="py-20 relative z-10 bg-black/40 border-b border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-4 text-left">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">
                Global Settlement Layer
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Fund account balances with total convenience. Automated transactions via Cash App, card routes, and direct mobile pay guarantee instant network-wide balance alignment.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs text-white/80 font-semibold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Instant Processing, Zero Holds
                </div>
                <div className="flex items-center gap-2 text-xs text-white/80 font-semibold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Full Automated Settlement Guarantee
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 bg-[#0E111A] border border-white/5 p-8 rounded-[2rem] shadow-inner relative">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#8492a6] font-mono mb-6 text-center lg:text-left">
                INTEGRATED MERCHANT PROTOCOLS (AUTOMATED INTEGRATION)
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center items-center">
                {/* Visa */}
                <div className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center hover:border-blue-500/30 hover:bg-black/60 transition-all p-4 relative group">
                  <div className="flex items-center gap-1.5 font-serif italic text-blue-500 font-extrabold tracking-tight select-none">
                    <span className="text-lg text-blue-500 font-black">V</span>
                    <span className="text-base text-white/90 font-black">ISA</span>
                    <div className="w-1.5 h-3 bg-amber-400 hover:bg-amber-300 rounded-sm rotate-12 ml-0.5" />
                  </div>
                  <span className="absolute bottom-1 right-2 text-[8px] font-black text-white/20 uppercase tracking-widest">Verified</span>
                </div>

                {/* Mastercard */}
                <div className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center hover:border-orange-500/30 hover:bg-black/60 transition-all p-4 relative group overflow-hidden">
                  <div className="flex items-center gap-2 select-none">
                    <svg className="h-6 w-auto shrink-0" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="35" cy="30" r="25" fill="#EB001B" fillOpacity="0.9"/>
                      <circle cx="65" cy="30" r="25" fill="#F79E1B" fillOpacity="0.9"/>
                      <path d="M50 10a24.9 24.9 0 019 19.5 24.9 24.9 0 01-9 19.5 24.9 24.9 0 01-9-19.5c0-8 3.5-15 9-19.5z" fill="#FF5F00" fillOpacity="0.95"/>
                    </svg>
                    <span className="text-xs font-black text-white/95 uppercase tracking-wide">MC</span>
                  </div>
                  <span className="absolute bottom-1 right-2 text-[8px] font-black text-white/20 uppercase tracking-widest">Direct</span>
                </div>

                {/* Cash App Logo */}
                <div className="w-full h-16 bg-[#00D632] border border-emerald-400/20 rounded-2xl flex items-center justify-center hover:opacity-90 transition-all p-3 relative group overflow-hidden shadow-lg shadow-emerald-500/10">
                  <svg className="h-10 w-10 shrink-0" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M64 20V108" stroke="white" strokeWidth="14" strokeLinecap="round"/>
                    <path d="M44 38C44 38 52 32 64 32C76 32 84 40 84 50C84 62 70 66 58 70C46 74 44 82 44 90C44 98 52 104 64 104C76 104 84 98 84 98" stroke="white" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="absolute bottom-1 right-2 text-[8px] font-black text-white/50">Direct Network</span>
                </div>

                {/* Apple Pay */}
                <div className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center hover:border-white/25 hover:bg-black/60 transition-all p-4 relative">
                  <div className="flex items-center gap-1.5 tracking-tight text-white select-none">
                    <span className="text-xl"></span>
                    <span className="text-base font-extrabold font-sans">pay</span>
                  </div>
                  <span className="absolute bottom-1 right-2 text-[8px] font-black text-white/20 uppercase tracking-widest">Secure</span>
                </div>

                {/* Google Pay */}
                <div className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center hover:border-primary/25 hover:bg-black/60 transition-all p-4 relative">
                  <div className="flex items-center gap-1.5 select-none">
                    <svg className="h-4.5 w-auto shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18 v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.63-.63-1.19-1.37-1.19-2.22" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-4.3 0-8.01 2.47-9.82 6.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span className="text-xs font-bold text-white/90">GPay</span>
                  </div>
                  <span className="absolute bottom-1 right-2 text-[8px] font-black text-white/20 uppercase tracking-widest">Instant</span>
                </div>

                {/* Crypto Networks (USDT / USDC / BTC with actual token icons overlay) */}
                <div className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center hover:border-violet-500/30 hover:bg-black/60 transition-all p-4 relative overflow-hidden group">
                  <div className="flex items-center gap-1 select-none">
                    {/* Orange BTC Circle */}
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-extrabold text-[10px] shadow-sm shadow-orange-500/5 z-20">₿</div>
                    {/* Teal USDT Circle */}
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-extrabold text-[10px] -ml-2.5 bg-black/90 z-10">₮</div>
                    {/* Blue USDC Circle */}
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-extrabold text-[9px] -ml-2.5 bg-black/90">S</div>
                    <span className="text-[10px] font-black text-white/80 uppercase ml-1 tracking-tighter">LIQUID</span>
                  </div>
                  <span className="absolute bottom-1 right-2 text-[8px] font-black text-white/20 uppercase tracking-widest">Hedge</span>
                </div>

                {/* SEPA / SWIFT Automated Clearing Network */}
                <div className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center hover:border-indigo-500/30 hover:bg-black/60 transition-all p-4 relative">
                  <div className="flex items-center gap-2 text-white/90 select-none">
                    <svg className="w-4.5 h-4.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="10" width="20" height="12" rx="2" />
                      <line x1="12" y1="22" x2="12" y2="10" />
                      <line x1="17" y1="22" x2="17" y2="10" />
                      <line x1="7" y1="22" x2="7" y2="10" stroke="currentColor" />
                      <path d="M2 10V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6" />
                    </svg>
                    <span className="text-[10px] font-black tracking-widest font-mono">SEPA / ACH</span>
                  </div>
                  <span className="absolute bottom-1 right-2 text-[8px] font-black text-white/20 uppercase tracking-widest">Wired</span>
                </div>

                {/* Automated Dynamic Instant Delivery badge */}
                <div className="w-full h-16 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-center hover:bg-emerald-500/10 transition-all p-4 relative overflow-hidden group">
                  <div className="flex items-center gap-1.5 text-emerald-400 select-none">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-black tracking-widest uppercase font-mono">UTX AUTO</span>
                  </div>
                  <span className="absolute bottom-1 right-2 text-[8px] font-black text-emerald-400/40 uppercase tracking-widest">Active</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ======================================= */}
      {/* 4. REBUILD "HOW IT WORKS" (TIMELINE)    */}
      {/* ======================================= */}
      <section id="growth-protocol" className="py-32 bg-secondary/20 border-b border-white/5 scroll-mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-24 reveal">
            <Badge variant="outline" className="mb-4 border-violet-500/20 text-violet-400 bg-violet-500/5 px-4 py-1.5 uppercase font-mono text-[10px] tracking-widest">
              Core Network Architecture
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
              The Growth Protocol Cycle
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Discover how capital is balanced, processed, and scaled inside our autonomous vaults. Systematic mechanics designed for elite consistency.
            </p>
          </div>

          {/* Timeline Stack (5 beautifully sequenced steps with glowing connector trails) */}
          <div className="relative max-w-4xl mx-auto">
            {/* Direct Line Graphic for desktop */}
            <div className="absolute left-[39px] md:left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-primary via-violet-500 via-pink-500 to-emerald-500 opacity-20 hidden sm:block" />

            <div className="space-y-16">
              
              {/* Step 1 */}
              <div className="relative grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-12 items-center reveal">
                <div className="sm:col-span-5 text-left sm:text-right order-3 sm:order-1">
                  <h3 className="text-xl font-bold text-white mb-2">01. Secure Registry & Node Setup</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Instantly register your identity to mount a node on the network. Setup currency configurations in Dollars, Euros, or Pounds.
                  </p>
                </div>
                <div className="sm:col-span-2 flex items-center justify-start sm:justify-center order-1 sm:order-2">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/50 flex items-center justify-center text-primary font-black text-lg shadow-lg relative z-10 bg-[#0E111A]">
                    <Cpu className="w-5 h-5" />
                  </div>
                </div>
                <div className="sm:col-span-5 text-left order-2 sm:order-3 hidden sm:block">
                  <Badge className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 font-mono text-xs font-bold leading-normal px-3 py-1.5 rounded-xl">
                    Engine Status: Online
                  </Badge>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-12 items-center reveal">
                <div className="sm:col-span-5 text-right hidden sm:block">
                  <Badge className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 font-mono text-xs font-bold leading-normal px-3 py-1.5 rounded-xl">
                    Aggregated payment gateway online
                  </Badge>
                </div>
                <div className="sm:col-span-2 flex items-center justify-start sm:justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border-2 border-violet-500/50 flex items-center justify-center text-violet-400 font-black text-lg shadow-lg relative z-10 bg-[#0E111A]">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="sm:col-span-5 text-left">
                  <h3 className="text-xl font-bold text-white mb-2">02. Initialize Pool Reserves</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Add capital deposits via automatic fiat cards, mobile wallets, or crypto secure pathways. Funds execute directly to smart ledger balances.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-12 items-center reveal">
                <div className="sm:col-span-5 text-left sm:text-right order-3 sm:order-1">
                  <h3 className="text-xl font-bold text-white mb-2">03. Designate Cycle Frequency</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Allocate funds to precise tier allocations. Commit to payment intervals based on cycle constraints to match index liquidity schedules.
                  </p>
                </div>
                <div className="sm:col-span-2 flex items-center justify-start sm:justify-center order-1 sm:order-2">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border-2 border-pink-500/50 flex items-center justify-center text-pink-400 font-black text-lg shadow-lg relative z-10 bg-[#0E111A]">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="sm:col-span-5 text-left order-2 sm:order-3 hidden sm:block">
                  <Badge className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 font-mono text-xs font-bold leading-normal px-3 py-1.5 rounded-xl">
                    Interval Bonus activated: Up to +150%
                  </Badge>
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-12 items-center reveal">
                <div className="sm:col-span-5 text-right hidden sm:block">
                  <Badge className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 font-mono text-xs font-bold leading-normal px-3 py-1.5 rounded-xl">
                    Latency: Under 0.5ms per route
                  </Badge>
                </div>
                <div className="sm:col-span-2 flex items-center justify-start sm:justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border-2 border-blue-400/50 flex items-center justify-center text-blue-300 font-black text-lg shadow-lg relative z-10 bg-[#0E111A]">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                </div>
                <div className="sm:col-span-5 text-left">
                  <h3 className="text-xl font-bold text-white mb-2">04. AI Arbitrage Compounding</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Our AI models automatically route liquidity buffers into low-risk arbitrage executions, distributing accrued gains directly to users at scheduled increments.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="relative grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-12 items-center reveal">
                <div className="sm:col-span-5 text-left sm:text-right order-3 sm:order-1">
                  <h3 className="text-xl font-bold text-white mb-2">05. Instant Settlements & Milestones</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Withdraw compiled profits at any time. Milestone markers unlock automatic lifestyle allocations and high-end tech hardware rewards on the go.
                  </p>
                </div>
                <div className="sm:col-span-2 flex items-center justify-start sm:justify-center order-1 sm:order-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 font-black text-lg shadow-lg relative z-10 bg-[#0E111A]">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="sm:col-span-5 text-left order-2 sm:order-3 hidden sm:block">
                  <Badge className="bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 font-mono text-xs font-bold leading-normal px-3 py-1.5 rounded-xl">
                    Automated payouts guaranteed
                  </Badge>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ======================================= */}
      {/* 5. PREMIUM PLANS SHOWCASE               */}
      {/* ======================================= */}
      <section id="plans" className="py-32 relative z-10 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-20 reveal">
            <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-500 bg-amber-500/5 px-4 py-1.5 uppercase font-mono text-[10px] tracking-widest">
              Available Tiers
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
              Active Network Cycles
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Allocate your resources into our dedicated quantitative brackets. Lock capacity, complete recurring interval deposit thresholds, and secure peak projected payouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 xl:gap-8 items-stretch justify-items-center">
            {plans.map((p, idx) => {
              const isPopular = p.popular || false;
              const isUltraElite = p.name.toLowerCase().includes("ultra") || idx === plans.length - 1;
              const glowColor = p.color || "#8B5CF6";
              
              return (
                <Card 
                  key={idx} 
                  className={`w-full max-w-[280px] bg-[#0E111A] relative flex flex-col p-6 lg:p-7 rounded-[2rem] transition-all duration-300 hover:-translate-y-2 group ${
                    isPopular 
                      ? 'border-primary border-2 shadow-2xl scale-105 z-10' 
                      : isUltraElite 
                        ? 'border-amber-500/50 border-2 shadow-2xl' 
                        : 'border-white/5 hover:border-white/20'
                  }`}
                  style={{
                    boxShadow: isPopular 
                      ? `0 10px 40px -15px ${glowColor}40` 
                      : isUltraElite 
                        ? '0 10px 40px -15px rgba(245,158,11,0.2)' 
                        : 'none'
                  }}
                >
                  {/* Popular Accent Line */}
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <Badge className="bg-primary hover:bg-primary text-white font-black text-[9px] tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg">
                        SYSTEM PREFERRED
                      </Badge>
                    </div>
                  )}

                  {/* Ultra Elite Accent Line */}
                  {!isPopular && isUltraElite && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-black font-black text-[9px] tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg">
                        ELITE CAP. POOL
                      </Badge>
                    </div>
                  )}

                  {/* Header Title */}
                  <div className="text-center border-b border-white/5 pb-6 mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#8492a6] font-mono mb-2 flex items-center justify-center gap-1.5 flex-wrap">
                      {p.name.replace(" Tier", "").replace(" Option", "").replace(" Engine", "").replace(" Core", "")}
                      {p.name.toUpperCase() === "CORE" && (
                        <span className="text-[8px] bg-primary/20 text-blue-400 border border-primary/30 px-1.5 py-0.5 rounded font-black tracking-widest leading-none">
                          Recommended
                        </span>
                      )}
                      {p.name.toUpperCase() === "QUANTUM" && (
                        <span className="text-[8px] bg-amber-500/20 text-yellow-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-black tracking-widest leading-none flex items-center gap-0.5 animate-pulse">
                          ⭐ MVP
                        </span>
                      )}
                    </h3>
                    <div className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-none mb-1">
                      {formatCurrency(p.price)}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide block">
                      Base Entry Limit
                    </span>

                    {/* QUANTUM Specific descriptive points */}
                    {p.name.toUpperCase() === "QUANTUM" && (
                      <div className="mt-3 text-left pl-3 border-l border-amber-500/30 space-y-1 text-slate-300 text-[9px] font-sans">
                        <div className="flex items-center gap-1.5">
                          <span className="text-yellow-400 text-[5px]">●</span> Balanced AI Access
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-yellow-400 text-[5px]">●</span> Enhanced Automation
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-yellow-400 text-[5px]">●</span> Advanced Capital Allocation
                        </div>
                      </div>
                    )}
                  </div>

                   {/* Stats Body */}
                   <div className="space-y-4 mb-8 flex-1 text-xs">
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-[#8492a6] font-semibold">Estimated Completion:</span>
                       <span className="text-white font-bold">{p.duration || "10-15 Days"}</span>
                     </div>
                     
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-[#8492a6] font-semibold uppercase font-mono text-[9px] tracking-wider">Safety Framework:</span>
                       <span className="text-emerald-400 font-bold font-mono">
                         {(() => {
                           const name = p.name?.toUpperCase() || "";
                           if (name === "STARTER" || name === "CORE") return "CONSERVATIVE";
                           if (name === "PRIME") return "NEUTRAL RISK";
                           if (name === "QUANTUM") return "QUANTITATIVE";
                           if (name === "APEX") return "INSTITUTIONAL";
                           return "SOVEREIGN NODE";
                         })()}
                       </span>
                     </div>
 
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-[#8492a6] font-semibold">Min Outcome Projection:</span>
                       <span className="text-white font-bold">
                         {(() => {
                            const rawMin = p.minOutcome !== undefined ? (Number(p.minOutcome) > 10 ? Number(p.minOutcome) / 100 : Number(p.minOutcome)) : (p.name?.toUpperCase() === 'STARTER' ? 1.0 : p.name?.toUpperCase() === 'CORE' ? 1.2 : p.name?.toUpperCase() === 'PRIME' ? 1.5 : p.name?.toUpperCase() === 'QUANTUM' ? 2.5 : p.name?.toUpperCase() === 'APEX' ? 5.0 : 7.5);
                            return formatCurrency(p.price * rawMin);
                         })()}
                       </span>
                     </div>
 
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-[#8492a6] font-semibold">Max Outcome Projection:</span>
                       <span className="text-white font-bold font-mono">
                         {(() => {
                            const rawMax = p.maxOutcome !== undefined ? (Number(p.maxOutcome) > 10 ? Number(p.maxOutcome) / 100 : Number(p.maxOutcome)) : (p.name?.toUpperCase() === 'STARTER' ? 1.5 : p.name?.toUpperCase() === 'CORE' ? 2.0 : p.name?.toUpperCase() === 'PRIME' ? 3.0 : p.name?.toUpperCase() === 'QUANTUM' ? 5.0 : p.name?.toUpperCase() === 'APEX' ? 7.5 : 10.0);
                            return formatCurrency(p.price * rawMax);
                         })()}
                       </span>
                     </div>
                     
                     <div className="flex flex-col gap-1 border-t border-white/5 pt-3 mt-2">
                       <span className="text-[9px] font-black uppercase tracking-wider text-[#8492a6] font-mono">
                         Projected Net Gain
                       </span>
                       <span className={`text-lg font-black text-transparent bg-clip-text bg-gradient-to-r ${isUltraElite ? 'from-amber-400 to-emerald-400' : 'from-primary to-violet-400'}`}>
                         {(() => {
                            const rawMin = p.minOutcome !== undefined ? (Number(p.minOutcome) > 10 ? Number(p.minOutcome) / 100 : Number(p.minOutcome)) : (p.name?.toUpperCase() === 'STARTER' ? 1.0 : p.name?.toUpperCase() === 'CORE' ? 1.2 : p.name?.toUpperCase() === 'PRIME' ? 1.5 : p.name?.toUpperCase() === 'QUANTUM' ? 2.5 : p.name?.toUpperCase() === 'APEX' ? 5.0 : 7.5);
                            const rawMax = p.maxOutcome !== undefined ? (Number(p.maxOutcome) > 10 ? Number(p.maxOutcome) / 100 : Number(p.maxOutcome)) : (p.name?.toUpperCase() === 'STARTER' ? 1.5 : p.name?.toUpperCase() === 'CORE' ? 2.0 : p.name?.toUpperCase() === 'PRIME' ? 3.0 : p.name?.toUpperCase() === 'QUANTUM' ? 5.0 : p.name?.toUpperCase() === 'APEX' ? 7.5 : 10.0);
                            return `${formatCurrency((p.price * rawMin) - p.price)} – ${formatCurrency((p.price * rawMax) - p.price)}`;
                         })()}
                       </span>
                     </div>
                   </div>

                  {/* Dynamic Capacity Stats */}
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-[9px] font-mono font-black text-muted-foreground uppercase tracking-widest">
                      <span>Reserve Rate</span>
                      <span className="text-white">{p.capacity}% Filled</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isUltraElite ? 'bg-amber-500' : 'bg-primary'}`} 
                        style={{ width: `${p.capacity}%` }} 
                      />
                    </div>
                  </div>

                  {/* CTA link */}
                  <Link to={user ? "/dashboard" : "/auth/signup"} className="block w-full mt-auto">
                    <Button 
                      className={`w-full h-11 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                        isPopular
                          ? 'bg-primary hover:bg-primary/95 text-white'
                          : isUltraElite
                            ? 'bg-amber-500 hover:bg-amber-600 text-black'
                            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      Allocate Reserves
                    </Button>
                  </Link>

                </Card>
              );
            })}
          </div>

        </div>
      </section>

      {/* ======================================= */}
      {/* 6. LIVE GROWTH VISUALIZATION (CHART)    */}
      {/* ======================================= */}
      <section className="py-32 relative bg-secondary/10 border-y border-white/5 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            <div className="lg:col-span-5 text-left">
              <Badge variant="outline" className="mb-4 border-emerald-500/20 text-emerald-400 bg-emerald-500/5 px-4 py-1.5 uppercase font-mono text-[10px] tracking-widest">
                Ledger Transparency
              </Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
                Live Compounding Projections
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
                Watch mathematical compounding build balance parameters autonomously. Complete scheduled interval triggers consistently to lock down peak bonus rewards.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Shuffle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Dynamic Arbitrage Routing</h4>
                    <p className="text-xs text-muted-foreground">Capital allocation automatically diversifies across active arbitrage zones depending on execution speed and current bid-ask spreads.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Collateral Protection Rails</h4>
                    <p className="text-xs text-muted-foreground">Stop-loss index algorithms maintain a strict preservation boundary. Peak volatility buffers protect original capital pool buffers securely.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 w-full relative">
              {/* Decorative backglow */}
              <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-r from-emerald-500/10 to-primary/10 opacity-40 blur-3xl pointer-events-none" />
              
              <Card className="bg-[#0E111A] border-white/10 p-6 lg:p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full font-mono overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Compounding Target Estimate Chart</span>
                    <h4 className="text-lg font-bold text-white">Aetheris Plan Potential</h4>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-primary">
                      <span className="w-2.5 h-2.5 bg-primary rounded-full" /> Base Allocation ({formatCurrency(simAmount)})
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" /> Compound Payout ({formatCurrency(simulatedValueResult)})
                    </div>
                  </div>
                </div>

                {/* Plan Selection tabs */}
                <div className="flex flex-wrap gap-1.5 mb-6 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  {plans.map((p, idx) => {
                    const isSelected = selectedPlanIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedPlanIndex(idx);
                          setSimAmount(p.price);
                        }}
                        className={`text-[9px] font-black uppercase tracking-widest flex-1 min-w-[70px] px-2 py-2.5 rounded-xl transition-all duration-200 ${
                          isSelected 
                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                            : "text-muted-foreground hover:text-slate-100 hover:bg-white/5"
                        }`}
                      >
                        {p.name.replace(" Tier", "").replace(" Option", "").replace(" Engine", "").replace(" Core", "")}
                      </button>
                    );
                  })}
                </div>

                {/* Interval Days selection slider / buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-black/20 p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest font-mono font-bold">
                    Payment Interval Target
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 3, 5, 7, 10].map((days) => {
                      const isSelected = simIntervalDays === days;
                      return (
                        <button
                          key={days}
                          onClick={() => setSimIntervalDays(days)}
                          className={`text-[9px] font-bold font-mono px-3 py-1.5 rounded-lg transition-all ${
                            isSelected 
                              ? "bg-emerald-500 text-black font-black" 
                              : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {days} {days === 1 ? "Day" : "Days"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Simulated SVG Graph Curve */}
                <div className="w-full h-52 relative border-b border-white/10 mb-6 flex items-end">
                  <svg className="w-full h-full absolute inset-0 text-primary" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="curveGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="rgba(46,91,255,0.01)" />
                        <stop offset="100%" stopColor="rgba(46,91,255,0.25)" />
                      </linearGradient>
                      <linearGradient id="payoutGrad" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="rgba(16,185,129,0.01)" />
                        <stop offset="100%" stopColor="rgba(16,185,129,0.3)" />
                      </linearGradient>
                    </defs>
                    {/* Compound curve (payoutGrad) */}
                    <path d="M 0 85 Q 25 75 50 60 T 100 10 L 100 100 L 0 100 Z" fill="url(#payoutGrad)" />
                    <path d="M 0 85 Q 25 75 50 60 T 100 10" fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="5" />
                    
                    {/* Base allocation line (curveGrad) */}
                    <path d="M 0 85 L 100 50 L 100 100 L 0 100 Z" fill="url(#curveGrad)" />
                    <path d="M 0 85 L 100 50" fill="none" stroke="#3B82F6" strokeWidth="2" />
                  </svg>
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-y-0 left-1/4 w-px bg-white/5" />
                  <div className="absolute inset-y-0 left-2/4 w-px bg-white/5" />
                  <div className="absolute inset-y-0 left-3/4 w-px bg-white/5" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/5" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/5" />

                  {/* Horizontal indicators */}
                  <div className="absolute left-2 bottom-2 text-[9px] text-[#8492a6]">Cycle Int. Day 1</div>
                  <div className="absolute right-2 bottom-2 text-[9px] text-emerald-400 font-bold">Estimated Target ({activePlan.duration})</div>
                </div>

                {/* Instant projections list */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Capital Allocation</span>
                    <div className="text-sm font-bold text-white mt-1">{formatCurrency(simAmount)}</div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Minimum Outcome</span>
                    <div className="text-sm font-bold text-primary mt-1">
                      {formatCurrency(simAmount * (baseYieldPerc / 100))}
                    </div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Maximum Outcome</span>
                    <div className="text-sm font-bold text-emerald-400 mt-1">
                      {formatCurrency(simAmount * (calculatedTotalYieldPercentage / 100))}
                    </div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">Projected Net Gain</span>
                    <div className="text-sm font-black text-emerald-400 mt-1">
                      {formatCurrency(simAmount * (calculatedTotalYieldPercentage / 100) - simAmount)}
                    </div>
                  </div>
                </div>

              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================= */}
      {/* 6.5 COMMUNITY PROOFS SECTION            */}
      {/* ======================================= */}
      <CommunityScrollTestimonials />

      {/* ======================================= */}
      {/* 7. REFERRAL ECOSYSTEM SECTION           */}
      {/* ======================================= */}
      <section className="py-32 relative z-10 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-24 reveal">
            <Badge variant="outline" className="mb-4 border-primary/20 text-primary bg-primary/5 px-4 py-1.5 uppercase font-mono text-[10px] tracking-widest">
              Growth Multiplication
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
              Aetheris Referral Program
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Accelerate yields by inviting members to join the Aetheris network. Share your referral structures and earn instant multi-tier network commissions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Visual illustration of tiered commissions */}
            <div className="lg:col-span-7 reveal">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Bronze Worker */}
                <Card className="bg-[#0E111A] border-white/5 p-6 rounded-3xl relative overflow-hidden transition-all duration-300 hover:border-amber-700/35">
                  <div className="w-10 h-10 rounded-2xl bg-amber-700/10 border border-amber-700/30 flex items-center justify-center mb-6">
                    <span className="text-amber-500 font-bold font-mono">L1</span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">Direct Referrals</h4>
                  <div className="text-[#8B5CF6] text-2xl font-black mb-2">10.0%</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Earn absolute capital allocations instantly on all directly invited deposits via network links.
                  </p>
                </Card>

                {/* Silver Worker */}
                <Card className="bg-[#0E111A] border-white/5 p-6 rounded-3xl relative overflow-hidden transition-all duration-300 hover:border-slate-400/35">
                  <div className="w-10 h-10 rounded-2xl bg-slate-400/10 border border-slate-400/30 flex items-center justify-center mb-6">
                    <span className="text-slate-400 font-bold font-mono">L2</span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">Level 2 Override</h4>
                  <div className="text-[#8B5CF6] text-2xl font-black mb-2">3.0%</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Secure recurring commissions from nodes initialized by secondary network connections automatically.
                  </p>
                </Card>

              </div>
            </div>

            {/* Explanatory details and referral rules */}
            <div className="lg:col-span-5 text-left reveal" style={{ transitionDelay: "0.2s" }}>
              <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest font-mono mb-4">
                <Users className="w-4 h-4" /> Infinite Depth Synergy
              </div>
              <h3 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tight mb-4">
                Structured Affiliate Nodes
              </h3>
              <p className="text-sm text-[#8492a6] leading-relaxed mb-6">
                Become a registered Aetheris Representative. When your network balances expand, our system shifts commission ratios on the fly, empowering global node leaders with continuous payouts.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-white/80 font-semibold font-mono">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">✓</span> Same-Day Settled Withdrawal Approvals
                </div>
                <div className="flex items-center gap-3 text-xs text-white/80 font-semibold font-mono">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">✓</span> Elite Partner Tiers with recurring base checks
                </div>
              </div>

              <Link to="/auth/signup" className="inline-block mt-8">
                <Button className="h-11 px-6 rounded-full text-xs font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20 transition-all">
                  Get Representative Link
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================= */}
      {/* 8. SECURITY & VAULT OVERVIEW             */}
      {/* ======================================= */}
      <section className="py-32 bg-secondary/10 border-y border-white/5 scroll-mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto w-full reveal">
            <Badge variant="outline" className="mb-4 border-primary/20 text-primary bg-primary/5 px-4 py-1.5 uppercase font-mono text-[10px] tracking-widest">
              Infrastructure Stability
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
              Decentralized Secure Vaults
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-6">
              To guarantee perfect security parameters, our liquidity aggregates are split dynamically across multiple offline cold-vault pools. Absolute non-custodial capital protection with multi-sig verification protocols.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 w-full">
              <div className="bg-[#0E111A] p-6 rounded-3xl border border-white/5 hover:border-primary/20 transition-all text-left">
                <h4 className="font-bold text-white text-sm mb-2">Cold Preservation Lock</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">98.5% of pool liquidity reserves remain safely offline, protected against malicious exploits completely.</p>
              </div>
              <div className="bg-[#0E111A] p-6 rounded-3xl border border-white/5 hover:border-primary/20 transition-all text-left">
                <h4 className="font-bold text-white text-sm mb-2">DNL Loss Mitigation</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Automatic hedge contracts balance margin values dynamically if volatility spikes beyond normal indexes.</p>
              </div>
              <div className="bg-[#0E111A] p-6 rounded-3xl border border-white/5 hover:border-primary/20 transition-all text-left">
                <h4 className="font-bold text-white text-sm mb-2">Multi-Sig Consensus Rail</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">Distributed consensus nodes require consensus from multiple hardware vaults to authenticate settlements, isolating queries.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================= */}
      {/* 9. GLOBAL SOCIAL PROOF & LIVE FEED     */}
      {/* ======================================= */}
      <section className="py-32 relative z-10 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-24 reveal">
            <Badge variant="outline" className="mb-4 border-primary/20 text-primary bg-primary/5 px-4 py-1.5 uppercase font-mono text-[10px] tracking-widest">
              Live Network Operations
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
              Global Activity Stream
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Total transparent operations. Peer into the live, tick-by-tick operational records from developers and nodes globally database.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-stretch">
            
            {/* Left Box: Testimonials */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-6 reveal">
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest mb-2 text-left">
                Verifiable Member Testimonials
              </h3>
              
              <div className="space-y-6 flex-1">
                {[
                  { name: "Adrian V.", role: "Elite Node Participant", text: "The gradual interval deposits solved my entry anxiety. Routing micro-payments via Cash App/Apple Pay is instant, and my portfolio growth curve updates continuously." },
                  { name: "Elena K.", role: "Representative Partner", text: "I unlocked the Macbook Pro premium milestone prize at 25% cycle completion. Claiming was automated and approved in under 2 hours. Simply world-class." },
                  { name: "Marcus L.", role: "Aetheris Ambassador", text: "Building a referral network L1 and L2 has generated passive earnings beyond my expectations. Secure payout settlements process directly in under an hour." },
                  { name: "Sophia R.", role: "Wealth Advisory Partner", text: "The transparency of Aetheris outperforms traditional funds. Dynamic referral settlements and instant State checkout guarantees unmatched capital reliability." }
                ].map((t, idx) => (
                  <Card key={idx} className="bg-[#0E111A] border-white/5 p-6 rounded-3xl text-left">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-[#8492a6] italic mb-4 leading-relaxed">
                      "{t.text}"
                    </p>
                    <div>
                      <div className="text-xs font-bold text-white uppercase font-mono tracking-wider">{t.name}</div>
                      <div className="text-[10px] text-primary">{t.role}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Box: Simulation Live Ledger (Extremely High Conversion Tool) */}
            <div className="lg:col-span-6 bg-[#0E111A] border-white/10 p-6 lg:p-8 rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col justify-between font-mono animate-in fade-in transition-all reveal" style={{ transitionDelay: '0.2s' }}>
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Global Activity Ledger</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">Live Connection</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {simulatedGlobalActivities.map((act, idx) => {
                      let tagColor = "text-primary bg-primary/10 border-primary/20";
                      if (act.type === "payment") tagColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                      if (act.type === "profit") tagColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                      if (act.type === "reward") tagColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                      
                      const isActive = activityIndex === idx;
                      
                      return (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: isActive ? 1 : 0.4, scale: isActive ? 1.01 : 1 }}
                          className={`flex items-center justify-between p-3 border rounded-2xl transition-all ${
                            isActive ? 'border-primary/30 bg-primary/5 shadow-md' : 'border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm shrink-0">{act.flag}</span>
                            <div>
                              <div className="text-xs font-bold text-white transition-all">
                                {act.country} Node
                              </div>
                              <div className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                                {act.action}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[9px] px-2 py-0.5 rounded-md border font-black uppercase ${tagColor}`}>
                              {act.val}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-semibold">
                              {act.time}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ======================================= */}
      {/* 10. CURATED EXQUISITE REWARDS SECTION   */}
      {/* ======================================= */}
      <section id="rewards" className="py-32 scroll-mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16 reveal">
            <Badge variant="outline" className="mb-4 border-emerald-500/20 text-emerald-400 bg-emerald-500/5 px-4 py-1.5 uppercase font-mono text-[10px] tracking-widest">
              Lifestyle Milestones
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
              Milestone Rewards Protocol
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Our automated system distributes prestigious prize redemptions straight to active miners. Check limits automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 xl:gap-4">
            {milestonePrizes.map((p, idx) => {
              const IconComp = p.icon;
              return (
                <Card 
                  key={idx} 
                  className="bg-[#0E111A] border-white/5 p-8 rounded-[2rem] text-center hover:border-primary/25 hover:-translate-y-2 transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none group-hover:bg-primary/10 transition-all" />
                  
                  <div className="inline-flex px-3 py-1 bg-primary/5 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-widest rounded-full mb-6 font-mono">
                    {p.tier}
                  </div>
                  
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5 text-primary group-hover:scale-110 transition-transform">
                    <IconComp className="w-5 h-5" />
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-xs text-[#8492a6] leading-relaxed mb-4">{p.desc}</p>
                  
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest border-t border-white/5 pt-4 block font-mono">
                    {p.tech}
                  </span>
                </Card>
              );
            })}
          </div>

        </div>
      </section>

      {/* ======================================= */}
      {/* 11. FAQ ACCORDION                      */}
      {/* ======================================= */}
      <section id="faq" className="py-32 scroll-mt-20 border-t border-white/5 bg-secondary/10 relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">
              Frequently Queried Specifications
            </h2>
            <p className="text-[#8492a6]">Detailed specifications behind the functional engine assets.</p>
          </div>

          <Card className="bg-[#0E111A] p-4 lg:p-6 rounded-3xl border border-white/5 shadow-sm">
            <div className="w-full space-y-1 divide-y divide-white/5">
              {faqsList.map((faq, i) => {
                const isOpen = openFaqIndexes.includes(i);
                return (
                  <div key={i} className="pt-2 first:pt-0 pb-2">
                    <button
                      onClick={() => {
                        if (openFaqIndexes.includes(i)) {
                          setOpenFaqIndexes([]);
                        } else {
                          setOpenFaqIndexes([i]);
                        }
                      }}
                      className="w-full text-left text-sm sm:text-base font-bold text-white hover:text-primary py-4 flex items-center justify-between transition-colors focus:outline-none"
                    >
                      <span className="pr-4">{faq.q}</span>
                      <span className={`text-xs ml-4 transition-transform duration-300 text-primary ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                        ▼
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed pb-3 text-left">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Card>

        </div>
      </section>

      {/* ======================================= */}
      {/* 12. FINAL CTA WITH GLOWING AI CORE      */}
      {/* ======================================= */}
      <section className="py-32 relative overflow-hidden bg-black/40 border-t border-white/5 z-10">
        
        {/* Hypnotic AI Core Particle Glow Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[160px] pointer-events-none animate-pulse" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-15 text-center flex flex-col items-center">
          
          <Badge variant="outline" className="mb-8 border-violet-500/20 text-violet-400 bg-violet-500/5 px-6 py-2 uppercase font-mono text-xs tracking-widest rounded-full shadow-sm">
            Autonomous Financial Era
          </Badge>
          
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white uppercase tracking-tight leading-[1.05] mb-8">
            Start Building <br />
            Intelligent Wealth Today
          </h2>
          
          <p className="text-base sm:text-lg text-[#8492a6] max-w-2xl mb-12 leading-relaxed">
            Mount your global ledger node in under 2 minutes. Secure allocation limits, determine payment intervals, and launch your automated compounding reserves.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-5 w-full max-w-sm">
            <Link to={user ? "/dashboard" : "/auth/signup"} className="block w-full">
              <Button size="lg" className="h-14 px-8 text-sm font-black uppercase tracking-widest bg-primary hover:bg-primary/95 text-white w-full rounded-full shadow-lg shadow-primary/25 transition-all">
                Get Started
              </Button>
            </Link>
          </div>

        </div>
      </section>

      {/* ======================================= */}
      {/* 13. POLISHED CORPORATE FOOTER           */}
      {/* ======================================= */}
      <footer className="pt-24 pb-12 bg-[#05050A] border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            
            {/* Logo and Tagline */}
            <div className="flex flex-col items-start gap-6">
              <Logo />
              <p className="text-xs text-[#8492a6] max-w-xs leading-relaxed text-left">
                Aetheris is a next-generation digital wealth platform, providing intelligent trading tools, market insights, and advanced financial technology for global users.
              </p>
            </div>

            {/* Links Column 1 */}
            <div className="text-left">
              <h4 className="text-white font-black uppercase text-xs tracking-widest mb-6">Platform</h4>
              <ul className="space-y-4 text-xs font-semibold">
                <li><a href="#about" className="text-muted-foreground hover:text-white transition-colors">Learn More</a></li>
                <li><a href="#features" className="text-muted-foreground hover:text-white transition-colors">Trade Features</a></li>
                <li><a href="#about-aetheris" className="text-muted-foreground hover:text-white transition-colors">About Aetheris</a></li>
              </ul>
            </div>

            {/* Links Column 2 */}
            <div className="text-left">
              <h4 className="text-white font-black uppercase text-xs tracking-widest mb-6">Support Channels</h4>
              <ul className="space-y-4 text-xs font-semibold">
                <li><a href="#contact" className="text-muted-foreground hover:text-white transition-colors">Contact</a></li>
                <li><a href="#support" className="text-muted-foreground hover:text-white transition-colors">Support Center</a></li>
                <li><a href="mailto:support@update.aetheriss.online" className="text-muted-foreground hover:text-white transition-colors">support@update.aetheriss.online</a></li>
              </ul>
            </div>

            {/* Links Column 3 */}
            <div className="text-left">
              <h4 className="text-white font-black uppercase text-xs tracking-widest mb-6">Legal</h4>
              <ul className="space-y-4 text-xs font-semibold">
                <li><Link to="/terms" className="text-muted-foreground hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <p className="text-[10px] text-muted-foreground/60 max-w-3xl leading-relaxed text-left">
              Disclaimer Statement: Aetheris operates strictly as an autonomous, performance-based digital network. Indicated target levels represents model projections and depend entirely on specific user milestone adherence indexes, execution thresholds, and market conditions. All deposits settled are final.
            </p>
            <p className="text-[10px] font-black text-muted-foreground font-mono uppercase tracking-widest whitespace-nowrap">
              © 2026 AETHERIS
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}

// Micro design components for clean execution
function ChipIndicator() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
    </span>
  );
}
