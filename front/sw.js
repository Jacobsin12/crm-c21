// sw.js - Versión 100% en vivo sin caché offline
const CACHE_NAME = 'crm-c21-kill-cache';

// Al instalar, forzamos la activación de inmediato sin guardar NADA
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Al activar, EXTERMINAMOS todas las cachés del disco del celular
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          console.log('[SW] Destruyendo caché vieja:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// INTERCEPTOR DE RED: Obliga a ir a internet SIEMPRE en vivo. Cero offline.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return new Response(JSON.stringify({ status: 'error', message: 'Error de conexión con el servidor.' }), { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    })
  );
});

// ==========================================
// PUSH NOTIFICATIONS (Mantiene tus alertas vivas)
// ==========================================
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/icons/c21.png',
      badge: '/assets/icons/c21.png',
      vibrate: [200, 100, 200],
      data: data.data
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/a_admin/clientes.html')
  );
});