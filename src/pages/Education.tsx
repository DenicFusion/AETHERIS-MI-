import React from 'react';
import { BookOpen, Shield, BarChart, FileText, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

export function Education() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-24 selection:bg-primary/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-300">Hub & Resources</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">Trust & Education</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Understand our AI trading infrastructure, capital allocation processes, and platform guidelines. 
            We empower informed participation through complete transparency.
          </p>
        </div>

        <div className="space-y-16">
           
           {/* Section 1: About */}
           <section>
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tight flex items-center gap-3"><Shield className="text-primary w-8 h-8" /> About Aetheris</h2>
              <div className="bg-white/5 border border-white/10 p-8 rounded-2xl text-gray-300 leading-relaxed space-y-4">
                 <p>
                   Aetheris is a next-generation fintech ecosystem designed to bridge the gap between institutional-grade quantitative trading and retail access. 
                   Our mission is to democratize advanced algorithmic strategies.
                 </p>
                 <p>
                   Unlike traditional high-risk platforms that rely on aggressive marketing, Aetheris is built on structural sustainability, employing rigorous risk-adjusted portfolio management and automated market intelligence.
                   Our revenue generation is purely outcome-based.
                 </p>
              </div>
           </section>

           {/* Section 2: How it works flow */}
           <section>
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tight flex items-center gap-3"><BarChart className="text-primary w-8 h-8" /> How Aetheris Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { step: "01. Capital Allocation", desc: "Deposits are aggregated into structured liquidity pools securely." },
                   { step: "02. Market Intelligence", desc: "AI engines scan multi-asset markets for statistical anomalies and trends." },
                   { step: "03. Trade Execution", desc: "Sub-millisecond automated execution optimizes entry and exit." },
                   { step: "04. Risk Management", desc: "Dynamic hedging protects downside across volatile asset classes." },
                   { step: "05. Performance Tracking", desc: "Live yield updates are reflected in your personalized dashboard." },
                   { step: "06. Outcome Distribution", desc: "Profits are cleared and ready for immediate withdrawal processing." }
                 ].map((item, i) => (
                    <div key={i} className="bg-black/40 border border-white/5 p-6 rounded-xl">
                       <p className="font-black text-primary mb-2 text-sm md:text-base">{item.step}</p>
                       <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                 ))}
              </div>
           </section>

           {/* Section 3: FAQ */}
           <section>
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tight flex items-center gap-3"><FileText className="text-primary w-8 h-8" /> Frequently Asked Questions</h2>
              <div className="divide-y divide-white/10 border-t border-white/10">
                 <FaqItem question="How are profit projections calculated?" answer="Projections are built on historical AI performance models. They are variable based on market volatility and are not absolute guarantees, though our algorithms aim to stabilize returns." />
                 <FaqItem question="How do withdrawals work?" answer="Profits and mature capitals move to your Available Balance. Withdrawals are processed rapidly through our payout infrastructure, typically within minutes depending on network conditions." />
                 <FaqItem question="What is the referral system?" answer="We operate a transparent affiliate model. You earn direct commissions on the deposits of users you invite. This does not subtract from their capital and is paid purely from our marketing operational funds." />
                 <FaqItem question="Is there risk involved?" answer="Yes. All financial market activity carries inherent risk. Aetheris mitigates this through advanced capital protection strategies and diversification, but users should only commit funds aligned with their risk tolerance." />
              </div>
           </section>

           {/* Section 4: Legal & Compliance */}
           <section className="bg-primary/5 border border-primary/20 p-8 rounded-2xl">
               <h2 className="text-xl font-black mb-4 uppercase tracking-tight text-primary">Legal & Compliance</h2>
               <div className="flex flex-wrap gap-4">
                  <a href="/terms" className="text-sm font-bold underline hover:text-white text-gray-400 disabled">Terms of Service</a>
                  <a href="/privacy" className="text-sm font-bold underline hover:text-white text-gray-400 disabled">Privacy Policy</a>
                  <span className="text-sm font-bold text-gray-400">Risk Disclosure Statement</span>
                  <span className="text-sm font-bold text-gray-400">Transparency Guidelines</span>
               </div>
               <p className="text-xs text-gray-500 mt-6">
                 The information provided on Aetheris is for educational and platform operational purposes. It does not constitute formal financial advice.
               </p>
           </section>

        </div>
      </div>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="py-5 cursor-pointer group" onClick={() => setOpen(!open)}>
       <div className="flex justify-between items-center">
          <p className="font-bold text-lg group-hover:text-primary transition-colors">{question}</p>
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : 'text-gray-500'}`} />
       </div>
       {open && (
         <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="pt-3 text-gray-400 text-sm md:text-base leading-relaxed pr-8">
            {answer}
         </motion.div>
       )}
    </div>
  )
}
