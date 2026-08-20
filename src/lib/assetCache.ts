/**
 * Safely fetches an image and caches its Base64 representation in browser localStorage.
 * Normalizes loading behavior across environments (Render, Vercel, Local, Custom domains).
 */

const FALLBACKS: Record<string, string> = {
  logo: "/AEfavicon.png",
  hero: "/AEhero.jpg",
  favicon: "/AEfavicon.png"
};

async function fetchAndCacheAsset(url: string, cacheKey: string): Promise<void> {
  try {
    // Prevent fetching local fallbacks/assets as data URLs to avoid loop
    if (url.startsWith("/") || url.startsWith(window.location.origin)) {
      return;
    }
    
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) return;
    const blob = await response.blob();
    
    // Only cache image files
    if (!blob.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64data = reader.result as string;
        // Keep asset sizes in localStorage safe (< 1.2MB) to prevent quota errors
        if (base64data.length < 1200000) {
          localStorage.setItem(cacheKey, base64data);
          console.log(`[Aetheris Cache] Caching complete for: ${url}`);
        }
      } catch (e: any) {
        console.warn(`[Aetheris Cache] LocalStorage quota limit met: ${e.message}`);
      }
    };
    reader.readAsDataURL(blob);
  } catch (e) {
    console.warn(`[Aetheris Cache] Background cache fetch bypassed for CORS/Network on: ${url}`);
  }
}

/**
 * Returns a cached asset synchronously if available in LocalStorage.
 * Otherwise, triggers an asynchronous background cache process and returns the original URL immediately.
 */
export function getInstantCachedAsset(url: string | null, type: 'logo' | 'hero' | 'favicon'): string {
  const fallback = FALLBACKS[type] || "/AEfavicon.png";
  if (!url) return fallback;

  const cleanUrl = url.trim();
  const cacheKey = `aetheris_asset:${cleanUrl}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (e) {
    console.error("[Aetheris Cache] Read error", e);
  }

  // Trigger non-blocking async cache
  setTimeout(() => {
    fetchAndCacheAsset(cleanUrl, cacheKey).catch(() => {});
  }, 50);

  return cleanUrl;
}
