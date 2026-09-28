// מה סביבי - service worker
const CACHE = 'ma-svivi-v1';
const TILES = 'ma-svivi-tiles-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== TILES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // דף האפליקציה: קודם רשת, ואם אין קליטה - מהזיכרון
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { caches.open(CACHE).then(c => c.put('./index.html', r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // אריחי מפה: קודם רשת, גיבוי מהזיכרון
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(
      fetch(req).then(r => { const copy = r.clone(); caches.open(TILES).then(c => c.put(req, copy)); return r; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // קבצי האפליקציה, ספריות וגופנים: קודם מהזיכרון
  if (url.origin === location.origin || url.hostname === 'cdnjs.cloudflare.com' ||
      url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
      }))
    );
  }
  // שאר הבקשות (חיפוש מקומות, זמנים) - רגיל, האפליקציה שומרת גיבוי בעצמה
});
