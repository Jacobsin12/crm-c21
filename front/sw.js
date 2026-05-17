const CACHE_NAME = 'crm-c21-cache-v2';
const ASSETS = [
  '/a_cliente/index.html',
  '/a_cliente/cliente.js',
  '/assets/css/global.css',
  '/assets/js/api.js',
  '/assets/icons/c21.png'
];

// Instalar el Service Worker y cachear archivos base
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activar y limpiar cachés viejos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    })
  );
  self.clients.claim();
});

// Responder desde la caché si no hay internet
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});

// Push Notifications
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