import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, ArrowDownRight, ArrowUpRight, Gift, UserPlus, Zap } from 'lucide-react';

const COUNTRY_FLAGS: Record<string, string> = {
  "US": "🇺🇸",
  "GB": "🇬🇧",
  "AE": "🇦🇪",
  "JP": "🇯🇵",
  "CN": "🇨🇳",
  "WA": "🏴",
  "DE": "🇩🇪",
  "CA": "🇨🇦",
  "AU": "🇦🇺",
  "SG": "🇸🇬",
  "NG": "🇳🇬"
};

const GLOBAL_NAMES: Record<string, string[]> = {
  "US": ["Michael", "Jessica", "David", "Sarah", "James", "Emily", "John", "Emma", "Robert", "Olivia"],
  "GB": ["Oliver", "Amelia", "Harry", "Isla", "Jack", "Ava", "George", "Mia", "Noah", "Grace"],
  "AE": ["Zayed", "Fatima", "Hamdan", "Maryam", "Rashid", "Latifa", "Saeed", "Maitha", "Sultan", "Shamma"],
  "JP": ["Hiroshi", "Yuki", "Kenji", "Sakura", "Takashi", "Hana", "Satoshi", "Yui", "Kazuki", "Mei"],
  "CN": ["Wei", "Li", "Bo", "Ying", "Qiang", "Yan", "Jian", "Xia", "Feng", "Ling"],
  "WA": ["Dylan", "Cerys", "Rhys", "Megan", "Owen", "Sian", "Gareth", "Elwen", "Iwan", "Eira"],
  "DE": ["Lukas", "Sophie", "Leon", "Marie", "Maximilian", "Mia", "Paul", "Emma", "Felix", "Hannah"],
  "CA": ["Liam", "Emma", "Noel", "Olivia", "William", "Sophia", "Benjamin", "Charlotte", "Lucas", "Amelia"],
  "AU": ["Oliver", "Charlotte", "William", "Amelia", "Jack", "Mia", "Noah", "Ava", "Thomas", "Chloe"],
  "SG": ["Wei Jie", "Sheryl", "Jun Jie", "Hui Min", "Darren", "Chloe", "Marcus", "Amanda", "Ethan", "Rachel"],
  "NG": ["Chinedu", "Amina", "Samuel", "Ngozi", "Emeka", "Fatima", "Oluwaseun", "Zainab", "Ibrahim", "Chinwe"]
};

