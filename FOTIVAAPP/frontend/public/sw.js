const CACHE_NAME   = 'fotiva-v3';
const CACHE_STATIC = 'fotiva-static-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== CACHE_STATIC)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (
    url.pathname.startsWith('/api/') ||
    url.hostname !== self.location.hostname ||
    e.request.method !== 'GET'
  ) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_STATIC).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html').then(r => r || fetch(e.request)))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_STATIC).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data?.json() || {}; } catch { data = { title: 'Fotiva', body: e.data?.text() || '' }; }

  const title   = data.title || 'Fotiva';
  const options = {
    body:    data.body  || 'Você tem um lembrete!',
    icon:    '/favicon.ico',
    badge:   '/favicon.ico',
    tag:     data.tag   || 'fotiva-notif',
    data:    { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.navigate(url); return existing.focus(); }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = e.data;
    self.registration.showNotification(title || 'Fotiva', {
      body:    body || '',
      icon:    '/favicon.ico',
      badge:   '/favicon.ico',
      data:    { url: url || '/' },
      vibrate: [200, 100, 200],
    });
  }
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
