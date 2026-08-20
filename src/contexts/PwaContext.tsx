import React, { createContext, useContext, useState, useEffect } from "react";
import { X, Share2, PlusSquare, Settings, Square, Chrome, Smartphone, Compass, Download, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";

interface PwaContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  promptInstall: () => Promise<void>;
  showInstructions: boolean;
  closeInstructions: () => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showSmartBanner, setShowSmartBanner] = useState<boolean>(false);
  const [dismissPeriodDays, setDismissPeriodDays] = useState<number>(7);

  useEffect(() => {
    // 1. Detect Standalone / Installed state
    const checkStandAlone = () => {
      if (typeof window === "undefined") return false;
      const isStandaloneElement = window.matchMedia("(display-mode: standalone)").matches;
      const navStandalone = (navigator as any).standalone;
      const hasPwaQuery = window.location.search.includes("source=pwa") || window.location.search.includes("utm_source=pwa");
      const installed = !!(isStandaloneElement || navStandalone || hasPwaQuery);
      setIsInstalled(installed);
      return installed;
    };

    const alreadyInstalled = checkStandAlone();

    // 2. Detect OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // If already installed, don't show custom install options
    if (alreadyInstalled) {
      setIsInstallable(false);
      return;
    }

    // 3. Listen for native browser PWA install event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isIosDevice) {
      setIsInstallable(true);
    } else {
      setIsInstallable(true);
    }

    // Handle display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (e.matches) {
        setIsInstallable(false);
        setShowSmartBanner(false);
      }
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  // 4. Fetch Configurable Dismissal Period from Firestore config/global snap
  useEffect(() => {
    try {
      const configRef = doc(db, "config", "global");
      const unsubscribe = onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pwa_banner_dismiss_days !== undefined) {
            setDismissPeriodDays(Number(data.pwa_banner_dismiss_days));
          }
        }
      }, (err) => console.warn("PwaContext snapshot error:", err));
      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to read global config snapshot in PwaContext:", e);
    }
  }, []);

  // 5. Smart Install Banner Delay Trigger
  useEffect(() => {
    if (isInstalled) return;

    // Check if user dismissed recently
    const dismissedUntil = localStorage.getItem("aetheris_pwa_banner_dismissed_until");
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // Show banner after a short 3-second delay
    const timer = setTimeout(() => {
      setShowSmartBanner(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
        setShowSmartBanner(false);
      }
    } else if (isIOS) {
      setShowInstructions(true);
      setShowSmartBanner(false);
    } else {
      setShowInstructions(true);
      setShowSmartBanner(false);
    }
  };

  const handleDismissBanner = () => {
    setShowSmartBanner(false);
    const hideDurationMs = dismissPeriodDays * 24 * 60 * 60 * 1000;
    const hideUntil = Date.now() + hideDurationMs;
    localStorage.setItem("aetheris_pwa_banner_dismissed_until", hideUntil.toString());
    toast.info(`Install banner hidden for ${dismissPeriodDays} days.`);
  };

  const closeInstructions = () => {
    setShowInstructions(false);
  };

  return (
    <PwaContext.Provider
      value={{
        isInstalled,
        isInstallable,
        isIOS,
        isAndroid,
        promptInstall,
        showInstructions,
        closeInstructions,
      }}
    >
      {children}

      {/* 1. Smart Automated Install Banner */}
      <AnimatePresence>
        {showSmartBanner && !isInstalled && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-[#0F1221]/95 border border-white/10 p-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl z-[9000] text-white flex gap-4 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            
            {/* Logo */}
            <div className="w-12 h-12 rounded-xl bg-black overflow-hidden border border-white/10 shadow-[0_0_15px_rgba(139,92,246,0.3)] shrink-0 flex items-center justify-center">
              <img src="/AEfavicon.png" alt="Aetheris Icon" className="w-full h-full object-contain p-1" />
            </div>

            {/* Description */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 uppercase italic">
                Install Aetheris App
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                Get faster access, biometric login, instant notifications, and a full-screen experience.
              </p>
              
              {/* Buttons */}
              <div className="mt-3.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={promptInstall}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-black text-[10px] uppercase tracking-wider transition-colors shadow-lg"
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-[10px] uppercase tracking-wider transition-colors border border-white/5"
                >
                  Not Now
                </button>
              </div>
            </div>

            {/* Dismiss Close Top Icon */}
            <button
              onClick={handleDismissBanner}
              className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Premium iOS Install Modal */}
      <AnimatePresence>
        {showInstructions && isIOS && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={closeInstructions}
              className="absolute inset-0 bg-[#060814]/90 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-[#131622]/95 border border-white/10 rounded-3xl p-6 shadow-[0_0_50px_rgba(30,80,255,0.15)] backdrop-blur-xl z-10 text-white overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={closeInstructions}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white bg-[#1F2336]/50 p-2 rounded-full border border-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-16 h-16 rounded-2xl bg-black overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.3)] mb-4 shrink-0 flex items-center justify-center p-2">
                  <img src="/AEfavicon.png" alt="Aetheris Icon" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white mb-1">Install Aetheris App</h3>
                <p className="text-xs text-muted-foreground max-w-xs mb-6Leading-relaxed">
                  Add Aetheris App to your home screen for full standalone experience, biometric security, and trading push notifications.
                </p>
              </div>

              {/* OS Specific Guidelines */}
              <div className="space-y-4 text-xs bg-black/30 border border-white/5 p-4 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1F2336] flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    1
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    Tap the {isIOS ? <span className="text-primary font-semibold inline-flex items-center gap-1 mx-1 px-1 py-0.5 rounded bg-white/5 border border-white/10"><Compass className="w-3.5 h-3.5 inline text-blue-400" /> Share</span> : <span className="text-primary font-semibold mx-1">Browser Menu (3 dots)</span>} button.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1F2336] flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    2
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    Scroll down and select <span className="text-white font-semibold">{isIOS ? "Add to Home Screen" : "Install App"}</span>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1F2336] flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                    3
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    Tap <span className="text-primary font-semibold">Add / Install</span> to secure the standalone application.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={closeInstructions}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-wider transition-colors"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (context === undefined) {
    throw new Error("usePwa must be used within a PwaProvider");
  }
  return context;
}
