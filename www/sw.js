self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('miflota-store-v4').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/styles.css',
        '/app.bundle.js',
        '/manifest.json',
        '/miflota-icon-192.png',
        '/miflota-icon-512.png',
        '/nuevologoCompleto512.jpg'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
