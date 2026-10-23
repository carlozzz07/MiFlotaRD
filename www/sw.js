self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('miflota-store-v3').then((cache) => {
      return cache.addAll(['/', '/index.html', '/styles.css', '/app.bundle.js']);
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
