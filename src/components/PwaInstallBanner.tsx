import { useState, useEffect } from "react";
import { X, ExternalLink, Download } from "lucide-react";
import { Button } from "./ui/button";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check dismissed state
    if (localStorage.getItem("aetheris_pwa_dismissed") === "true") return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isIosDevice) {
       // iOS doesn't fire beforeinstallprompt. Just show the banner for manual instructions.
       setTimeout(() => setShowBanner(true), 1500);
    } // Desktop/Android will rely on the event. For testing/forced banner, could always show it.

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
       // Typically you show a specific iOS instruction overlay here.
       alert("To install Aetheris App:\n1. Tap the Share icon at the bottom of Safari.\n2. Tap 'Add to Home Screen'.");
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("aetheris_pwa_dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 sm:bottom-4 sm:right-4 left-0 sm:left-auto w-full sm:w-[400px] z-[100] px-4 py-4 sm:p-0">
      <div className="bg-[#1C1F26]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex gap-4 items-center">
        <div className="w-12 h-12 rounded-xl bg-black overflow-hidden shrink-0 border border-white/10 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
          <img src="/AEfavicon.png" alt="Aetheris App" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-bold text-sm tracking-tight mb-0.5">Install Aetheris App</h4>
          <p className="text-xs text-muted-foreground leading-snug">Get fast access, push notifications, and a full-screen experience.</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button onClick={handleInstallClick} size="sm" className="bg-primary hover:bg-primary/90 text-white h-8 px-4 text-xs font-bold w-full">
            Install
          </Button>
        </div>
        <button onClick={dismissBanner} className="absolute -top-2 -right-2 w-6 h-6 bg-[#2C2F36] border border-white/10 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-black/80 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
