import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Activity, Zap, Shield, ChevronRight, CheckCircle2, Star, Car, Home as HomeIcon, Sun, BrainCircuit, Globe, TrendingUp, Hexagon, BarChart3, Clock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
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

const hardcodedPlans = [
  { name: "XAU Starter",  price: 5000, baseReturn: 100, maxBonus: 150, capacity: 85 },
  { name: "XAU Growth",   price: 15000, baseReturn: 100, maxBonus: 150, capacity: 92, popular: true },
  { name: "XAU Pro",      price: 50000, baseReturn: 100, maxBonus: 150, capacity: 64 },
  { name: "XAU Elite",    price: 100000, baseReturn: 100, maxBonus: 150, capacity: 40 },
  { name: "XAU Ultra",    price: 500000, baseReturn: 100, maxBonus: 150, capacity: 15 }
];

const rewards = [
  { tier: "25% Milestone", title: "Tech Ecosystem", desc: "Select from premium devices including the latest MacBook Pro or iPhone Pro.", icon: Zap },
  { tier: "50% Milestone", title: "Global Access", desc: "First-class travel vouchers and luxury resort experiences worldwide.", icon: Globe },
  { tier: "75% Milestone", title: "Premium Auto Pool", desc: "Access to our luxury vehicle fleet or an equivalent monthly lifestyle allowance.", icon: Car },
  { tier: "100% Milestone", title: "Real Estate Access", desc: "Significant capital contribution towards luxury real estate leasing or ownership.", icon: HomeIcon },
];

const faqs = [
  { q: "How does Aetheris generate profit?", a: "We use advanced AI-driven trading systems that operate across cryptocurrency markets, forex, and digital asset arbitrage. Our models execute high-frequency, low-risk trades." },
  { q: "Is my capital locked?", a: "Capital is allocated for the duration of the cycle depending on your plan. You fund it gradually via intervals and watch the profit grow progressively." },
  { q: "Are the returns guaranteed?", a: "Returns are variable and based on market performance. Aetheris provides projected growth ranges, not fixed guarantees. We prioritize capital preservation." },
  { q: "What is an Interval Bonus?", a: "To encourage disciplined growth, funding your plan via regular intervals (e.g., across 10-14 intervals) unlocks additional ROI bonuses, up to +150%." },
  { q: "What happens if I miss an interval payment?", a: "Each interval has a due date. Late payments may incur a 5%-10% penalty fee, and the status will be marked as overdue until resolved." }
];

