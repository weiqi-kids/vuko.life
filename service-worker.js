// Vuko PWA service worker — offline support for the app shell.
// v2: js/css/json 改 network-first（線上永遠拿最新，離線才回退快取）。
// v1 對靜態資源 cache-first，部署後回訪用戶會拿到「新 HTML＋舊 app.js」
// 的版本錯位（hero 播放鍵 heroTogglePlay ReferenceError 事故的根因）。
const CACHE = 'vuko-v2';
const SHELL = [
  '/assets/base.css',
  '/js/app.js',
  '/js/i18n.js',
  '/js/audio_selector.js',
  '/js/binaural_processor.js',
  '/js/theme.js',
  '/js/keyboard.js',
  '/js/lang-switcher.js',
  '/js/ga.js',
  '/config.json',
  '/manifest.json',
  '/img/icons/icon-192.png',
  '/img/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
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
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache analytics or cross-origin media (jsDelivr CDN, gtag).
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached page, then English shell.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/app/en.html')))
    );
    return;
  }

  // Code & data (js/css/json): network-first so HTML and JS can never skew
  // after a deploy; cache is only an offline fallback.
  if (/\.(?:js|css|json)$/.test(url.pathname)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Other static assets (images, icons): cache-first, update in background.
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
