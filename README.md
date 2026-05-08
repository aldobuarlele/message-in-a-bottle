
<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/Tailwind_CSS-2.2-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/SQLite3-5.x-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite3">
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge" alt="MIT License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/status-production-blue?style=for-the-badge" alt="Status: Production">
</p>

<h1 align="center">
  🧴 Message in a Bottle
</h1>

<p align="center">
  <em>Throw your words into the digital ocean. Pluck a stranger's secrets from the abyss.</em>
</p>

<br>

<p align="center">
  Bayangkan lautan digital — gelap, misterius, tak bertepi. 
  Di dalamnya terapung pesan-pesan dari jiwa-jiwa yang tak pernah saling mengenal. 
  <strong>Message in a Bottle</strong> adalah jeda dari hiruk-pikuk dunia maya yang penuh identitas, 
  algoritma, dan ekspektasi. 
  <br><br>
  Sebuah ruang anonim di mana satu-satunya hal yang berarti hanyalah <em>kata-kata</em> — 
  tanpa nama, tanpa wajah, tanpa jejak. 
  Anda menulis, Anda melempar, dan suatu saat, seorang asing menemukannya. 
  Lalu Anda mengambil botol lain dari lautan, dan membaca kisah dari seseorang 
  yang tak akan pernah Anda temui.
</p>

<br>
---

## ✨ Features

| # | Fitur | Detail |
|---|-------|--------|
| 🪟 | **UI Glassmorphism Modern** | Card transparan dengan `backdrop-blur-xl`, `border-white/20`, dan `bg-white/10` menciptakan efek kaca buram yang elegan. Latar gradien laut dari slate ke cyan ke amber. |
| 🎲 | **Ambil Pesan Acak** | Satu klik — dapatkan satu botol misterius dari lautan. Setiap kali refresh, pesan yang muncul berbeda. |
| 📝 | **Tulis Pesan Anonim** | Tulis rahasia tanpa login, registrasi, atau identitas apapun. Murni anonim. |
| 📊 | **Real-time Character Counter** | Counter 0/300 dengan feedback visual: putih (< 200), amber (200–279), merah (280+). |
| 🔄 | **Auto-fetch on Load** | Begitu halaman dimuat, aplikasi otomatis mengambil satu pesan acak — pengalaman seperti menemukan botol begitu tiba di pantai. |
| 🎭 | **4 Visual States** | State management lengkap: **Loading** (animasi ping), **Message** (teks pesan), **Empty** (database kosong), **Error** (koneksi gagal). Transisi mulus dengan fade-in-up. |
| ⌨️ | **Keyboard Shortcut** | Tekan `Escape` untuk menutup modal menulis — UX cepat dan intuitif. |
| 🔒 | **Privasi Penuh** | Tidak ada metadata. Tidak ada IP pengirim. Tidak ada timestamp. Botol murni tanpa jejak. |
| 🌊 | **Animasi Halus** | Botol melayang (float), modal fade-in-scale, tombol hover scale, dan pulse loading — semuanya dengan CSS keyframes murni tanpa library animasi tambahan. |
| 📱 | **Responsive Design** | Layout menyesuaikan dari mobile ke desktop dengan flexbox Tailwind. |


---

## 📸 Visual Preview

> _Tangkapan layar di bawah adalah placeholder. Ganti dengan URL screenshot asli dari aplikasi yang sedang berjalan._

