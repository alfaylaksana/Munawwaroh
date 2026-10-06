const CACHE_NAME = 'munawwaroh-v5';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './juz30-uthmani.json',
  './rahman-uthmani.json',
  './yasin-uthmani.json',
  './libs/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://www.gstatic.com/firebasejs/11.2.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore-compat.js',
];

// Saat install: simpan semua file inti ke cache supaya app bisa dibuka offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Satu per satu: kalau ada file yang belum ada di repo (404), file lain tetap tersimpan.
      // (cache.addAll bersifat semua-atau-tidak sama sekali.)
      .then((cache) => Promise.allSettled(APP_SHELL.map((u) => cache.add(u))))
      .then((hasil) => {
        const gagal = hasil.filter((h) => h.status === 'rejected').length;
        if (gagal) console.warn('SW install: ' + gagal + ' file belum bisa di-cache (mungkin belum ada di repo)');
      })
      .catch((err) => console.warn('SW install: gagal membuka cache', err))
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
