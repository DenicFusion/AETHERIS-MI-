import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, setDoc, updateDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const isBot = () => {
  if (typeof window === 'undefined') return true;
  const ua = navigator.userAgent.toLowerCase();
  if (navigator.webdriver) return true;
  const botPatterns = [
    'bot', 'spider', 'crawler', 'crawl', 'slurp', 'mediapartners', 'lighthouse', 'google', 
    'bing', 'yahoo', 'duckduck', 'baidu', 'yandex', 'headless', 'puppeteer', 'selenium',
    'pingdom', 'sentry'
  ];
  return botPatterns.some(pattern => ua.includes(pattern));
};

const getDeviceDetails = () => {
  const ua = navigator.userAgent;
  let deviceType = "Desktop";
  if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    deviceType = "Mobile";
  } else if (/Tablet|iPad|PlayBook|Silk/i.test(ua)) {
    deviceType = "Tablet";
  }

  let browser = "Others";
  if (ua.includes("Chrome") && !ua.includes("Chromium") && !ua.includes("Edg")) {
    browser = "Chrome";
  } else if (ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Edg")) {
    browser = "Safari";
  } else if (ua.includes("Firefox")) {
    browser = "Firefox";
  } else if (ua.includes("Edg")) {
    browser = "Edge";
  } else if (ua.includes("OPR") || ua.includes("Opera")) {
    browser = "Opera";
  }

  let os = "Others";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";

  return { deviceType, browser, os };
};

const getTrafficSource = () => {
  const ref = document.referrer;
  if (!ref) return { source: "Direct Traffic", keywords: "None" };

  try {
    const url = new URL(ref);
    const host = url.hostname.toLowerCase();
    
    // Parse SEO keywords out of search query parameters to support SEO indicators
    const searchParams = new URLSearchParams(window.location.search);
    let keywords = "Locked/Hidden Query";
    const possibleKeys = ["utm_term", "q", "query", "term", "search_query", "keywords"];
    for (const key of possibleKeys) {
      if (searchParams.has(key)) {
        keywords = searchParams.get(key) || keywords;
        break;
      }
    }

    if (host.includes("google.")) {
      return { source: "Google Search", keywords };
    }
    if (host.includes("bing.")) {
      return { source: "Bing Search", keywords };
    }
    if (host.includes("yahoo.")) {
      return { source: "Other Search", keywords };
    }
    if (
      host.includes("facebook.com") || 
      host.includes("instagram.com") || 
      host.includes("twitter.com") || 
      host.includes("t.co") || 
      host.includes("linkedin.com") || 
      host.includes("reddit.com") ||
      host.includes("tiktok.com")
    ) {
      return { source: "Social Media", keywords: "None (Social Network Referral)" };
    }

    return { source: "Referrals", keywords: "None (Direct Link)" };
  } catch {
    return { source: "Other Sources", keywords: "None" };
  }
};

const getGeoDetails = async () => {
  const cached = sessionStorage.getItem('aetheris_geo_details');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  // Fallbacks for safe HTTPS IP geo APIs
  const apis = [
    'https://ipapi.co/json/',
    'https://ip-api.com/json/'
  ];

  for (const url of apis) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const details = {
          country: data.country_name || data.country || "United States",
          region: data.region || data.regionName || "California",
          city: data.city || "San Francisco",
          isp: data.org || data.isp || "Cloud Ingress Providers"
        };
        sessionStorage.setItem('aetheris_geo_details', JSON.stringify(details));
        return details;
      }
    } catch (e) {
      console.warn(`Geolocation lookup failed on ${url}`, e);
    }
  }

  return {
    country: "United States",
    region: "California",
    city: "San Francisco",
    isp: "Simulated Provider"
  };
};

