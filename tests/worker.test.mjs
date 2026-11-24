// Ujian worker.js dengan KV & Telegram palsu. Jalankan: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

// KV palsu: put/get/list/delete, list disusun ikut nama kunci (macam KV sebenar), dengan paging
function mockKV({ pageSize = 1000 } = {}) {
  const m = new Map();
  return {
    m,
    async put(k, v, o = {}) {
      if (o.metadata && new TextEncoder().encode(JSON.stringify(o.metadata)).length > 1024) throw new Error('metadata too large');
      m.set(k, { v, meta: o.metadata, ttl: o.expirationTtl });
    },
    async get(k) { return m.has(k) ? m.get(k).v : null; },
    async delete(k) { m.delete(k); },
    async list({ prefix = '', cursor, limit = 1000 } = {}) {
      const names = [...m.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const n = Math.min(limit, pageSize);
      const slice = names.slice(start, start + n);
      const done = start + n >= names.length;
      return { keys: slice.map((name) => ({ name, metadata: m.get(name).meta })), list_complete: done, cursor: done ? undefined : String(start + n) };
    }
  };
}

const ORIGIN = 'https://msyahmies.github.io';
const BASE = 'https://ingat.example.workers.dev/';
const post = (env, fields, origin = ORIGIN) => worker.fetch(new Request(BASE, {
  method: 'POST', headers: { Origin: origin, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields)
}), env, { waitUntil: (p) => env.__wait.push(p) });
const list = (env, since) => worker.fetch(new Request(BASE + '?action=list' + (since ? '&since=' + encodeURIComponent(since) : ''), { headers: { Origin: ORIGIN } }), env, {});
const mkEnv = (extra = {}) => ({ LIST: mockKV(), __wait: [], ...extra });

test('POST simpan barang, GET list pulangkan ikut susunan', async () => {
  const env = mkEnv();
  const r = await post(env, { from: 'Sayang', items: 'Telur 1 papan\nBeras 10kg, Gula', note: 'Sebelum Maghrib' });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { result: 'success', count: 3 });
  const j = await (await list(env)).json();
  assert.equal(j.result, 'success');
  assert.deepEqual(j.items.map((x) => x.item), ['Telur 1 papan', 'Beras 10kg', 'Gula']);
  assert.equal(j.items[0].from, 'Sayang');
  assert.equal(j.items[0].note, 'Sebelum Maghrib');
  assert.equal(j.next, j.items[2].id);
  for (const v of env.LIST.m.values()) assert.equal(v.ttl, 60 * 60 * 24 * 30);
});

test('since: hanya barang baru, tak berganda', async () => {
  const env = mkEnv();
  await post(env, { from: 'A', items: 'Satu\nDua' });
  const first = await (await list(env)).json();
  assert.equal(first.items.length, 2);
  await new Promise((r) => setTimeout(r, 5));
  await post(env, { from: 'B', items: 'Tiga' });
  const second = await (await list(env, first.next)).json();
  assert.deepEqual(second.items.map((x) => x.item), ['Tiga']);
  const third = await (await list(env, second.next)).json();
  assert.deepEqual(third.items, []);
  assert.equal(third.next, second.next, 'next kekal bila tiada barang baru');
});

test('list merentas banyak halaman KV', async () => {
  const env = mkEnv({ LIST: mockKV({ pageSize: 2 }) });
  await post(env, { items: 'a\nb\nc\nd\ne' });
  const j = await (await list(env)).json();
  assert.deepEqual(j.items.map((x) => x.item), ['a', 'b', 'c', 'd', 'e']);
});

test('nota panjang (melebihi had metadata) masih disimpan & dibaca', async () => {
  const env = mkEnv();
  const note = '😀'.repeat(240); // ~960 bait → rekod > 1000 bait
  const r = await post(env, { items: 'Roti', note });
  assert.equal((await r.json()).result, 'success');
  const j = await (await list(env)).json();
  assert.equal(j.items[0].note, note);
});

test('had 50 barang, panjang dipotong, kosong ditolak, honeypot diabaikan', async () => {
  const env = mkEnv();
  const many = Array.from({ length: 70 }, (_, i) => 'x' + i).join('\n');
  assert.equal((await (await post(env, { items: many })).json()).count, 50);
  await post(env, { items: 'y'.repeat(500) });
  const j = await (await list(env)).json();
  assert.ok(j.items.every((x) => x.item.length <= 200));
  const empty = await post(env, { items: ' \n , ' });
  assert.equal(empty.status, 400);
  const before = env.LIST.m.size;
  assert.equal((await (await post(env, { items: 'spam', website: 'bot' })).json()).count, 0);
  assert.equal(env.LIST.m.size, before);
});

test('terima body JSON juga', async () => {
  const env = mkEnv();
  const r = await worker.fetch(new Request(BASE, { method: 'POST', headers: { 'content-type': 'application/json', Origin: ORIGIN }, body: JSON.stringify({ from: 'X', items: 'Susu' }) }), env, {});
  assert.equal((await r.json()).count, 1);
});

test('CORS: github.io dibenarkan, origin lain tidak, preflight OK', async () => {
  const env = mkEnv();
  const ok = await post(env, { items: 'a' });
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const bad = await post(env, { items: 'a' }, 'https://evil.example');
  assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null);
  const pre = await worker.fetch(new Request(BASE, { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env, {});
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const custom = await post({ ...env, ALLOWED_ORIGINS: 'https://a.test, https://b.test' }, { items: 'a' }, 'https://b.test');
  assert.equal(custom.headers.get('Access-Control-Allow-Origin'), 'https://b.test');
});

test('Telegram: dihantar bila TOKEN & CHAT_ID diset, tidak jika tiada', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return new Response('{"ok":true}'); };
  try {
    const env = mkEnv({ TELEGRAM_TOKEN: 'T0K', TELEGRAM_CHAT_ID: '123' });
    await post(env, { from: 'Sayang', items: 'Telur\nBeras', note: 'cepat' });
    await Promise.all(env.__wait);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.telegram.org/botT0K/sendMessage');
    assert.equal(calls[0].body.chat_id, '123');
    assert.match(calls[0].body.text, /Sayang: 2 barang/);
    assert.match(calls[0].body.text, /• Telur\n• Beras/);
    assert.match(calls[0].body.text, /cepat/);

    calls.length = 0;
    const env2 = mkEnv();
    await post(env2, { items: 'Telur' });
    await Promise.all(env2.__wait);
    assert.equal(calls.length, 0);
  } finally { globalThis.fetch = realFetch; }
});

test('ralat Telegram tak gagalkan borang', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('network down'); };
  try {
    const env = mkEnv({ TELEGRAM_TOKEN: 'x', TELEGRAM_CHAT_ID: '1' });
    const r = await post(env, { items: 'Telur' });
    await Promise.all(env.__wait);
    assert.equal((await r.json()).result, 'success');
  } finally { globalThis.fetch = realFetch; }
});

test('tanpa KV binding → ralat jelas; GET biasa → ok; ack → success', async () => {
  const r = await worker.fetch(new Request(BASE), {}, {});
  assert.equal(r.status, 500);
  assert.match((await r.json()).message, /LIST/);
  const env = mkEnv();
  assert.equal((await (await worker.fetch(new Request(BASE), env, {})).json()).result, 'ok');
  assert.equal((await (await worker.fetch(new Request(BASE + '?action=ack&ids=a'), env, {})).json()).result, 'success');
});
