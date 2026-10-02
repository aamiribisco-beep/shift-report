/* Service Worker — Shift Report
   خود برنامه: اول از حافظه (فوری)، هم‌زمان نسخه‌ی تازه در پس‌زمینه گرفته می‌شود و دفعه‌ی بعد اعمال می‌شود. */
const VER = 'v2';
const SHELL_CACHE = 'shift-shell-' + VER, LIB_CACHE = 'shift-lib-' + VER;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './icon-180.png'];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('shift-') && k !== SHELL_CACHE && k !== LIB_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname.endsWith('google.com') && url.hostname.startsWith('script')) return;
  if (url.hostname.endsWith('googleusercontent.com')) return;

  if (LIB_HOSTS.includes(url.hostname)){
    e.respondWith(caches.open(LIB_CACHE).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try{ const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }
      catch(err){ return Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // stale-while-revalidate: پاسخ فوری از حافظه + تازه‌سازی پس‌زمینه
  e.respondWith(caches.open(SHELL_CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit){ e.waitUntil(net); return hit; }
    const r = await net;
    return r || (req.mode === 'navigate' ? await c.match('./index.html') : Response.error());
  }));
});
