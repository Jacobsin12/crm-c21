const CACHE_NAME = 'crm-c21-cache-v1';
const ASSETS = [
  './cliente/index.html',
  './cliente/cliente.js',
  './assets/css/global.css',
  './assets/js/api.js'
];

// Instalar el Service Worker y cachear archivos base
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Responder desde la caché si no hay internet
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});