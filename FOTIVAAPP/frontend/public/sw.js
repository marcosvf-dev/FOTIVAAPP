const CACHE_NAME = 'fotiva-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// Recebe notificação push do servidor
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data?.json() || {}; } catch { data = { title: 'Fotiva', body: e.data?.text() || '' }; }

  const title   = data.title || 'Fotiva';
  const options = {
    body:    data.body    || 'Você tem um lembrete!',
    icon:    '/favicon.ico',
    badge:   '/favicon.ico',
    tag:     data.tag     || 'fotiva-notif',
    data:    { url: data.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação
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

// Recebe mensagens do app (para notificações agendadas)
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = e.data;
    self.registration.showNotification(title || 'Fotiva', {
      body: body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: url || '/' },
      vibrate: [200, 100, 200],
    });
  }
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
