const CACHE_NAME = 'munawwaroh-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './libs/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://www.gstatic.com/firebasejs/11.2.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore-compat.js',
];

// Saat install: simpan semua file inti ke cache supaya app bisa dibuka offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('SW install: sebagian gagal di-cache', err))
  );
  self.skipWaiting();
});

// Saat aktif: buang cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Halaman utama: coba internet dulu (biar selalu dapat versi terbaru saat online),
  // kalau gagal (offline) baru pakai yang tersimpan di cache.
  if (req.mode === 'navigate' || req.url.includes('index.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((res) => res || caches.match('./index.html'))
        )
    );
    return;
  }

  // Aset lain (script CDN, ikon, manifest): pakai cache dulu (cepat + offline-proof),
  // tapi tetap update cache-nya di background kalau ada internet.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
