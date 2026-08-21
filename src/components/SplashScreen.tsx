import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 700);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-0 z-[9999] bg-[#070b14] flex items-center justify-center isolate select-none overflow-hidden"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        {/* Ambient subtle glow background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none" />

        {/* Loading cycle alone */}
        <div className="relative flex items-center justify-center">
          {/* Outer track */}
          <div className="w-10 h-10 rounded-full border-2 border-primary/15" />
          {/* Active spinning cycle ring */}
          <div className="absolute w-10 h-10 rounded-full border-2 border-transparent border-t-primary border-r-primary/70 animate-spin" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

