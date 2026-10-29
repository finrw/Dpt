/**
 * Service worker DPT RW.
 * - File aplikasi (HTML/CSS/JS) : coba internet dulu, kalau gagal pakai cache.
 *   Jadi update di GitHub langsung terlihat, dan tampilan tetap terbuka walau sinyal lemah.
 * - Ikon : cache dulu.
 * - Permintaan ke Apps Script (domain lain) TIDAK disentuh sama sekali, data selalu langsung dari server.
 *
 * Setiap kali mengubah file aplikasi, naikkan angka VERSI di bawah (v1 -> v2, dst).
 */
const VERSI = 'dpt-rw-v1';
const FILE_APLIKASI = [
  './',
  'index.html',
  'cetak.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSI).then(function (cache) { return cache.addAll(FILE_APLIKASI); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (daftar) {
      return Promise.all(daftar.filter(function (k) { return k !== VERSI; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // biarkan Apps Script lewat langsung

  if (url.pathname.indexOf('/icons/') !== -1) {
    // ikon: cache dulu
    event.respondWith(
      caches.match(req).then(function (hit) { return hit || fetch(req); })
    );
    return;
  }

  // halaman, CSS, JS: internet dulu, cadangan dari cache
  event.respondWith(
    fetch(req).then(function (res) {
      const salinan = res.clone();
      caches.open(VERSI).then(function (cache) { cache.put(req, salinan); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('index.html');
      });
    })
  );
});
