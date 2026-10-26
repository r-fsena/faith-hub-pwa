const CACHE_NAME = 'faith-hub-pwa-v6.12';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/brand/logo-symbol.png',
  '/brand/logo-original.png',
  '/icons.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Erro ao pré-cachear alguns assets iniciais:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Ignora chamadas que não sejam GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora chamadas de desenvolvimento, HMR, APIs remotas e extensões
  if (
    url.includes('/@') ||
    url.includes('/src/') ||
    url.includes('chrome-extension') ||
    url.includes('execute-api') ||
    url.includes('/api/') ||
    !url.startsWith(self.location.origin)
  ) {
    return;
  }

  // Interceptação de Navegação (Páginas HTML do SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(async () => {
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cached) return cached;
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Faith-Hub Offline</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Modo Offline</h2><p>Verifique sua conexão com a internet para carregar o aplicativo.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
          );
        })
    );
    return;
  }

  // Interceptação de Assets Estáticos com Fallback Seguro (Nunca retorna null/undefined)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback seguro para evitar 'response is null' no FetchEvent
        return new Response('', { status: 404, statusText: 'Not Found in Cache or Network' });
      })
  );
});

// Suporte a Web Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Faith-Hub', body: 'Novidades na sua igreja!' };
  const options = {
    body: data.body,
    icon: '/icons.svg',
    badge: '/icons.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
