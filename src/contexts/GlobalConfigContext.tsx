import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getInstantCachedAsset } from '@/lib/assetCache';

export interface ManualPaymentMethod {
  id: string;
  method_name: string;
  wallet_address: string;
  qr_code_url: string;
  currency: 'USD' | 'GBP' | 'EUR' | string;
  details?: string;
  active: boolean;
}

interface GlobalConfigContextType {
  branding: {
    mainLogoUrl: string | null;
    logoHeight: number;
    faviconUrl: string | null;
  };
  hero: {
    url: string | null;
    type: string | null;
  };
  maintenanceMode: boolean;
  gateways: {
    fiat: boolean;
    crypto: boolean;
  };
  isAppReady: boolean;
}

const GlobalConfigContext = createContext<GlobalConfigContextType | undefined>(undefined);

export const GlobalConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load cached settings immediately for instant paint
  const [branding, setBranding] = useState(() => {
    try {
      const cached = localStorage.getItem('aetheris_branding_config');
      if (cached) {
        const data = JSON.parse(cached);
        return {
          mainLogoUrl: getInstantCachedAsset(data.main_logo_url, 'logo'),
          logoHeight: data.logo_height || 32,
          faviconUrl: data.favicon_url || null
        };
      }
    } catch (e) {}
    return { mainLogoUrl: "/AEfavicon.png", logoHeight: 32, faviconUrl: null };
  });

  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    
    if (branding.faviconUrl) {
      link.href = branding.faviconUrl;
    } else {
      link.href = "/AEfavicon.png"; // Default Aetheris favicon fallback
    }

    // Dynamic OG Image based on main logo
    const ogImage = document.querySelector("meta[property='og:image']");
    const twitterImage = document.querySelector("meta[name='twitter:image']") || document.querySelector("meta[property='twitter:image']");
    const logoUrl = branding.mainLogoUrl || "https://aetheriss.online/AEfavicon.png";
    if (ogImage) ogImage.setAttribute("content", logoUrl);
    if (twitterImage) twitterImage.setAttribute("content", logoUrl);

  }, [branding.faviconUrl, branding.mainLogoUrl]);

  const [hero, setHero] = useState(() => {
    try {
      const cached = localStorage.getItem('aetheris_global_config');
      if (cached) {
        const data = JSON.parse(cached);
        return {
          url: getInstantCachedAsset(data.heroMediaUrl, 'hero'),
          type: data.heroMediaType || null
        };
      }
    } catch (e) {}
    return { url: "/AEhero.jpg", type: "image" };
  });

  const [maintenanceMode, setMaintenanceMode] = useState(() => {
    try {
      const cached = localStorage.getItem('aetheris_global_config');
      if (cached) {
        const data = JSON.parse(cached);
        return data.maintenanceMode || false;
      }
    } catch (e) {}
    return false;
  });

  const [gateways, setGateways] = useState(() => {
    try {
      const cached = localStorage.getItem('aetheris_global_config');
      if (cached) {
        const data = JSON.parse(cached);
        return data.paymentGateways || { fiat: true, crypto: true };
      }
    } catch (e) {}
    return { fiat: true, crypto: true };
  });

  const [isBrandingLoaded, setIsBrandingLoaded] = useState(() => {
    try {
      return !!localStorage.getItem('aetheris_branding_config');
    } catch (e) {
      return false;
    }
  });

  const [isGlobalLoaded, setIsGlobalLoaded] = useState(() => {
    try {
      return !!localStorage.getItem('aetheris_global_config');
    } catch (e) {
      return false;
    }
  });

  const [isAppReady, setIsAppReady] = useState(true);

  // Branding Snapshot (Non-blocking update)
  useEffect(() => {
    const brandingRef = doc(db, 'settings', 'branding');
    const unsubscribe = onSnapshot(brandingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const logoUrl = data.main_logo_url || null;
        const logoHeight = data.logo_height || 32;
        const faviconUrl = data.favicon_url || null;

        const resolvedLogo = getInstantCachedAsset(logoUrl, 'logo');
        setBranding({
          mainLogoUrl: resolvedLogo,
          logoHeight: logoHeight,
          faviconUrl: faviconUrl
        });

        try {
          localStorage.setItem('aetheris_branding_config', JSON.stringify({
            main_logo_url: logoUrl,
            logo_height: logoHeight,
            favicon_url: faviconUrl
          }));
        } catch (e) {}
      } else {
        setBranding({
          mainLogoUrl: "/AEfavicon.png",
          logoHeight: 32,
          faviconUrl: null
        });
      }
      setIsBrandingLoaded(true);
    }, (error) => {
      console.error("Branding snapshot error:", error);
      setIsBrandingLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Global Config Snapshot (Non-blocking update)
  useEffect(() => {
    const globalRef = doc(db, 'config', 'global');
    const unsubscribe = onSnapshot(globalRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const heroUrl = data.heroMediaUrl || null;
        const heroType = data.heroMediaType || null;
        const isMaint = data.maintenanceMode || false;
        const payGateways = data.paymentGateways || { fiat: true, crypto: true };
        const googleVerification = data.googleSiteVerification || "googlea1e2c068861bdb10.html";

        const resolvedHero = getInstantCachedAsset(heroUrl, 'hero');
        setHero({
          url: resolvedHero,
          type: heroType,
        });
        setMaintenanceMode(isMaint);
        setGateways(payGateways);

        const googleMeta = document.querySelector("meta[name='google-site-verification']");
        if (googleMeta) {
          googleMeta.setAttribute("content", googleVerification);
        }

        try {
          localStorage.setItem('aetheris_global_config', JSON.stringify({
            heroMediaUrl: heroUrl,
            heroMediaType: heroType,
            maintenanceMode: isMaint,
            paymentGateways: payGateways
          }));
        } catch (e) {}
      }
      setIsGlobalLoaded(true);
    }, (error) => {
      console.error("Global config snapshot error:", error);
      setIsGlobalLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // App Ready Logic
  useEffect(() => {
    if (isBrandingLoaded && isGlobalLoaded) {
      setIsAppReady(true);
    }
  }, [isBrandingLoaded, isGlobalLoaded]);

  return (
    <GlobalConfigContext.Provider value={{
      branding,
      hero,
      maintenanceMode,
      gateways,
      isAppReady
    }}>
      {children}
    </GlobalConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(GlobalConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a GlobalConfigProvider');
  }
  return context;
};
