/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';
import firebaseConfigFallback from '../firebase-applet-config.json';

clientsClaim();

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
};

self.skipWaiting();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

// Set up App Shell / SPA routing
// This allows the PWA to serve index.html for all navigation requests, making offline work.
try {
  const handler = createHandlerBoundToURL('/index.html');
  const navigationRoute = new NavigationRoute(handler, {
    denylist: [
      new RegExp('^/api/'),
    ],
  });
  registerRoute(navigationRoute);
} catch (e) {
  console.log("Navigation route setup failed", e);
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

let isFCMInitializedForSw = false;

function initFirebaseSw(config: any) {
  if (isFCMInitializedForSw) return;
  try {
    // @ts-ignore
    if (!firebase.apps.length) {
      // @ts-ignore
      firebase.initializeApp(config);
    }
    // @ts-ignore
    const messaging = firebase.messaging();
    
    messaging.onBackgroundMessage((payload: any) => {
      console.log('[firebase-messaging-sw.js] Received background message ', payload);
      // If notification payload is present, browser displays default notification automatically.
      // Do not duplicate showNotification to prevent double notifications on Chrome.
      if (payload.notification) {
        return;
      }
      const notificationTitle = payload.data?.title || 'Notification';
      const notificationOptions = {
        body: payload.data?.body || '',
        icon: '/AEfavicon.png',
        badge: '/AEfavicon.png',
        data: payload.data || {},
      };
    
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
    isFCMInitializedForSw = true;
    console.log('[firebase-messaging-sw.js] FCM background listener active');
  } catch (err) {
    console.warn('[firebase-messaging-sw.js] Error initializing messaging compat in worker:', err);
  }
}

fetch('/api/firebase-config')
  .then(response => response.json())
  .then(config => {
    initFirebaseSw(config);
  })
  .catch(err => {
    console.log('[firebase-messaging-sw.js] Background fetch failed, applying static build config fallback', err);
    initFirebaseSw(firebaseConfigFallback);
  });

// Click action to open app or redirect to correct page when notification is clicked
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  
  // Choose which URL to open: from payload data click_action or default to root
  const urlToOpen = event.notification.data?.click_action || event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window tab open with our app
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no tab is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
