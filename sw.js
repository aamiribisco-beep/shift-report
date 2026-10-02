/* Service Worker — Shift Report */
const VER = 'v1';
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
  // اسکریپت گوگل (داده‌ها و فایل‌ها) هرگز از اینجا رد نمی‌شود؛ ذخیره‌ی آنها کار خود برنامه است
  if (url.hostname.endsWith('google.com') && url.hostname.startsWith('script')) return;
  if (url.hostname.endsWith('googleusercontent.com')) return;

  // کتابخانه‌ها و فونت‌ها: اول حافظه، اگر نبود از اینترنت و ذخیره
  if (LIB_HOSTS.includes(url.hostname)){
    e.respondWith(caches.open(LIB_CACHE).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      try{ const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }
      catch(err){ return hit || Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // خود برنامه: اول اینترنت (برای گرفتن نسخه‌ی جدید)، اگر نبود از حافظه
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => {
    if (r && r.ok){ const copy = r.clone(); caches.open(SHELL_CACHE).then(c => c.put(req, copy)); }
    return r;
  }).catch(async () => (await caches.match(req)) || (req.mode === 'navigate' ? await caches.match('./index.html') : Response.error())));
});
