# Ingat! 🔔: app peringatan untuk orang pelupa / a reminder app for forgetful people

> **Dwibahasa / Bilingual:** tekan butang **EN / BM** di penjuru kanan atas untuk tukar bahasa. Notifikasi ikut bahasa yang dipilih. Tap the **EN / BM** button (top right) to switch language; notifications follow it too.

App web (PWA) yang dipasang terus ke skrin utama fon. Tak perlu Play Store. Data disimpan dalam fon sahaja.

## Apa yang app ni buat

- **Tugasan**: tambah kerja dengan masa peringatan. Ada butang pantas (+30 min, petang ni, esok pagi...). Boleh ulang setiap hari/minggu/bulan.
- **Sehingga 4 masa untuk satu tugasan** (cth makan ubat 9:00, 12:00, 3:00, 5:00): dalam borang tekan **+ Tambah masa**, dan tekan ✕ untuk buang satu masa.
  - Setiap masa keluar notifikasi sendiri, dengan tanda (1/4), (2/4) dan seterusnya.
  - **Selesai** / **Tunda 10 min** pada notifikasi hanya untuk masa tu sahaja. Bila semua masa dah selesai, tugasan dikira siap (atau berulang).
  - Tanda ✓ dalam senarai = selesai seluruh tugasan. Kalau berulang, **semua masa** dianjak ke hari/minggu/bulan seterusnya.
  - Eksport Kalendar buat satu acara + alarm untuk setiap masa.
- **Terlepas**: kerja ditunjuk merah di atas sekali hanya selepas **masa terakhir** lalu, sampai kau tanda selesai.
- **Nak Beli**: senarai barang. Taip banyak sekaligus dengan koma: `telur, gula, roti`.
- **Notifikasi**:
  - ⏰ bila sampai masa tugasan (ada butang **Selesai** / **Tunda 10 min**)
  - 🌅 ringkasan pagi: senarai kerja hari ni (default 8:00 pagi)
  - 🛒 peringatan barang yang belum dibeli (default 5:30 petang)
- **📅 Kalendar**: eksport peringatan ke Kalendar fon (fail `.ics`).
- **☁️ Sync antara peranti**: tugasan & senarai sama di fon, PC dan app skrin utama, dengan kod sync peribadi. Lihat [Sync antara peranti](#setup-sync).

## ⚠️ Penting: had notifikasi app web

Fon (terutamanya Android dengan penjimat bateri, dan iPhone) akan **tidurkan app web bila ditutup**. Jadi:

- Bila app dibuka (atau baru diguna), notifikasi keluar tepat pada masanya.
- Bila app ditutup lama, notifikasi **mungkin lambat atau tak keluar**.
- **Cara paling pasti:** tekan 📅 pada tugasan penting, atau **Tetapan → Eksport semua ke Kalendar**. Kalendar fon akan bunyi walaupun app ni tak dibuka langsung.

## Cara pasang di fon / Install on your phone

**Link app / App link: https://ingat-h7u.pages.dev**

App dihoskan di **Cloudflare Pages** dan auto-deploy dari branch `main` repo ni. Setiap push ke `main` = versi baru dalam 1–2 minit. / Hosted on Cloudflare Pages, auto-deployed from `main`.

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

Borang perlukan satu "backend" untuk simpan senarai. Pilih **satu**:

| | **A. Cloudflare Worker + KV** (disyorkan) | **B. Google Sheet + Apps Script** |
|---|---|---|
| Fail kod | [`worker.js`](worker.js) | [`Code.gs`](Code.gs) |
| URL nampak macam | `https://ingat.NAMA.workers.dev` | `https://script.google.com/macros/s/.../exec` |
| Notifikasi segera bila app ditutup | Telegram (pilihan) | Email (pilihan) |
| Kos | Percuma (pelan Free) | Percuma |

App kenal sendiri jenis URL: yang berakhir `/exec` = Google, selain tu = Cloudflare. Kau boleh tukar bila-bila masa. Cuma tampal URL lain dalam **Tetapan → Terima senarai dari orang lain**, kemudian hantar link borang yang baru kepada keluarga.

<a id="setup-cloudflare"></a>

### A. Setup Cloudflare Worker + KV (±10 minit, melalui dashboard)

Perlu akaun Cloudflare percuma: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).