export function Home() {
  const { hero } = useConfig();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();

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

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Hero Section */}
      <section className="relative w-full min-h-[95vh] flex items-center justify-center overflow-hidden pt-24 pb-12">
        {/* Soft Background Orbs */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        <div className="absolute inset-0 z-[-1] opacity-30 hero-fade-in mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)">
          {hero?.url ? (
            hero.type === 'image' ? (
              <img src={hero.url} alt="Background" className="object-cover w-full h-full grayscale-[30%]" crossOrigin="anonymous" />
            ) : (
              <video autoPlay loop muted playsInline className="object-cover w-full h-full grayscale-[30%]" src={hero.url} crossOrigin="anonymous" />
            )
          ) : null}
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center mt-[-8vh]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="flex flex-col items-center w-full max-w-4xl">
            
            <Badge variant="outline" className="mb-8 border-primary/20 text-primary bg-primary/5 px-6 py-2 uppercase tracking-widest text-xs rounded-full shadow-sm backdrop-blur-md">
              The Next Evolution of Digital Asset Growth
            </Badge>
            
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[1.05] text-foreground">
              Predictable Growth,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Intelligent Flow.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              A structured wealth-building ecosystem. Select a phase, commit to interval funding, and let our proprietary AI models compound your assets with absolute transparency.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link to={user ? "/dashboard" : "/auth"} className="w-full sm:w-auto">
                <Button size="lg" className="h-14 px-8 text-base bg-foreground hover:bg-foreground/90 text-background w-full uppercase tracking-wider rounded-full shadow-xl transition-all">
                  {user ? 'Enter Dashboard' : 'Start Your Cycle'}
                </Button>
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button size="lg" variant="ghost" className="h-14 px-8 text-base w-full uppercase tracking-wider rounded-full border border-border hover:bg-accent transition-all group">
                  See How It Works <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </div>

          </motion.div>
        </div>
      </section>

      {/* How it Works - Redesigned List Style */}
      <section id="how-it-works" className="py-32 bg-secondary/50 border-y border-border scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24 reveal">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">The Growth Protocol</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">A mechanical, disciplined approach to compounding value. Predictability through mathematics.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-24 items-center">
            
            {/* Step 1 */}
            <div className="order-2 md:order-1 reveal">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary font-bold text-xl mb-6 shadow-sm">01</div>
              <h3 className="text-2xl font-bold mb-4">Choose Your Tier</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Begin by selecting a structured XAU cycle that fits your capability—from the $5K Starter to the $500K Ultra phase. Each tier reserves your capacity in our liquidity engine.
              </p>
            </div>
            <div className="order-1 md:order-2 reveal bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-sm flex items-center justify-center h-64">
               <BarChart3 className="w-24 h-24 text-primary/30 drop-shadow-[0_0_15px_rgba(46,91,255,0.2)]" />
            </div>

            {/* Step 2 */}
            <div className="order-3 reveal bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-sm flex items-center justify-center h-64">
               <Clock className="w-24 h-24 text-primary/30 drop-shadow-[0_0_15px_rgba(46,91,255,0.2)]" />
            </div>
            <div className="order-4 reveal">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary font-bold text-xl mb-6 shadow-sm">02</div>
              <h3 className="text-2xl font-bold mb-4">Fund via Intervals</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Instead of a lump sum, commit to regular micro-deposits (intervals of 1 to 10 days). Consistency ensures liquidity balancing and unlocks massive interval bonuses up to 150%.
              </p>
            </div>

            {/* Step 3 */}
            <div className="order-6 md:order-5 reveal">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary font-bold text-xl mb-6 shadow-sm">03</div>
              <h3 className="text-2xl font-bold mb-4">Earn Projected Daily Yields</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                As intervals are completed, your deposits activate. The Aetheris AI routes your funds across market-neutral arbitrage strategies, paying out steady, verifiable progress directly to your wallet.
              </p>
            </div>
            <div className="order-5 md:order-6 reveal bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-sm flex items-center justify-center h-64">
               <Wallet className="w-24 h-24 text-primary/30 drop-shadow-[0_0_15px_rgba(46,91,255,0.2)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Plans Preview */}
      <section id="plans" className="py-32 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Active Cycles</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Lock your capacity. Commit to the intervals. Reach the projected targets.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 items-stretch">
            {hardcodedPlans.map((plan, i) => (
              <Card key={i} className={`relative w-full md:w-[320px] bg-card shadow-sm p-8 flex flex-col ${plan.popular ? 'border-primary shadow-lg ring-1 ring-primary/20 scale-105 z-10' : 'border-border'} transition-all duration-300 hover:-translate-y-2 reveal`} style={{ transitionDelay: `${i * 0.1}s` }}>
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                     <Badge className="bg-primary text-primary-foreground px-4 py-1.5 text-xs font-bold uppercase tracking-widest shadow-md">Most Selected</Badge>
                  </div>
                )}
                
                <div className="text-center mb-8 mt-2">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">{plan.name}</h3>
                  <div className="text-4xl font-black text-foreground tracking-tighter mb-2">
                    {formatCurrency(plan.price)}
                  </div>
                  <div className="inline-flex items-center justify-center bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                    {plan.baseReturn}% Base Target
                  </div>
                </div>
                
                <div className="space-y-4 mb-8 flex-1">
                  <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                    <span className="text-muted-foreground font-medium">Base Return:</span>
                    <span className="font-bold text-foreground">+{plan.baseReturn}%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-border pb-3">
                    <span className="text-muted-foreground font-medium">Max Interval Bonus:</span>
                    <span className="font-bold text-emerald-500">+{plan.maxBonus}%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2">
                    <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Total Potential:</span>
                    <span className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">{plan.baseReturn + plan.maxBonus}%</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="mb-6">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                      <span>Network Capacity</span>
                      <span>{plan.capacity}% Filled</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${plan.capacity}%` }} />
                    </div>
                  </div>

                  <Link to={user ? "/dashboard" : "/auth"}>
                    <Button className={`w-full h-12 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${plan.popular ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-primary/10 hover:bg-primary/20 text-primary border-transparent'}`}>
                      {user ? 'Enter Dashboard' : 'Select Plan'}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Profit Source Explanation */}
      <section className="py-32 reveal bg-secondary/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">How Aetheris Generates Value</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We bridge the gap between retail capital and institutional liquidity patterns. Using multi-layered AI models, Aetheris dynamically routes aggregated capital through high-probability, market-neutral channels.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shrink-0 border border-border shadow-sm"><BrainCircuit className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h4 className="text-base font-bold text-foreground mb-1">AI Market Analysis</h4>
                    <p className="text-sm text-muted-foreground">Deep-learning pattern recognition identifies micro-inefficiencies across forex and crypto pairs instantly.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shrink-0 border border-border shadow-sm"><Globe className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h4 className="text-base font-bold text-foreground mb-1">Global Arbitrage</h4>
                    <p className="text-sm text-muted-foreground">Simultaneous multi-exchange parsing allows execution of risk-averse, profitable margins continuously.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
               <Card className="bg-card border-border shadow-md p-8 rounded-[2rem] relative z-10 w-full max-w-lg mx-auto">
                 <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Live AI Engine Metrics</div>
                 <div className="space-y-6">
                   <div>
                     <div className="flex justify-between text-sm mb-2">
                       <span className="text-foreground font-medium">Capital Preservation Ratio</span>
                       <span className="font-bold text-emerald-500">99.8%</span>
                     </div>
                     <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full w-[99.8%]" /></div>
                   </div>
                   <div>
                     <div className="flex justify-between text-sm mb-2">
                       <span className="text-foreground font-medium">Arbitrage Velocity</span>
                       <span className="font-bold text-primary">0.4ms avg</span>
                     </div>
                     <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full w-[85%]" /></div>
                   </div>
                   <div>
                     <div className="flex justify-between text-sm mb-2">
                       <span className="text-foreground font-medium">Interval Adherence Bonus Pool</span>
                       <span className="font-bold text-blue-500">Active</span>
                     </div>
                     <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full w-full" /></div>
                   </div>
                 </div>
               </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Rewards Showcase */}
      <section id="rewards" className="py-32 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Milestone Rewards</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Physical and lifestyle milestones unlock automatically as you complete interval progression.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {rewards.map((reward, i) => (
              <Card key={i} className="bg-card shadow-sm p-8 rounded-[2rem] border border-border text-center reveal hover:-translate-y-2 transition-transform duration-300" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="inline-flex px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full mb-6">
                  {reward.tier}
                </div>
                <h4 className="text-lg font-bold text-foreground mb-3">{reward.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{reward.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 scroll-mt-20 border-t border-border bg-secondary/30 reveal">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">Common Inquiries</h2>
            <p className="text-muted-foreground">Understanding the core mechanics.</p>
          </div>
          <Card className="bg-card p-4 rounded-3xl border border-border shadow-sm">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-border last:border-0 px-4">
                  <AccordionTrigger className="text-left text-base font-bold text-foreground hover:no-underline hover:text-primary py-6 transition-colors">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-6">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-24 pb-12 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="flex flex-col gap-6">
              <Logo />
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">Intelligent workflow and systematic digital asset management powered by algorithmic execution.</p>
            </div>

            <div>
              <h4 className="text-foreground font-bold mb-6 uppercase text-xs tracking-widest">Protocol</h4>
              <ul className="space-y-4">
                <li><a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">How It Works</a></li>
                <li><a href="#plans" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Cycles & Plans</a></li>
                <li><a href="#rewards" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Milestones</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-foreground font-bold mb-6 uppercase text-xs tracking-widest">Support</h4>
              <ul className="space-y-4">
                <li><a href="#faq" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">FAQ</a></li>
                <li><a href="mailto:support@aetherisvault.net" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Contact Us</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-foreground font-bold mb-6 uppercase text-xs tracking-widest">Legal</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Terms of Service</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-[11px] text-muted-foreground/60 max-w-2xl leading-relaxed">
              Disclaimer: Aetheris is a performance-based digital network. Projected returns represent potential and depend strictly on user timeline adherence and market engine stability. 
            </p>
            <p className="text-[11px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-wider">© 2026 Aetheris</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
