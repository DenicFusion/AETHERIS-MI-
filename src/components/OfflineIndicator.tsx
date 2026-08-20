import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
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
           initial={{ y: -50, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: -50, opacity: 0 }}
           className="fixed top-0 left-0 right-0 z-[9999] bg-rose-500 text-white text-xs font-bold uppercase tracking-widest text-center py-2 flex items-center justify-center gap-2 shadow-lg"
        >
          <WifiOff className="w-4 h-4" />
          Offline Mode - Retrying Connection...
        </motion.div>
      )}
    </AnimatePresence>
  );
}
