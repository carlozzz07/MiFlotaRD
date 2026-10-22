self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open('miflota-store-v3').then((cache) => {
      return cache.addAll(['/', '/index.html']);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

// ==========================================
// BACKGROUND SYNC (Para cuando recupera internet)
// ==========================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-viajes') {
    event.waitUntil(sincronizarViajesPendientes());
  }
});

async function sincronizarViajesPendientes() {
  console.log('Sincronizando viajes pendientes en segundo plano...');
  // Aquí deberías hacer la llamada a Supabase o tu API
  // para enviar los datos guardados en IndexedDB cuando no había internet.
}

// ==========================================
// PERIODIC BACKGROUND SYNC
// ==========================================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'actualizar-estado-flota') {
    event.waitUntil(obtenerNuevosDatos());
  }
});

async function obtenerNuevosDatos() {
  console.log('Obteniendo nuevos datos periódicamente...');
}

// ==========================================
// NOTIFICACIONES PUSH (Web Push / Service Worker)
// ==========================================
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Notificación', body: 'Tienes un nuevo mensaje.' };

  const options = {
    body: data.body,
    icon: '/icono-192.png',
    badge: '/icono-192.png',
    vibrate: [200, 100, 200], // Vibración nativa
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Manejo del clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