| Reading State (Tampilan Utama) | Writing Modal (Menulis Pesan) |
|:---:|:---:|
| ![Reading State](https://via.placeholder.com/400x500/1e293b/94a3b8?text=Reading+State+-+Glassmorphism+UI) | ![Writing Modal](https://via.placeholder.com/400x500/1e293b/94a3b8?text=Writing+Modal+-+Character+Counter) |
| Tampilan utama dengan botol, pesan acak, dan tombol navigasi — dibalut efek <code>backdrop-blur</code> kaca. | Modal transparan dengan textarea, <strong>real-time character counter</strong>, dan tombol aksi gradien. |

| Loading State | Empty State |
|:---:|:---:|
| ![Loading State](https://via.placeholder.com/400x200/1e293b/94a3b8?text=Loading+State+-+Animasi+Ping) | ![Empty State](https://via.placeholder.com/400x200/1e293b/94a3b8?text=Empty+State+-+Lautan+Sepi) |
| Animasi <code>ping</code> dan teks "Mencari botol di lautan..." saat fetch. | Muncul saat database kosong — mengajak pengguna jadi yang pertama. |



---

## 🛠️ Tech Stack

### Frontend _(via CDN — Zero Build Step)_

| Teknologi | Peran | Keterangan |
|-----------|-------|------------|
| **HTML5** | Struktur semantik halaman | 1 file — `index.html` |
| **Tailwind CSS 2.2** | Styling utility-first | Di-load via CDN `<script>`, dikustom dengan `tailwind.config` inline |
| **Vanilla JS (ES6+)** | Interaktivitas & fetch API | 1 file — `script.js`, ~215 baris, tanpa framework |
| **Google Fonts (Inter)** | Tipografi modern | Font sans-serif ringan dengan bobot 300–700 |

> ✅ **Tanpa Webpack, Vite, React, atau build tools.** Cukup buka `index.html` di browser — atau lebih baik, jalankan server Express-nya.

### Backend

| Teknologi | Peran | Keterangan |
|-----------|-------|------------|
| **Node.js 18.x+** | Runtime JavaScript server-side | Event-driven, non-blocking I/O |
| **Express 4.18** | HTTP server & routing | 1 file — `server.js`, ~56 baris, minimalis |
| **SQLite3 5.x** | Database file-based | 1 file — `messages.db`, auto-generated |
| **SQLite** | Query | Prepared statements, `ORDER BY RANDOM() LIMIT 1` untuk random picking |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18.x or higher — [Download](https://nodejs.org/)
- **npm** (bundled with Node.js)
- Sebuah terminal dan rasa penasaran ✨

### Installation

```bash
# 1. Clone repositori
git clone https://github.com/aldobuarlele/message-in-a-bottle.git
cd message-in-a-bottle

# 2. Install dependencies
npm install

# 3. Jalankan server
npm start
```

Server akan berjalan di **http://localhost:3000**.

> File `messages.db` akan dibuat otomatis saat pertama kali server dijalankan. Tidak perlu setup database manual.

### Usage

1. Buka **http://localhost:3000** di browser
2. Halaman akan otomatis menampilkan satu pesan acak dari lautan 🌊
3. Klik **🔍 Temukan Pesan Lain** untuk mengambil botol baru
4. Klik **✍️ Tulis Pesan** untuk membuka modal dan menulis pesan
5. Tulis rahasia Anda (maks 300 karakter), lalu klik **💧 Lempar ke Laut**
6. Setelah sukses, modal tertutup otomatis dan pesan baru muncul

---

## 📡 API Reference

### `GET /api/messages`

Mengambil **satu pesan acak** dari lautan (database SQLite).

**Response `200`** — Pesan ditemukan:
```json
{
  "message": "Halo, siapa pun yang membaca ini... aku merasa tidak sendirian."
}
```

**Response `200`** — Database kosong:
```json
{
  "message": "Tidak ada pesan dalam botol!"
}
```

**Response `500`** — Server error:
```json
{
  "error": "Gagal mengambil pesan"
}
```

---

### `POST /api/messages`

Mengirim pesan baru ke lautan.

**Request Body:**
```json
{
  "message": "Isi pesan anonimmu (maks 300 karakter)"
}
```

**Response `200`** — Sukses:
```json
{
  "message": "Pesan berhasil dilempar ke laut!"
}
```

**Response `400`** — Validasi gagal:
```json
{
  "error": "Pesan tidak boleh kosong atau lebih dari 300 karakter"
}
```

**Response `500`** — Server error:
```json
{
  "error": "Gagal menyimpan pesan"
}
```

---

## 📂 Project Structure

```
message-in-a-bottle/
├── 📄 server.js           # Entry point: Express server + SQLite + API routes
├── 📄 index.html          # Frontend: struktur halaman dengan Tailwind CDN
├── 📄 script.js           # Client-side JS: fetch, DOM events, state management
├── 📄 package.json        # Project manifest & dependency declarations
├── 📄 package-lock.json   # Lockfile (auto-generated)
├── 📄 messages.db         # SQLite database (auto-generated saat runtime)
├── 📄 README.md           # Dokumentasi project (ini dia!)
└── 📄 .gitignore          # Git ignore rules
```

---

## 🔐 Security

| Aspek | Status | Keterangan |
|-------|--------|------------|
| **SQL Injection** | ✅ Aman | Semua query menggunakan **parameterized prepared statements** (`?` placeholder), bukan string concatenation |
| **XSS** | ✅ Aman | Pesan ditampilkan via `textContent`, bukan `innerHTML` — script injection tidak memungkinkan |
| **Input Validation** | ✅ Double layer | **Client-side:** HTML `maxlength="300"`. **Server-side:** validasi panjang karakter di Express handler |
| **Rate Limiting** | ⚠️ Belum ada | Lihat Future Roadmap untuk rencana implementasi |
| **HTTPS** | ⚠️ Lokal | Untuk production, gunakan reverse proxy (Nginx, Caddy) dengan HTTPS |

---

## 🧪 Testing via CLI

```bash
# Test GET — ambil satu pesan acak
curl http://localhost:3000/api/messages

# Test POST — kirim pesan baru
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"Halo dari laut lepas!"}'

# Test POST dengan payload kosong (harus error 400)
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message":""}'

# Test POST dengan karakter berlebih (harus error 400)
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"'$(python3 -c "print('A'*301)")'"}'
```

---

## 🗺️ Future Roadmap

### 🌊 Botol yang Membusuk (Decaying Bottles)
> _"Setiap botol memiliki waktu hidup. Jika tidak ditemukan dalam 7 hari, botol akan hancur dimakan ombak."_

Implementasi `created_at` timestamp dan cron job (atau filter query) yang secara otomatis menghapus pesan yang lebih tua dari N hari. Ini akan memberikan dinamika: pesan yang jarang diambil punya kemungkinan lebih besar untuk hilang selamanya. Setiap botol terasa lebih berharga karena ada urgensi — _"baca aku sebelum aku tenggelam."_

### ⏳ Time Capsule
> _"Tentukan kapan botolmu akan terdampar. Esok? Minggu depan? Setahun lagi?"_

Fitur `scheduled_at` timestamp: pengguna bisa menentukan kapan pesan mereka mulai bisa diambil oleh orang lain. Botol akan "tidur" di dasar laut sampai waktunya tiba. Cocok untuk:
- Pengingat masa depan untuk diri sendiri
- Pesan ulang tahun untuk orang asing
- Eksperimen sosial tentang waktu dan kebetulan

### ⚡ Scaling & Migration
> _"Dari satu botol menjadi jutaan botol."_

Rencana migrasi ketika database SQLite mulai mencapai batas:

| Tahap | Solusi | Alasan |
|-------|--------|--------|
| **1** | **SQLite WAL Mode** | Mengaktifkan Write-Ahead Logging untuk performa concurrent read/write lebih baik tanpa migrasi |
| **2** | **PostgreSQL via Docker** | Migrasi ke PostgreSQL untuk konkurensi tinggi, replication, dan tooling mature. Bisa dijalankan via Docker Compose |
| **3** | **Redis Caching** | Cache pesan populer atau random pick di Redis untuk mengurangi beban database |
| **4** | **Horizontal Scaling** | Load balancer + multiple Node.js instances + read replicas PostgreSQL |
| **5** | **Auto-scaling Kubernetes** | Untuk skala produksi besar: deployment ke Kubernetes dengan HPA (Horizontal Pod Autoscaler) |

### 💡 Ide Lainnya

- **🌐 Dark Mode Toggle** — Meski sudah gelap, opsi tema kustom selalu menarik
- **🔔 WebSocket Real-time** — Notifikasi ketika botol yang Anda lempar ditemukan seseorang
- **📊 Dashboard Admin** — Statistik jumlah pesan, pesan terpopuler (most random-picked)
- **🌍 Multi-language** — i18n support untuk UI, agar bisa dinikmati global
- **📱 PWA Support** — Service worker + manifest.json agar bisa "install" di HP sebagai aplikasi mandiri

---

## 🤝 Contributing

Kontribusi sangat diterima! Karena ini project open-source, silakan:

1. **Fork** repositori ini
2. Buat branch fitur: `git checkout -b feat/nama-fitur-keren`
3. **Commit** perubahan: `git commit -m 'feat: tambah fitur keren'`
4. **Push** ke branch: `git push origin feat/nama-fitur-keren`
5. Buka **Pull Request**

Atau cukup buka [issue](https://github.com/aldobuarlele/message-in-a-bottle/issues) untuk diskusi, ide, atau laporan bug.

### Style Guide

- **Backend**: Gunakan `const` / `let`, arrow functions, error handling dengan try-catch
- **Frontend**: Vanilla JS tanpa framework, komentar bilingual (Indonesia/Inggris)
- **SQL**: Selalu gunakan parameterized queries
- **Commit message**: Gunakan conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<br>

<p align="center">
  <img src="https://img.shields.io/badge/made_with-🫶_dan_☕-white?style=for-the-badge" alt="Made with love and coffee">
</p>

<p align="center">
  Dibuat dengan 🫶 dan secangkir kopi oleh 
  <a href="https://github.com/aldobuarlele">@aldobuarlele</a>
  <br>
  <sub><em>"Kadang, kata-kata paling jujur justru datang dari orang yang tidak kita kenal."</em></sub>
</p>
