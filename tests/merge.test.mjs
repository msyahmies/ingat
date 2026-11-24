// Ujian logik gabung sync (merge.js). Jalankan: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../merge.js';

const { mergeList, mergeState, sameState, TOMB_TTL } = globalThis.IngatMerge;
const NOW = Date.UTC(2026, 10, 25, 4);
const T = (id, updatedAt, extra = {}) => ({ id, title: id, updatedAt, ...extra });
const ids = (l) => l.map((x) => x.id);

test('item baru di dua peranti digabung (tiada yang hilang)', () => {
  const out = mergeList([T('a', 1), T('b', 2)], [T('c', 3), T('a', 1)], NOW);
  assert.deepEqual(ids(out).sort(), ['a', 'b', 'c']);
});

test('updatedAt terbaru menang per item', () => {
  const out = mergeList([T('a', 100, { title: 'PC' }), T('b', 300, { title: 'B PC' })],
                        [T('a', 200, { title: 'Fon' }), T('b', 250, { title: 'B fon' })], NOW);
  assert.equal(out.find((x) => x.id === 'a').title, 'Fon');
  assert.equal(out.find((x) => x.id === 'b').title, 'B PC');
});

test('edit dua item berbeza di dua peranti → kedua-dua edit kekal', () => {
  const base = [T('a', 10, { title: 'A' }), T('b', 10, { title: 'B' })];
  const pc = [T('a', 20, { title: 'A (PC)' }), base[1]];
  const fon = [base[0], T('b', 30, { title: 'B (fon)' })];
  const out = mergeList(pc, fon, NOW);
  assert.equal(out.find((x) => x.id === 'a').title, 'A (PC)');
  assert.equal(out.find((x) => x.id === 'b').title, 'B (fon)');
});

test('tombstone (padam) menang ke atas edit lebih lama', () => {
  const out = mergeList([T('a', NOW - 200, { title: 'edit lama' })], [{ id: 'a', deleted: true, updatedAt: NOW - 100 }], NOW);
  assert.equal(out.length, 1);
  assert.equal(out[0].deleted, true);
});

test('edit lebih baru menang ke atas tombstone lama (item hidup semula)', () => {
  const out = mergeList([{ id: 'a', deleted: true, updatedAt: NOW - 200 }], [T('a', NOW - 100, { title: 'diedit selepas' })], NOW);
  assert.equal(out[0].deleted, undefined);
  assert.equal(out[0].title, 'diedit selepas');
});

test('seri: tombstone menang; tanpa tombstone hasil sama tak kira arah', () => {
  assert.equal(mergeList([T('a', NOW - 5)], [{ id: 'a', deleted: true, updatedAt: NOW - 5 }], NOW)[0].deleted, true);
  const x = T('a', 5, { title: 'X' }), y = T('a', 5, { title: 'Y' });
  assert.deepEqual(mergeList([x], [y], NOW), mergeList([y], [x], NOW));
});

test('komutatif & idempoten (kandungan)', () => {
  const a = { tasks: [T('1', 1), T('2', 5), { id: '3', deleted: true, updatedAt: NOW - 9 }], shop: [{ id: 's1', name: 'Telur', updatedAt: 3 }] };
  const b = { tasks: [T('2', 7, { title: 'baru' }), T('3', 4), T('4', 2)], shop: [{ id: 's2', name: 'Gula', updatedAt: 1 }] };
  const ab = mergeState(a, b, NOW), ba = mergeState(b, a, NOW);
  assert.ok(sameState(ab, ba));
  assert.ok(sameState(mergeState(ab, ab, NOW), ab));
  assert.ok(sameState(mergeState(ab, a, NOW), ab));
});

test('susunan: item baru dari remote di depan, kemudian susunan tempatan', () => {
  const out = mergeList([T('x', 1), T('y', 1)], [T('n1', 2), T('y', 1), T('n2', 2)], NOW);
  assert.deepEqual(ids(out), ['n1', 'n2', 'x', 'y']);
});

test('tombstone lebih 90 hari dibuang; yang baru disimpan', () => {
  const old = { id: 'o', deleted: true, updatedAt: NOW - TOMB_TTL - 1 };
  const recent = { id: 'r', deleted: true, updatedAt: NOW - 1000 };
  assert.deepEqual(ids(mergeList([old, recent], [], NOW)), ['r']);
});

test('data lama tanpa updatedAt / remote kosong / item rosak', () => {
  const out = mergeState({ tasks: [{ id: 'lama', title: 'tiada updatedAt' }], shop: [{ id: 's', name: 'Roti' }, null, { name: 'tiada id' }] }, null, NOW);
  assert.deepEqual(ids(out.tasks), ['lama']);
  assert.deepEqual(ids(out.shop), ['s']);
  const out2 = mergeList([{ id: 'lama' }], [T('lama', 1, { title: 'remote' })], NOW);
  assert.equal(out2[0].title, 'remote', 'apa-apa updatedAt > tiada');
});

test('sameState abaikan susunan, kesan perbezaan', () => {
  assert.ok(sameState({ tasks: [T('a', 1), T('b', 1)], shop: [] }, { tasks: [T('b', 1), T('a', 1)], shop: [] }));
  assert.ok(!sameState({ tasks: [T('a', 1)], shop: [] }, { tasks: [T('a', 2)], shop: [] }));
  assert.ok(sameState({ v: 1, tasks: [], shop: [] }, { tasks: [], shop: [] }));
});
