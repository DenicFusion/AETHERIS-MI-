import { useState, useEffect } from 'react';
import { CloudOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
           initial={{ y: -30, opacity: 0, scale: 0.95 }}
           animate={{ y: 0, opacity: 1, scale: 1 }}
           exit={{ y: -30, opacity: 0, scale: 0.95 }}
           transition={{ duration: 0.25, ease: 'easeOut' }}
           className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex items-center justify-center max-w-[92vw]"
        >
          <div className="bg-[#0D111D]/95 backdrop-blur-md border border-amber-500/30 text-amber-200/90 text-xs px-3.5 py-1.5 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.8),0_0_12px_rgba(245,158,11,0.15)] flex items-center gap-2 font-medium tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">Connection interrupted — reconnecting...</span>
            <Loader2 className="w-3 h-3 text-amber-400/80 animate-spin shrink-0 ml-0.5" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

