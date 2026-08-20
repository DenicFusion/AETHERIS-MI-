import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';

export function useFCMToken(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    let unsubscribe: (() => void) | undefined;
    let active = true;

    const requestPermissionAndGetToken = async () => {
      try {
        const supported = await isSupported();
        if (!supported || !active) {
          console.log('[FCM] Notifications are not supported in this environment');
          return;
        }

        const app = initializeApp(firebaseConfig);
        const messagingInstance = getMessaging(app);

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          let registration: ServiceWorkerRegistration | undefined;
          
          if ('serviceWorker' in navigator) {
            // First try active registrations
            registration = await navigator.serviceWorker.getRegistration();
            
            // If none active, try wait for ready state
            if (!registration) {
              try {
                registration = await Promise.race([
                  navigator.serviceWorker.ready,
                  new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000))
                ]) as ServiceWorkerRegistration | undefined;
              } catch (err) {
                console.warn('[FCM] Error waiting for ready service worker:', err);
              }
            }

            // Fallback: register the built service worker
            if (!registration) {
              try {
                registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
              } catch (regErr) {
                console.error('[FCM] Error fallback registering service worker:', regErr);
              }
            }
          }

          if (!registration) {
            console.warn('[FCM] Service worker registration not found or failed.');
            return;
          }

          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;
          
          const currentToken = await getToken(messagingInstance, { 
            serviceWorkerRegistration: registration,
            vapidKey: vapidKey
          });
          if (currentToken && active) {
            console.log('[FCM] Token acquired:', currentToken);
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(currentToken)
            });
          }
        } else {
          console.warn('[FCM] Permission denied for notifications');
        }

        if (active) {
          unsubscribe = onMessage(messagingInstance, (payload) => {
            console.log('[FCM Message]', payload);
            if (payload.notification) {
              toast.info(payload.notification.title || "Notification", {
                description: payload.notification.body,
                duration: 6000,
              });
            } else if (payload.data) {
              toast.info(payload.data.title || "Notification", {
                description: payload.data.body || payload.data.message || "",
                duration: 6000,
              });
            }
          });
        }
      } catch (e: any) {
        if (e.message?.includes('vapid')) {
          console.log('[FCM] No VAPID key configured for Web Push, Web Push is inactive.');
        } else {
          console.error('[FCM] Error getting token:', e);
        }
      }
    };

    requestPermissionAndGetToken();

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);
}
