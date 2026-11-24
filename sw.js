// Service worker: offline + paparan notifikasi + semak peringatan di latar belakang
const CACHE = 'ingat-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './minta.html'];
const DATA_KEY = './__ingat_data__';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== 'ingat-data').map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // jangan cache Google Apps Script / pihak luar
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});

// Background check (Chrome Android, bila app dipasang ke skrin utama).
// Pelayar yang tentukan kekerapan — jangan bergantung 100% pada ini.
async function checkDue() {
  const cache = await caches.open('ingat-data');
  const res = await cache.match(DATA_KEY);
  if (!res) return;
  const data = await res.json();
  const en = data.settings && data.settings.lang === 'en';
  const now = Date.now();
  let changed = false;
  for (const t of data.tasks || []) {
    if (!t.done && t.due && t.due <= now && t.notifiedFor !== t.due) {
      await self.registration.showNotification('⏰ ' + t.title, {
        body: t.note || (en ? 'Time to do this!' : 'Masa untuk buat ni!'),
        tag: 'task-' + t.id,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        requireInteraction: true,
        data: { id: t.id },
        actions: [
          { action: 'done', title: en ? '✅ Done' : '✅ Selesai' },
          { action: 'snooze', title: en ? '⏳ Snooze 10 min' : '⏳ Tunda 10 min' }
        ]
      });
      t.notifiedFor = t.due;
      changed = true;
    }
  }
  if (changed) await cache.put(DATA_KEY, new Response(JSON.stringify(data)));
}

self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'ingat-check') e.waitUntil(checkDue());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.id;
  const action = e.action || 'open';
  const url = './index.html' + (id ? `?act=${action}&id=${encodeURIComponent(id)}` : '');
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (id) c.postMessage({ act: action, id });
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
