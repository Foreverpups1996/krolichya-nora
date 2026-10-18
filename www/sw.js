/* Service Worker «Кроличьей норы»:
   cache-first — игра мгновенно открывается и полностью работает офлайн.
   Звуки и фразы кешируются при первом проигрывании. */
const CACHE = 'krolichya-nora-v4';
const CORE = [
  './',
  'index.html',
  'parents.html',
  'css/style.css',
  'js/i18n.js',
  'js/sfx.js',
  'js/games.js',
  'js/main.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'share.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // навигация → корень игры из кеша (офлайн тоже), а другие страницы (parents.html) — по обычному пути
  if (req.mode === 'navigate') {
    const path = new URL(req.url).pathname;
    const isRoot = path.endsWith('/') || path.endsWith('/index.html');
    e.respondWith(
      caches.match(isRoot ? 'index.html' : req).then((hit) => hit || fetch(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
    })
  );
});
