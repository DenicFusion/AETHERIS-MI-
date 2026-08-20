import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 400); // 0.4s logo pulse
    const timer2 = setTimeout(() => setStage(2), 900); // 0.9s "Securing Connection..."
    const timer3 = setTimeout(() => onComplete(), 1400); // 1.4s done
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[9999] bg-[#0E111A] flex flex-col items-center justify-center isolate"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-50" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center"
        >
          <Logo className="h-16 md:h-20 mb-8 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
          
          <div className="h-6 overflow-hidden flex items-center justify-center">
            <AnimatePresence mode="wait">
              {stage === 0 && (
                 <motion.p key="init" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                   Initializing Engine...
                 </motion.p>
              )}
              {stage >= 1 && (
                 <motion.p key="secure" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-xs text-emerald-400/80 uppercase tracking-widest font-mono flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   Securing Connection...
                 </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
