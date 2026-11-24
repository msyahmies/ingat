/**
 * Ingat! — gabung data sync / sync merge
 *
 * Dipakai oleh app (index.html) dan ujian (tests/merge.test.mjs).
 * Setiap item (tugasan / barang) ada: id, updatedAt (ms), dan deleted:true untuk "tombstone" (item dipadam).
 * Peraturan: bagi setiap id, versi dengan updatedAt TERBARU menang. Jadi edit di dua peranti tak tertindih
 * (kecuali item yang SAMA diedit di kedua-dua peranti — yang terkini menang), dan item baru di mana-mana peranti
 * sentiasa digabung (tak hilang).
 * Seri (updatedAt sama): tombstone menang; kalau tidak, susunan tetap (deterministic) supaya semua peranti
 * dapat hasil yang sama.
 */
(function (root) {
  'use strict';

  const TOMB_TTL = 90 * 864e5; // tombstone dibuang selepas 90 hari

  const ts = (x) => Number(x && x.updatedAt) || 0;
  const validId = (x) => x && (typeof x.id === 'string' || typeof x.id === 'number') && String(x.id) !== '';

  // JSON dengan kunci bersusun — untuk banding & seri yang konsisten
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    }
    return JSON.stringify(v === undefined ? null : v);
  }

  // true jika a patut menang ke atas b
  function wins(a, b) {
    const d = ts(a) - ts(b);
    if (d) return d > 0;
    if (!!a.deleted !== !!b.deleted) return !!a.deleted;
    return canon(a) > canon(b);
  }

  /**
   * Gabung dua senarai item. Susunan hasil: item baru dari remote dahulu (ikut susunan remote),
   * kemudian susunan senarai tempatan. Tombstone lebih tua dari TOMB_TTL dibuang.
   */
  function mergeList(local, remote, now) {
    local = Array.isArray(local) ? local.filter(validId) : [];
    remote = Array.isArray(remote) ? remote.filter(validId) : [];
    now = Number.isFinite(now) ? now : Date.now();
    const best = new Map();
    for (const it of local.concat(remote)) {
      const id = String(it.id), cur = best.get(id);
      if (!cur || wins(it, cur)) best.set(id, it);
    }
    const localIds = new Set(local.map((x) => String(x.id)));
    const order = [];
    const seen = new Set();
    for (const x of remote) { const id = String(x.id); if (!localIds.has(id) && !seen.has(id)) { seen.add(id); order.push(id); } }
    for (const x of local) { const id = String(x.id); if (!seen.has(id)) { seen.add(id); order.push(id); } }
    return order.map((id) => best.get(id)).filter((x) => !(x.deleted && now - ts(x) > TOMB_TTL));
  }

  function mergeState(local, remote, now) {
    local = local || {}; remote = remote || {};
    return { v: 1, tasks: mergeList(local.tasks, remote.tasks, now), shop: mergeList(local.shop, remote.shop, now) };
  }

  // Sama kandungan? (abaikan susunan)
  function sameState(a, b) {
    const norm = (s) => {
      s = s || {};
      const sort = (l) => (Array.isArray(l) ? l.slice().sort((x, y) => (String(x.id) < String(y.id) ? -1 : 1)) : []);
      return canon({ tasks: sort(s.tasks), shop: sort(s.shop) });
    };
    return norm(a) === norm(b);
  }

  root.IngatMerge = { mergeList, mergeState, sameState, canon, TOMB_TTL };
})(typeof globalThis !== 'undefined' ? globalThis : this);
