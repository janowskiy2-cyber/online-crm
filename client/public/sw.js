// CRM Pro - Progressive Web App Service Worker (v2026 Auto-Update)
const CACHE_NAME = 'crm-pro-v2026-fresh';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon.svg'
];

// Install: Skip waiting immediately to activate fresh SW
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: Immediately PURGE all old caches (including legacy crm-pro-v1)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ [PWA SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: HTML documents ALWAYS go straight to network to ensure fresh deployments
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never intercept API, Socket.io or navigation (HTML) requests
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/socket.io') ||
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    return; // Let browser fetch directly from Vercel without caching
  }

  // Network-first for other static assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push: Handles native Web Push notifications sent to service worker
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Online CRM Pro',
    body: 'Нове сповіщення або вхідне повідомлення в CRM',
    icon: 'https://img.icons8.com/color/192/crm.png',
    badge: 'https://img.icons8.com/color/48/crm.png',
    url: '/'
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || 'https://img.icons8.com/color/192/crm.png',
    badge: payload.badge || 'https://img.icons8.com/color/48/crm.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Відкрити' },
      { action: 'close', title: 'Закрити' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification Click: Focus active CRM window or navigate to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