**1. Buat KV namespace (tempat simpan senarai)**
1. Log masuk [dash.cloudflare.com](https://dash.cloudflare.com).
2. Menu kiri: **Storage & Databases → KV** (dalam sesetengah akaun: **Workers & Pages → KV**).
3. Tekan **Create** / **Create a namespace**, namakan `ingat-list`, kemudian **Add / Create**.

**2. Buat Worker**
1. Menu kiri: **Compute (Workers) → Workers & Pages** → **Create** → **Create Worker** (atau **Start with Hello World!**).
2. Namakan `ingat` → **Deploy**. Ini akan deploy kod contoh dulu.
3. Tekan **Edit code**. Padam semua kod dalam `worker.js` di editor, tampal **semua** isi fail [`worker.js`](worker.js) dari repo ni, kemudian tekan **Deploy**.

**3. Sambung (bind) KV ke Worker**
1. Buka Worker `ingat` → tab **Settings** → **Bindings** → **Add** → **KV namespace**.
2. **Variable name:** `LIST` (mesti huruf besar, tepat begini). **KV namespace:** `ingat-list`.
3. Tekan **Save / Deploy**.

**4. Salin URL & uji**
1. Di halaman Worker, salin URL `https://ingat.<nama-akaun>.workers.dev` (tab **Settings → Domains & Routes**, atau di bahagian atas halaman).
2. Buka URL tu dalam browser. Sepatutnya keluar `{"result":"ok", ...}`. Kalau keluar `KV binding LIST belum diset`, ulang langkah 3.

**5. Sambung ke app**
1. Dalam app Ingat!: **Tetapan → Terima senarai dari orang lain**, tampal URL Worker → **Simpan URL**. Di bawah butang akan tertulis **Guna: Cloudflare Worker**.
2. Tekan **💬 Hantar melalui WhatsApp** atau **📤 Kongsi link borang** untuk hantar link kepada isteri / keluarga.

> Secara default Worker hanya terima permintaan dari `https://ingat-h7u.pages.dev` dan `https://msyahmies.github.io` (CORS). Kalau app dipindah ke domain lain, set variable **`ALLOWED_ORIGINS`** (Settings → Variables and Secrets → Add → Text) dengan senarai origin dipisah koma, cth: `https://ingat-h7u.pages.dev,https://domain-baru.com`. Bila `ALLOWED_ORIGINS` diset, ia **ganti** senarai default.

<a id="setup-telegram"></a>

### A2. (Pilihan) Notifikasi Telegram, sampai walaupun app ditutup

1. Dalam Telegram, cari **@BotFather** → hantar `/newbot` → ikut arahan (nama bot, cth `Ingat Barang Bot`). BotFather akan bagi **token**, cth `123456789:AAH...`.
2. Buka bot baru tu dan tekan **Start** (atau hantar apa-apa mesej, cth `hai`). Bot tak boleh hantar mesej kepada kau selagi kau belum mula chat dengan dia.
3. Dapatkan **chat id** kau: buka `https://api.telegram.org/bot<TOKEN>/getUpdates` dalam browser (ganti `<TOKEN>`). Cari `"chat":{"id":123456789` dan salin nombor tu.
   - Cara lain: hantar mesej kepada **@userinfobot**, dan ia balas dengan id kau.
4. Cloudflare → Worker `ingat` → **Settings → Variables and Secrets** → **Add**:
   - `TELEGRAM_TOKEN`: jenis **Secret**, nilai = token dari BotFather
   - `TELEGRAM_CHAT_ID`: jenis **Text**, nilai = chat id kau
   - Tekan **Deploy / Save**.
5. Uji: isi borang sekali. Kau patut dapat mesej Telegram "🛒 Sayang: 2 barang nak beli…".

> Token bot macam kata laluan. Simpan sebagai **Secret** sahaja. Jangan tampal dalam kod atau kongsi.

### B. Setup Google Sheet + Apps Script (cara lama, masih disokong)

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
- Bila app ditutup, barang tetap selamat dalam KV / Google Sheet dan akan masuk bila kau buka app. Untuk tahu serta-merta, set Telegram (A2) atau `NOTIFY_EMAIL` (B, langkah 3).
- Tiada barang masuk dua kali:
  - **Cloudflare:** app ingat ID barang terakhir dan hanya minta yang lebih baru (`?since=`). Barang dalam KV dibuang automatik selepas 30 hari.
  - **Google:** barang yang dah masuk ditanda `diambil` dalam Sheet.
- Tukar URL? Link borang lama yang isteri simpan masih hantar ke backend lama. Hantar link baru kepadanya.

> Siapa-siapa yang ada link tu boleh tambah barang. Jangan kongsi di tempat awam.

### English
Pick one backend for the family form:
- **A. Cloudflare Worker + KV (recommended):** create a KV namespace, create a Worker, paste [`worker.js`](worker.js), add a KV binding named **`LIST`**, then copy the `*.workers.dev` URL. Optional Telegram alerts: set `TELEGRAM_TOKEN` (Secret) and `TELEGRAM_CHAT_ID` (Text) in the Worker's *Variables and Secrets*.
- **B. Google Sheet + Apps Script:** paste [`Code.gs`](Code.gs), run `setup`, deploy as a Web app with access *Anyone*, then copy the `/exec` URL.

Paste the URL in **Settings → Receive lists from others** (the app detects the type: `/exec` = Google, anything else = Cloudflare), then share the form link. Items appear in **To Buy** with the sender's name, plus a notification.

### Ujian / Tests
```bash
npm test
```
Ujian `worker.js` (borang & `/sync`) dengan KV & Telegram palsu, dan ujian logik gabung sync `merge.js`: [`tests/`](tests/). Tiada pakej perlu dipasang (Node 18+).

<a id="setup-sync"></a>

## ☁️ Sync antara peranti (fon, PC, app skrin utama)

Tugasan dan senarai **Nak Beli** jadi sama di semua peranti kau. Setting peranti (bahasa, masa ringkasan pagi / peringatan barang) kekal berasingan dalam setiap peranti. App tetap jalan **tanpa internet**, dan sync berlaku bila online semula.

Sync guna Cloudflare Worker yang sama dengan borang ([`worker.js`](worker.js), KV binding `LIST`). Tiada binding atau setting baru diperlukan.

### Setup sekali sahaja

**1. Deploy semula Worker dengan kod terbaru** (wajib sekali, sebab endpoint `/sync` adalah baru)
1. Cloudflare dashboard → **Workers & Pages** → Worker `ingat` → **Edit code**.
2. Padam semua kod, tampal **semua** isi [`worker.js`](worker.js) terbaru → **Deploy**.
3. Uji: buka `https://ingat.msyahmies.workers.dev/sync` dalam browser. Sepatutnya keluar `{"result":"error","message":"Kod sync tak sah ..."}`. Itu betul, sebab tiada kod dihantar. Kalau keluar `{"result":"ok",...}`, kod lama masih berjalan.

**2. Hidupkan sync di peranti pertama** (cth PC)
1. App Ingat! → **Tetapan → Sync antara peranti** → **✨ Jana kod sync baru**.
2. Data dalam peranti ni terus dimuat naik. Status bertukar jadi **✓ Sync terakhir: …**

**3. Sambung peranti lain** (cth fon). Pilih satu cara:
- **QR:** di PC tekan **▦ Tunjuk QR** → imbas dengan kamera fon → app terbuka dan kod diisi automatik.
- **Link:** tekan **🔗 Kongsi link** → hantar kepada **diri sendiri** (cth WhatsApp "Message yourself") → buka di fon.
- **Taip kod:** tekan **Tunjuk** / **📋 Salin kod** → di fon, **Tetapan → Dah ada kod dari peranti lain?** → tampal → **Sambung**.

Data yang **sedia ada** dalam peranti baru akan **digabung**, bukan diganti. Tiada tugasan atau barang yang hilang.

> **App skrin utama (PWA):** di sesetengah fon, app yang dipasang di skrin utama simpan data berasingan dari browser. Kalau macam tu, buka app dari skrin utama → Tetapan → masukkan kod (taip / tampal). Selepas tu ia sync sama macam peranti lain.

### Bila sync berlaku?
- Bila app dibuka atau kembali ke skrin.
- ±2 saat selepas setiap perubahan (tambah, edit, tanda, padam).
- Setiap 1 minit selagi app terbuka.
- Bila internet kembali (selepas offline).
- Tekan **🔄 Sync sekarang** bila-bila masa.

Status dalam Tetapan: **✓ Sync terakhir: 7:28 malam**, **📴 Offline**, atau **⚠️ Ralat sync: …**. Ikon ☁️ di header (☁️⚠️ jika ralat).

### Macam mana data tak hilang / tertindih?
- Setiap tugasan dan barang ada `id` + `updatedAt`. Item yang dipadam disimpan sebagai *tombstone* (`deleted: true`) selama 90 hari.
- Bila dua peranti sync, data **digabung per item**: versi dengan `updatedAt` terbaru menang. Edit item **berbeza** di dua peranti → kedua-dua kekal. Edit item **sama** → yang terkini menang.
- Kalau dua peranti simpan serentak, server tolak yang lambat (409) dan peranti tu gabung semula sebelum simpan. Tiada yang tertindih.
- Notifikasi tetap keluar di **setiap** peranti. Rekod "dah dinotifikasi" disimpan setempat dan tak disync. Tugasan lama yang datang dari peranti lain tak akan bunyi semula.
- Jam peranti dipakai untuk `updatedAt`, jadi pastikan masa peranti betul (auto).

### Keselamatan kod sync
- Kod = 24 huruf/nombor rawak (±120 bit). **Macam kata laluan**: sesiapa yang ada kod boleh baca dan ubah senarai kau. Jangan kongsi dengan orang lain.
- Worker simpan data di KV key `sync:<SHA-256 kod>`. **Kod mentah tak disimpan.**
- Kod sync **tak** dimasukkan dalam fail backup.
- Kod bocor? Di setiap peranti: **Tetapan → Lanjutan → Putuskan sync**, kemudian **Jana kod sync baru** di satu peranti dan sambung semula yang lain. Data kekal dalam peranti.
- Had saiz data sync: 1 MB (beribu-ribu tugasan). Data sync yang tak digunakan selama ±13 bulan dibuang automatik.

### English
**Sync** keeps your tasks and To Buy list the same on every device (language and notification times stay per-device; the app works offline). One-time setup: **redeploy the Worker** with the latest [`worker.js`](worker.js) (new `/sync` endpoint; no new bindings). Then in the app: **Settings → Sync between devices → Create a new sync code**, and connect other devices via **QR**, **Share link** or by typing the code. Existing data on each device is **merged**, never replaced. Items merge per item by latest `updatedAt`, deletions are tombstones, and concurrent saves are retried after a 409 conflict. The code is a secret (~120 bits). The Worker stores data under `sync:<SHA-256 of code>` and never stores the raw code.

## Fail

| Fail | Fungsi |
|---|---|
| `index.html` | Seluruh app (UI + logik) |
| `sw.js` | Service worker: offline, notifikasi, butang Selesai/Tunda |
| `manifest.webmanifest` | Supaya boleh dipasang ke skrin utama |
| `icon-192.png`, `icon-512.png` | Ikon app |
| `minta.html` | Borang untuk orang lain isi senarai barang |
| `worker.js` | Cloudflare Worker: simpan senarai dalam KV & bagi app tarik (backend A) |
| `Code.gs` | Google Apps Script: simpan senarai ke Google Sheet & bagi app tarik (backend B) |
| `merge.js` | Logik gabung data sync (per item, `updatedAt` + tombstone) |
| `vendor/qrcode.js` | Pustaka QR (MIT, Kazuhiko Arase) untuk kod sync, dimuat bila perlu sahaja |
| `tests/*.test.mjs`, `package.json` | Ujian `worker.js` (borang + `/sync`) dan `merge.js` (`npm test`) |

---

## English summary

- **Tasks:** add things to do with up to **4 reminder times** each (tap **+ Add time**, ✕ to remove), quick buttons (+30 min, this evening, tomorrow morning), repeat daily/weekly/monthly (all times repeat). Each time gets its own notification (1/4, 2/4…); **Done / Snooze** on a notification applies to that time only. A task turns red (missed) only after its **last** time has passed. Calendar export adds an event + alarm for every time.
- **To Buy:** shopping list; type several at once with commas: `eggs, sugar, bread`.
- **Notifications:** at the task time (with **Done / Snooze 10 min** buttons), a morning summary (default 8:00 AM) and an "items not bought yet" reminder (default 5:30 PM).
- **Limitation:** phones put web apps to sleep when closed, so notifications may be late. For important things, tap 📅 to add them to your phone's Calendar, which always rings.
- **Sync:** keep tasks & lists the same on all your devices with a private sync code (Settings → Sync between devices). See [setup](#setup-sync).
- **Install:** open https://ingat-h7u.pages.dev on your phone → Android Chrome: menu ⋮ → *Install app*; iPhone Safari: Share → *Add to Home Screen*. Then tap **Allow notifications** and try **Settings → Send test notification**.
