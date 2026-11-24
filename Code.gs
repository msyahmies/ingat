/**
 * Ingat! — Peti masuk senarai barang / Shopping-list inbox
 *
 * Orang lain (cth: isteri) isi borang minta.html → barang masuk ke Google Sheet ni
 * → app Ingat! di fon kau tarik barang baru dan masukkan ke senarai "Nak Beli".
 *
 * Setup ringkas (penuh: https://github.com/msyahmies/ingat#setup-borang):
 *   1. sheets.new → Extensions → Apps Script → tampal SEMUA kod ini → Save.
 *   2. Pilih fungsi `setup` → Run → benarkan akses.
 *   3. Deploy → New deployment → Web app
 *        Execute as: Me | Who has access: Anyone
 *   4. Salin URL /exec → tampal dalam app Ingat! (Tetapan → Terima senarai dari orang lain).
 *
 * Ubah kod kemudian? Deploy → Manage deployments → ✏️ → Version: New version → Deploy.
 */

// ====== TETAPAN / SETTINGS ======
var SHEET_NAME = 'Barang';

// Email untuk dapat notifikasi setiap kali ada orang hantar senarai (sampai walaupun app ditutup).
// Biar kosong ('') untuk matikan. / Email to notify on each new list; '' to turn off.
var NOTIFY_EMAIL = '';

var MAX_ITEMS = 50; // had barang sekali hantar / max items per submission

var HEADERS = ['ID', 'Masa / Time', 'Dari / From', 'Barang / Item', 'Nota / Note', 'Status'];

// ====== ENDPOINT: terima borang ======
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var p = (e && e.parameter) || {};
    if (p.website) return json_({ result: 'success', count: 0 }); // honeypot (bot)

    var items = String(p.items || '')
      .split(/[\n,]+/)
      .map(function (s) { return clean_(s, 200); })
      .filter(function (s) { return s; })
      .slice(0, MAX_ITEMS);
    if (!items.length) return json_({ result: 'error', message: 'Tiada barang / No items' });

    var from = clean_(p.from, 60) || '—';
    var note = clean_(p.note, 500);
    var now = new Date();
    var sheet = getSheet_();
    var rows = items.map(function (it) { return [Utilities.getUuid(), now, from, it, note, 'baru']; });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);

    if (NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail(NOTIFY_EMAIL,
          '🛒 ' + from + ': ' + items.length + ' barang nak beli / items to buy',
          items.map(function (i) { return '• ' + i; }).join('\n') + (note ? '\n\nNota / Note: ' + note : ''));
      } catch (mailErr) { console.error(mailErr); }
    }
    return json_({ result: 'success', count: items.length });
  } catch (err) {
    console.error(err);
    return json_({ result: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// ====== ENDPOINT: app tarik / tanda barang ======
// ?action=list           → senarai barang berstatus "baru"
// ?action=ack&ids=a,b,c  → tanda "diambil" (supaya tak masuk dua kali)
function doGet(e) {
  var p = (e && e.parameter) || {};
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  var values = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];

  if (p.action === 'list') {
    var items = [];
    values.forEach(function (r) {
      if (r[5] === 'baru') items.push({ id: r[0], time: new Date(r[1]).getTime(), from: String(r[2]), item: String(r[3]), note: String(r[4]) });
    });
    return json_({ result: 'success', items: items });
  }

  if (p.action === 'ack') {
    var ids = String(p.ids || '').split(',');
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      values.forEach(function (r, i) {
        if (r[5] === 'baru' && ids.indexOf(String(r[0])) !== -1) sheet.getRange(i + 2, 6).setValue('diambil');
      });
    } finally { lock.releaseLock(); }
    return json_({ result: 'success' });
  }

  return json_({ result: 'ok', message: 'Ingat! inbox aktif / active' });
}

// ====== HELPER ======
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Potong panjang & elak "formula injection".
function clean_(v, max) {
  var s = String(v == null ? '' : v).trim().slice(0, max || 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Jalankan sekali dari editor (Run) untuk beri kebenaran & cipta header.
function setup() { getSheet_(); }
