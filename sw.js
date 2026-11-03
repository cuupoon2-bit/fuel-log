// 更新時は VERSION を変えるとアプリ側のキャッシュが入れ替わります
const VERSION = 'fuel-log-v5';
const FILES = ['./', './index.html', './chart.umd.js', './manifest.webmanifest',
  './fonts/barlow-condensed-500.woff2', './fonts/barlow-condensed-600.woff2', './fonts/barlow-condensed-700.woff2',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

// インストール時はブラウザのHTTPキャッシュを使わず、必ずサーバーから最新を取得する
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c =>
    Promise.all(FILES.map(u => fetch(u, {cache: 'reload'}).then(r => { if (r.ok) return c.put(u, r); })))
  ));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // 画面本体（index.html）は通信できれば常に最新を表示し、オフライン時だけ保存済みの版を使う
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, {cache: 'no-cache'}).then(r => {
        if (r.ok) caches.open(VERSION).then(c => c.put('./index.html', r.clone()));
        return r;
      }).catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }
  // グラフ部品・フォント・アイコンは保存済みの版を即表示し、裏で最新に更新する
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, {ignoreSearch: true});
    const net = fetch(req, {cache: 'no-cache'}).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
