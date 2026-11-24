/**
 * Ingat! — Peti masuk senarai barang (Cloudflare Worker + KV)
 * Shopping-list inbox (Cloudflare Worker + KV)
 *
 * Ganti Google Apps Script (Code.gs). API serasi / compatible API:
 *   POST /                       borang minta.html: from, items (satu baris satu barang), note, website (honeypot)
 *                                → { result: 'success', count }
 *   GET  /?action=list&since=ID  app tarik barang yang ID-nya > since (tak berganda)
 *                                → { result: 'success', items: [{ id, time, from, item, note }], next }
 *   GET  /                       → { result: 'ok' } (semak worker hidup)
 *
 * Binding / tetapan (Settings → Variables / Bindings):
 *   LIST              KV namespace (wajib)
 *   ALLOWED_ORIGINS   (pilihan) senarai origin dipisah koma. Default: https://msyahmies.github.io
 *   TELEGRAM_TOKEN    (pilihan, Secret) token bot dari @BotFather
 *   TELEGRAM_CHAT_ID  (pilihan) chat id kau
 *
 * Langkah setup penuh: https://github.com/msyahmies/ingat#setup-cloudflare
 */

const DEFAULT_ORIGINS = 'https://msyahmies.github.io';
const PREFIX = 'item:';
const TTL_SECONDS = 60 * 60 * 24 * 30; // barang dibuang automatik selepas 30 hari
const MAX_ITEMS = 50;
const MAX_LIST = 500; // had barang dipulangkan sekali tarik

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (!env.LIST) return json({ result: 'error', message: 'KV binding LIST belum diset / not bound' }, 500, cors);
      const url = new URL(request.url);

      if (request.method === 'POST') return await handlePost(request, env, ctx, cors);

      if (request.method === 'GET') {
        if (url.searchParams.get('action') === 'list') return await handleList(url, env, cors);
        // ack disokong untuk keserasian dengan Code.gs; tak perlu (barang tamat sendiri selepas 30 hari)
        if (url.searchParams.get('action') === 'ack') return json({ result: 'success' }, 200, cors);
        return json({ result: 'ok', message: 'Ingat! inbox aktif / active (Cloudflare)' }, 200, cors);
      }
      return json({ result: 'error', message: 'Method not allowed' }, 405, cors);
    } catch (err) {
      console.error(err);
      return json({ result: 'error', message: String(err && err.message || err) }, 500, cors);
    }
  }
};

async function handlePost(request, env, ctx, cors) {
  const p = await readBody(request);
  if (p.website) return json({ result: 'success', count: 0 }, 200, cors); // honeypot (bot)

  const items = String(p.items || '')
    .split(/[\n,]+/)
    .map((s) => clean(s, 200))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
  if (!items.length) return json({ result: 'error', message: 'Tiada barang / No items' }, 400, cors);

  const from = clean(p.from, 60) || '—';
  const note = clean(p.note, 500);
  const now = Date.now();
  const rand = crypto.randomUUID().slice(0, 8);

  // ID boleh disusun ikut masa: 13 digit masa + nombor urutan + rawak
  // → app hantar ?since=<ID terakhir> dan hanya dapat barang lebih baru.
  await Promise.all(items.map((item, i) => {
    const id = `${String(now).padStart(13, '0')}-${String(i).padStart(3, '0')}-${rand}`;
    const rec = { id, time: now, from, item, note };
    const body = JSON.stringify(rec);
    // metadata (had 1024 bait) membolehkan list tanpa get satu-satu; nota panjang → simpan dalam value sahaja
    const opts = { expirationTtl: TTL_SECONDS };
    if (new TextEncoder().encode(body).length <= 1000) opts.metadata = rec;
    return env.LIST.put(PREFIX + id, body, opts);
  }));

  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
    const text = `🛒 ${from}: ${items.length} barang nak beli / items to buy\n` +
      items.map((i) => '• ' + i).join('\n') + (note ? `\n\n📝 ${note}` : '');
    const send = fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true })
    }).catch((e) => console.error('telegram', e));
    if (ctx && ctx.waitUntil) ctx.waitUntil(send); else await send;
  }

  return json({ result: 'success', count: items.length }, 200, cors);
}

async function handleList(url, env, cors) {
  const since = (url.searchParams.get('since') || '').slice(0, 64);
  const items = [];
  let cursor;
  do {
    const page = await env.LIST.list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const k of page.keys) {
      const id = k.name.slice(PREFIX.length);
      if (since && id <= since) continue;
      let rec = k.metadata;
      if (!rec) { const v = await env.LIST.get(k.name); rec = v && JSON.parse(v); }
      if (rec) items.push(rec);
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor && items.length < MAX_LIST);

  items.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out = items.slice(0, MAX_LIST);
  return json({ result: 'success', items: out, next: out.length ? out[out.length - 1].id : since }, 200, cors);
}

async function readBody(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try { return await request.json(); } catch { return {}; }
  }
  const text = await request.text(); // form-urlencoded (minta.html) atau text
  return Object.fromEntries(new URLSearchParams(text));
}

function corsHeaders(request, env) {
  const allowed = String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (allowed.includes('*')) h['Access-Control-Allow-Origin'] = '*';
  else if (allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max || 500);
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}
