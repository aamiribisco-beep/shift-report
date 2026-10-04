/* ---------- Firebase Cloud Messaging (اعلان‌ها) ----------
   همان تنظیمات وب Firebase که در index.html گذاشتید را اینجا هم بگذارید. تا وقتی PASTE باقی است، اعلان غیرفعال است
   و بقیه‌ی کارهای این فایل بدون مشکل کار می‌کند. */
const FB_CFG = { apiKey: 'AIzaSyAYaTES4Ttr2CwIfECcWyvQNhVH8QzCupc', authDomain: 'shift-report-7ce87.firebaseapp.com', projectId: 'shift-report-7ce87', storageBucket: 'shift-report-7ce87.firebasestorage.app', messagingSenderId: '465460992371', appId: '1:465460992371:web:f853efc03cdd26e2450d06' };
try{
  if (FB_CFG.apiKey && FB_CFG.apiKey.indexOf('PASTE') < 0){
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
    firebase.initializeApp(FB_CFG);
    firebase.messaging();   // اعلان‌های پس‌زمینه را خود Firebase نمایش می‌دهد و با کلیک، لینک برنامه باز می‌شود
  }
}catch(e){ /* اگر بارگذاری کتابخانه‌ی Firebase ممکن نبود، بقیه‌ی برنامه سالم می‌ماند */ }

/* Service Worker — Shift Report
   خود برنامه: اول از حافظه (فوری)، هم‌زمان نسخه‌ی تازه در پس‌زمینه گرفته می‌شود و دفعه‌ی بعد اعمال می‌شود. */
const VER = 'v7';
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
