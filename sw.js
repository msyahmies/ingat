// Service worker: offline + paparan notifikasi + semak peringatan di latar belakang
const CACHE = 'ingat-v7';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './minta.html', './merge.js', './vendor/qrcode.js'];
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
// Setiap tugasan boleh ada sehingga 4 masa: times[] + snoozed{} + acked[] + notified[].
// Data lama { due, notifiedFor } masih disokong.
function slotsOf(t) {
  const times = Array.isArray(t.times) ? t.times : (Number.isFinite(t.due) ? [t.due] : []);
  const sn = t.snoozed || {}, ack = Array.isArray(t.acked) ? t.acked : [];
  return times.map((base, i) => ({ base, i, n: times.length, at: Number(sn[base]) || base, acked: ack.includes(base) }));
}

async function checkDue() {
  const cache = await caches.open('ingat-data');
  const res = await cache.match(DATA_KEY);
  if (!res) return;
  const data = await res.json();
  const en = data.settings && data.settings.lang === 'en';
  const now = Date.now();
  let changed = false;
  for (const t of data.tasks || []) {
    if (t.done) continue;
    if (!Array.isArray(t.notified)) t.notified = Number.isFinite(t.notifiedFor) ? [t.notifiedFor] : [];
    for (const x of slotsOf(t)) {
      if (x.acked || x.at > now || t.notified.includes(x.at)) continue;
      await self.registration.showNotification('⏰ ' + t.title + (x.n > 1 ? ` (${x.i + 1}/${x.n})` : ''), {
        body: t.note || (en ? 'Time to do this!' : 'Masa untuk buat ni!'),
        tag: `task-${t.id}-${x.base}`,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        requireInteraction: true,
        data: { id: t.id, ts: x.base },
        actions: [
          { action: 'done', title: en ? '✅ Done' : '✅ Selesai' },
          { action: 'snooze', title: en ? '⏳ Snooze 10 min' : '⏳ Tunda 10 min' }
        ]
      });
      t.notified.push(x.at);
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
  const d = e.notification.data || {};
  const id = d.id, ts = d.ts;
  const action = e.action || 'open';
  const url = './index.html' + (id ? `?act=${action}&id=${encodeURIComponent(id)}` + (ts ? `&ts=${ts}` : '') : '');
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (id) c.postMessage({ act: action, id, ts });
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
