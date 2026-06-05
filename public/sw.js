/* AIPro v2 Service Worker — No reload · Background sync · Notification reply */
'use strict';

const CACHE = 'aipro-v2';
const STATIC = ['/', '/manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always network for API
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }
  // Cache-first for static
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/'));
    })
  );
});

// ── Push notifications ─────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'AIPro AI', body: 'Pesan baru' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'AIPro AI', {
      body: data.body || '',
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'aipro-reply',
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'reply', title: '💬 Balas', type: 'text', placeholder: 'Ketik balasan…' },
        { action: 'open',  title: '📱 Buka App' }
      ],
      data: { url: '/' }
    })
  );
});

// ── Notification click / reply ─────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action === 'reply' && e.reply) {
    // Send reply text back to app client
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        if (clients.length) {
          clients[0].postMessage({ type: 'NOTIF_REPLY', text: e.reply });
          clients[0].focus();
        } else {
          // No client open — open new one and send
          return self.clients.openWindow('/').then(c => {
            if (c) setTimeout(() => c.postMessage({ type: 'NOTIF_REPLY', text: e.reply }), 1500);
          });
        }
      })
    );
    return;
  }

  // "open" action or body click
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length) { clients[0].focus(); return; }
      return self.clients.openWindow('/');
    })
  );
});

// ── Background sync (retry failed messages) ────────
self.addEventListener('sync', e => {
  if (e.tag === 'chat-sync') e.waitUntil(Promise.resolve());
});
