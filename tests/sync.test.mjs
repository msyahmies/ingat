// Ujian endpoint /sync dalam worker.js (KV palsu). Jalankan: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

function mockKV() {
  const m = new Map();
  return {
    m,
    async put(k, v, o = {}) { m.set(k, { v, ttl: o.expirationTtl }); },
    async get(k) { return m.has(k) ? m.get(k).v : null; },
    async list({ prefix = '' } = {}) { return { keys: [...m.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true }; }
  };
}
const ORIGIN = 'https://ingat-h7u.pages.dev';
const URL_ = 'https://ingat.example.workers.dev/sync';
const CODE = 'K7QM-9X2P-RT4W-ZB8N-HC3D-LF6J'; // 24 aksara selepas buang '-'
const call = (env, method, { code = CODE, body, origin = ORIGIN, path = URL_ } = {}) => {
  const headers = { Origin: origin };
  if (code !== null) headers['X-Sync-Code'] = code;
  if (body !== undefined) headers['content-type'] = 'application/json';
  return worker.fetch(new Request(path, { method, headers, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) }), env, {});
};
const DATA = { tasks: [{ id: 't1', title: 'Bayar bil', updatedAt: 1 }], shop: [{ id: 's1', name: 'Telur', updatedAt: 2 }] };

test('GET kosong → rev 0, data null', async () => {
  const r = await call({ LIST: mockKV() }, 'GET');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { result: 'success', rev: 0, updatedAt: 0, data: null });
});

test('PUT kemudian GET pulangkan data yang sama, rev naik', async () => {
  const env = { LIST: mockKV() };
  const p1 = await (await call(env, 'PUT', { body: { baseRev: 0, data: DATA } })).json();
  assert.equal(p1.result, 'success'); assert.equal(p1.rev, 1); assert.ok(p1.updatedAt > 0);
  const g = await (await call(env, 'GET')).json();
  assert.equal(g.rev, 1);
  assert.deepEqual(g.data, { v: 1, ...DATA });
  const p2 = await (await call(env, 'PUT', { body: { baseRev: 1, data: { tasks: [], shop: [] } } })).json();
  assert.equal(p2.rev, 2);
});

test('kod dinormalkan: huruf kecil / sengkang / ruang = kod sama', async () => {
  const env = { LIST: mockKV() };
  await call(env, 'PUT', { body: { baseRev: 0, data: DATA } });
  const g = await (await call(env, 'GET', { code: 'k7qm 9x2p rt4w zb8n hc3d lf6j' })).json();
  assert.equal(g.rev, 1);
});

test('kod mentah tidak disimpan; key = sync:<sha256>', async () => {
  const env = { LIST: mockKV() };
  await call(env, 'PUT', { body: { baseRev: 0, data: DATA } });
  const keys = [...env.LIST.m.keys()];
  assert.equal(keys.length, 1);
  assert.match(keys[0], /^sync:[0-9a-f]{64}$/);
  const all = keys[0] + env.LIST.m.get(keys[0]).v;
  assert.ok(!all.includes('K7QM9X2P') && !all.toUpperCase().includes('K7QM-9X2P'), 'kod tak muncul dalam KV');
  assert.ok(env.LIST.m.get(keys[0]).ttl > 0, 'ada TTL');
});

test('kod berbeza = data berasingan', async () => {
  const env = { LIST: mockKV() };
  await call(env, 'PUT', { body: { baseRev: 0, data: DATA } });
  const other = await (await call(env, 'GET', { code: 'ZZZZZZZZZZZZZZZZZZZZZZZZ' })).json();
  assert.equal(other.data, null);
});

test('konflik: baseRev lapuk → 409 dengan data terkini, data tak tertindih', async () => {
  const env = { LIST: mockKV() };
  await call(env, 'PUT', { body: { baseRev: 0, data: DATA } }); // peranti A → rev 1
  const r = await call(env, 'PUT', { body: { baseRev: 0, data: { tasks: [], shop: [] } } }); // peranti B guna rev lama
  assert.equal(r.status, 409);
  const j = await r.json();
  assert.equal(j.result, 'conflict'); assert.equal(j.rev, 1);
  assert.deepEqual(j.data.tasks, DATA.tasks);
  const g = await (await call(env, 'GET')).json();
  assert.deepEqual(g.data.tasks, DATA.tasks, 'data A kekal');
});

test('kod tak sah → 400', async () => {
  const env = { LIST: mockKV() };
  for (const code of [null, '', 'pendek', 'A'.repeat(65)]) {
    const r = await call(env, 'GET', { code });
    assert.equal(r.status, 400, 'kod: ' + code);
  }
  assert.equal(env.LIST.m.size, 0);
});

test('data / JSON tak sah → 400', async () => {
  const env = { LIST: mockKV() };
  assert.equal((await call(env, 'PUT', { body: '{bukan json' })).status, 400);
  assert.equal((await call(env, 'PUT', { body: { baseRev: 0, data: { tasks: 'x', shop: [] } } })).status, 400);
  assert.equal((await call(env, 'PUT', { body: { baseRev: 0 } })).status, 400);
  assert.equal(env.LIST.m.size, 0);
});

test('melebihi 1 MB → 413', async () => {
  const env = { LIST: mockKV() };
  const big = { baseRev: 0, data: { tasks: [{ id: 'x', title: 'a'.repeat(1024 * 1024) }], shop: [] } };
  const r = await call(env, 'PUT', { body: big });
  assert.equal(r.status, 413);
  assert.equal(env.LIST.m.size, 0);
});

test('CORS: PUT & X-Sync-Code dibenarkan; origin asing ditolak; preflight', async () => {
  const env = { LIST: mockKV() };
  const pre = await worker.fetch(new Request(URL_, { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'PUT' } }), env, {});
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.match(pre.headers.get('Access-Control-Allow-Methods'), /PUT/);
  assert.match(pre.headers.get('Access-Control-Allow-Headers'), /X-Sync-Code/);
  const evil = await call(env, 'GET', { origin: 'https://evil.example' });
  assert.equal(evil.headers.get('Access-Control-Allow-Origin'), null);
  const ok = await call(env, 'GET');
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
});

test('/sync/ dengan garis miring hujung pun jalan; method lain → 405', async () => {
  const env = { LIST: mockKV() };
  assert.equal((await call(env, 'GET', { path: URL_ + '/' })).status, 200);
  assert.equal((await call(env, 'DELETE')).status, 405);
});

test('peti masuk borang tak terganggu oleh data sync', async () => {
  const env = { LIST: mockKV() };
  await call(env, 'PUT', { body: { baseRev: 0, data: DATA } });
  const post = await worker.fetch(new Request('https://ingat.example.workers.dev/', { method: 'POST', headers: { Origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, body: 'from=A&items=Gula' }), env, { waitUntil() {} });
  assert.equal((await post.json()).count, 1);
  const list = await (await worker.fetch(new Request('https://ingat.example.workers.dev/?action=list', { headers: { Origin: ORIGIN } }), env, {})).json();
  assert.deepEqual(list.items.map((x) => x.item), ['Gula']);
});