const COUNTRIES = Object.keys(GLOBAL_NAMES);
const PLANS = ["STARTER", "CORE", "PRIME", "QUANTUM", "APEX", "ULTRA"];
const ACTIONS = [
  { type: "activation", template: "activated {plan}", icon: Zap, color: "text-primary", bg: "bg-primary/20" },
  { type: "withdrawal", template: "completed a withdrawal of ${amount}", icon: ArrowUpRight, color: "text-red-400", bg: "bg-red-400/20" },
  { type: "joined", template: "joined Aetheris", icon: UserPlus, color: "text-blue-400", bg: "bg-blue-400/20" },
  { type: "reward", template: "earned a milestone referral reward", icon: Gift, color: "text-amber-400", bg: "bg-amber-400/20" },
  { type: "completed", template: "completed a trading cycle", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/20" },
  { type: "deposit", template: "invested ${amount} in {plan}", icon: ArrowDownRight, color: "text-emerald-400", bg: "bg-emerald-400/20" }
];

export function LiveActivityFeed() {
  const [currentActivity, setCurrentActivity] = useState<any>(null);
  const [visitorCountry, setVisitorCountry] = useState<string>("US");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes("Europe/Berlin")) setVisitorCountry("DE");
      if (tz.includes("Africa/Lagos")) setVisitorCountry("NG");
      if (tz.includes("America/Toronto")) setVisitorCountry("CA");
      if (tz.includes("Europe/London")) setVisitorCountry("GB");
      if (tz.includes("Australia/Sydney")) setVisitorCountry("AU");
      if (tz.includes("Asia/Singapore")) setVisitorCountry("SG");
    } catch(e) {}

    let timeoutId: NodeJS.Timeout;

    const generateActivity = () => {
      // Prioritize premium global locations, severely limit Nigerian appearances (at most once/3h) via persistent timestamp guard
      let selectedCountry = "";
      const premiumKeys = ["US", "GB", "AE", "JP", "CN", "WA", "DE", "CA", "AU", "SG"];
      
      const lastNgStr = localStorage.getItem("last_ng_activity_time");
      const hoursSinceNg = lastNgStr ? (Date.now() - Number(lastNgStr)) / (1000 * 60 * 60) : 999;
      
      if (hoursSinceNg >= 3 && Math.random() < 0.015) {
        selectedCountry = "NG";
        localStorage.setItem("last_ng_activity_time", String(Date.now()));
      } else {
        selectedCountry = premiumKeys[Math.floor(Math.random() * premiumKeys.length)];
      }

      const names = GLOBAL_NAMES[selectedCountry] || GLOBAL_NAMES["US"];
      const name = names[Math.floor(Math.random() * names.length)];
      const actionObj = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      const plan = PLANS[Math.floor(Math.random() * PLANS.length)];
      
      // Minimum withdrawal $5,000 constraint
      let amount = "";
      if (actionObj.type === "withdrawal") {
        amount = (Math.floor(Math.random() * 30 + 5) * 1000).toLocaleString(); // $5,000 to $34,000
      } else {
        amount = (Math.floor(Math.random() * 45 + 1) * 1000).toLocaleString(); // $1,000 to $45,000
      }
      
      let text = actionObj.template.replace("{plan}", plan).replace("{amount}", amount);

      const newActivity = {
         id: Math.random().toString(),
         name,
         text,
         countryCode: selectedCountry,
         flag: COUNTRY_FLAGS[selectedCountry] || "🌐",
         icon: actionObj.icon,
         color: actionObj.color,
         bg: actionObj.bg,
         time: Math.floor(Math.random() * 10) + 1 + " min ago"
      };

      setCurrentActivity(newActivity);

      // Keep it visible for 5-8 seconds, then hide it
      const visibleDuration = Math.floor(Math.random() * 3000) + 5000;
      setTimeout(() => {
        setCurrentActivity(null);
        // Wait a random delay (3-10 seconds) before showing the next one
        const nextDelay = Math.floor(Math.random() * 7000) + 3000;
        timeoutId = setTimeout(generateActivity, nextDelay);
      }, visibleDuration);
    };

    // Initial delay before first popup
    timeoutId = setTimeout(generateActivity, 2000);

    return () => clearTimeout(timeoutId);
  }, [visitorCountry]);

  return (
    <div className="fixed bottom-[104px] left-1/2 -translate-x-1/2 md:translate-x-0 md:left-6 md:bottom-6 z-50 pointer-events-none">
       <AnimatePresence>
          {currentActivity && (
             <motion.div 
               key={currentActivity.id}
               initial={{ opacity: 0, y: 20, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 10, scale: 0.95 }}
               transition={{ type: "spring", stiffness: 300, damping: 25 }}
               className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 md:p-4 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 w-auto max-w-[calc(100vw-2rem)] min-w-[280px] sm:min-w-[320px] md:min-w-[340px] pointer-events-auto"
             >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${currentActivity.bg}`}>
                   <currentActivity.icon className={`w-5 h-5 ${currentActivity.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-sm md:text-base font-medium text-white truncate">
                     {currentActivity.name} <span title={currentActivity.countryCode}>{currentActivity.flag}</span>
                   </p>
                   <p className="text-xs md:text-sm text-gray-400 truncate">
                     {currentActivity.text}
                   </p>
                </div>
                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider shrink-0 text-right self-start mt-1">
                   {currentActivity.time}
                   <div className="flex items-center gap-1 justify-end mt-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[8px] text-emerald-500 leading-none">VERIFIED</span>
                   </div>
                </div>
             </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
