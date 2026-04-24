const CACHE = 'fotiva-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

// Recebe notificação push
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  const title   = data.title   || 'Fotiva';
  const options = {
    body:    data.body    || 'Você tem um lembrete!',
    icon:    data.icon    || '/favicon.ico',
    badge:   data.badge   || '/favicon.ico',
    tag:     data.tag     || 'fotiva-notif',
    data:    data.data    || { url: '/' },
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const client = clients.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (client) { client.navigate(url); return client.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