export function useVisitorTracker(user: any, isAdmin: boolean) {
  const location = useLocation();
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Prevent bot traffic simulation and inflation
    if (isBot()) return;

    let visitorId = localStorage.getItem('aetheris_visitor_id');
    let isReturning = true;
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('aetheris_visitor_id', visitorId);
      isReturning = false;
    }

    let sessionId = sessionStorage.getItem('aetheris_session_id');
    let isNewSession = false;
    if (!sessionId) {
      sessionId = 's_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('aetheris_session_id', sessionId);
      sessionStorage.setItem('aetheris_session_start_time', Date.now().toString());
      isNewSession = true;
    }

    let landingPage = sessionStorage.getItem('aetheris_landing_page');
    if (!landingPage) {
      landingPage = location.pathname;
      sessionStorage.setItem('aetheris_landing_page', landingPage);
    }

    const { deviceType, browser, os } = getDeviceDetails();
    const { source, keywords } = getTrafficSource();

    // Prevent duplicate entries on rapid page refreshes
    const currentPath = location.pathname;
    const lastPath = sessionStorage.getItem('aetheris_last_path');
    const lastLogTimeStr = sessionStorage.getItem('aetheris_last_log_time');
    const now = Date.now();
    const isRapidRefresh = lastPath === currentPath && lastLogTimeStr && (now - Number(lastLogTimeStr) < 5000);

    const logActivity = async () => {
      const geo = await getGeoDetails();
      const statusRole = user ? (isAdmin ? 'admin' : 'user') : 'guest';
      const userEmail = user?.email || null;
      const username = user?.displayName || user?.username || (user?.email ? user.email.split('@')[0] : null);

      if (!isRapidRefresh) {
        sessionStorage.setItem('aetheris_last_path', currentPath);
        sessionStorage.setItem('aetheris_last_log_time', now.toString());

        // Save page view
        const newViewDoc = doc(collection(db, 'analytics_page_views'));
        await setDoc(newViewDoc, {
          visitorId,
          sessionId,
          userId: user?.uid || null,
          username,
          role: statusRole,
          email: userEmail,
          path: currentPath,
          landingPage,
          referrer: document.referrer || "Direct",
          trafficSource: source,
          keywords,
          deviceType,
          browser,
          os,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          isReturning,
          isNewSession,
          timestamp: serverTimestamp()
        }, { merge: true }).catch(err => {
          // Ignore ALREADY_EXISTS benign errors from strict mode
          if (err?.code !== 'already-exists' && !err?.message?.includes('already exists')) {
             console.error("Failed to store analytics page view:", err);
          }
        });
      }

      if (user?.uid && geo?.country) {
        try {
          const userRef = doc(db, 'users', user.uid);
          updateDoc(userRef, {
            lastActiveAt: serverTimestamp(),
            last_active: serverTimestamp(),
            registrationCountry: user.registrationCountry || user.country || user.local_country || geo.country,
            country: user.country || user.registrationCountry || user.local_country || geo.country,
            local_country: user.local_country || user.registrationCountry || user.country || geo.country
          }).catch(() => {});
        } catch (e) {
          // ignore background update errors
        }
      }

      // Live online session update helper function
      const updateOnlineHeartbeat = async () => {
        const sessionStartTime = Number(sessionStorage.getItem('aetheris_session_start_time') || now);
        const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);

        await setDoc(doc(db, 'analytics_online', sessionId), {
          visitorId,
          sessionId,
          userId: user?.uid || null,
          username: username || 'Guest',
          email: userEmail || 'Guest session',
          role: statusRole,
          path: currentPath,
          deviceType,
          browser,
          os,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          lastActive: serverTimestamp(),
          duration: elapsedSeconds
        }, { merge: true }).catch(err => {
          console.error("Failed to update active state:", err);
        });
      };

      // Push initial heartbeat instantly
      await updateOnlineHeartbeat();

      // Clear existing interval
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }

      // Regular heartbeat every 10 seconds for real time precision
      heartbeatTimerRef.current = setInterval(() => {
        updateOnlineHeartbeat();
      }, 10000);
    };

    logActivity();

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [location.pathname, user, isAdmin]);
}
