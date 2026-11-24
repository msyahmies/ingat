# Ingat! 🔔: app peringatan untuk orang pelupa / a reminder app for forgetful people

> **Dwibahasa / Bilingual:** tekan butang **EN / BM** di penjuru kanan atas untuk tukar bahasa. Notifikasi ikut bahasa yang dipilih. Tap the **EN / BM** button (top right) to switch language; notifications follow it too.

App web (PWA) yang dipasang terus ke skrin utama fon. Tak perlu Play Store. Data disimpan dalam fon sahaja.

## Apa yang app ni buat

- **Tugasan**: tambah kerja dengan masa peringatan. Ada butang pantas (+30 min, petang ni, esok pagi...). Boleh ulang setiap hari/minggu/bulan.
- **Terlepas**: kerja yang dah lepas masa ditunjuk warna merah di atas sekali, sampai kau tanda selesai.
- **Nak Beli**: senarai barang. Taip banyak sekaligus dengan koma: `telur, gula, roti`.
- **Notifikasi**:
  - ⏰ bila sampai masa tugasan (ada butang **Selesai** / **Tunda 10 min**)
  - 🌅 ringkasan pagi: senarai kerja hari ni (default 8:00 pagi)
  - 🛒 peringatan barang yang belum dibeli (default 5:30 petang)
- **📅 Kalendar**: eksport peringatan ke Kalendar fon (fail `.ics`).

## ⚠️ Penting: had notifikasi app web

Fon (terutamanya Android dengan penjimat bateri, dan iPhone) akan **tidurkan app web bila ditutup**. Jadi:

- Bila app dibuka (atau baru diguna), notifikasi keluar tepat pada masanya.
- Bila app ditutup lama, notifikasi **mungkin lambat atau tak keluar**.
- **Cara paling pasti:** tekan 📅 pada tugasan penting, atau **Tetapan → Eksport semua ke Kalendar**. Kalendar fon akan bunyi walaupun app ni tak dibuka langsung.

## Cara pasang di fon / Install on your phone

**Link app / App link: https://msyahmies.github.io/ingat/**

1. Buka link tu di fon. / Open the link on your phone.
   - **Android (Chrome):** menu ⋮ → **Install app / Add to Home screen**
   - **iPhone (Safari):** butang Share → **Add to Home Screen**. Di iPhone, notifikasi hanya berfungsi selepas dipasang ke skrin utama (iOS 16.4 ke atas).
2. Buka app dari skrin utama → tekan **Benarkan notifikasi**.
3. Pergi **Tetapan → Hantar notifikasi ujian** untuk pastikan ia berfungsi.

### Tip Android supaya notifikasi lebih konsisten
Settings → Apps → Chrome (atau app Ingat!) → Battery → **Unrestricted / Tidak dihadkan**.


<a id="setup-borang"></a>

## 📨 Borang untuk orang lain isi (cth: isteri suruh beli barang dapur)

Kau hantar satu link. Dia buka, tulis barang dan tekan **Hantar**. Barang terus masuk ke senarai **Nak Beli** dalam app kau, dengan nama dia dan nota. App juga keluarkan notifikasi "🛒 Sayang tambah 3 barang".

Borang tu ([`minta.html`](minta.html)) pun dwibahasa, dan ada butang pantas (+ Telur, + Beras, ...) supaya senang diisi.

### Setup sekali sahaja (±5 minit, percuma)

1. Buka [sheets.new](https://sheets.new) untuk cipta Google Sheet baru. Namakan, cth: `Ingat - Barang`.
2. Menu **Extensions → Apps Script**. Padam kod asal, tampal **semua** isi fail [`Code.gs`](Code.gs), kemudian **Save** 💾.
3. (Pilihan) Isi `NOTIFY_EMAIL` dengan email kau. Gmail akan bagi notifikasi walaupun app Ingat! ditutup.
4. Pilih fungsi **`setup`** → **Run** → **Review permissions** → pilih akaun → **Advanced** → **Go to ... (unsafe)** → **Allow**. Ini normal untuk skrip milik sendiri.
5. **Deploy → New deployment** → ⚙️ **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone** (wajib)
   - Tekan **Deploy** dan salin URL yang berakhir dengan `/exec`.
6. Dalam app Ingat!: **Tetapan → Terima senarai dari orang lain**, tampal URL tu dan tekan **Simpan URL**.
7. Tekan **📤 Kongsi link borang** atau **💬 Hantar melalui WhatsApp** untuk hantar link kepada isteri / keluarga.

### Bila barang masuk?
- Bila app Ingat! dibuka, dan setiap 1 minit selagi app terbuka.
- Bila app ditutup, barang tetap selamat dalam Google Sheet dan akan masuk bila kau buka app. Untuk tahu serta-merta, isi `NOTIFY_EMAIL` (langkah 3).
- Barang yang dah masuk ditanda `diambil` dalam Sheet, jadi tak akan masuk dua kali.

> Siapa-siapa yang ada link tu boleh tambah barang. Jangan kongsi di tempat awam.

### English
Set up a Google Sheet + Apps Script as above (paste [`Code.gs`](Code.gs), run `setup`, deploy as Web app with access *Anyone*). Paste the `/exec` URL in **Settings → Receive lists from others**, then share the form link. Items your family submits appear in your **To Buy** list (with their name), with a notification. Set `NOTIFY_EMAIL` to also get an email instantly.

## Fail

| Fail | Fungsi |
|---|---|
| `index.html` | Seluruh app (UI + logik) |
| `sw.js` | Service worker: offline, notifikasi, butang Selesai/Tunda |
| `manifest.webmanifest` | Supaya boleh dipasang ke skrin utama |
| `icon-192.png`, `icon-512.png` | Ikon app |
| `minta.html` | Borang untuk orang lain isi senarai barang |
| `Code.gs` | Google Apps Script: simpan senarai ke Google Sheet & bagi app tarik |

---

## English summary

- **Tasks:** add things to do with a reminder time, quick buttons (+30 min, this evening, tomorrow morning), repeat daily/weekly/monthly. Missed tasks stay red at the top until you tick them.
- **To Buy:** shopping list; type several at once with commas: `eggs, sugar, bread`.
- **Notifications:** at the task time (with **Done / Snooze 10 min** buttons), a morning summary (default 8:00 AM) and an "items not bought yet" reminder (default 5:30 PM).
- **Limitation:** phones put web apps to sleep when closed, so notifications may be late. For important things, tap 📅 to add them to your phone's Calendar, which always rings.
- **Install:** open https://msyahmies.github.io/ingat/ on your phone → Android Chrome: menu ⋮ → *Install app*; iPhone Safari: Share → *Add to Home Screen*. Then tap **Allow notifications** and try **Settings → Send test notification**.
