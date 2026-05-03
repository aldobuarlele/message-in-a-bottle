
<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=nodedotjs" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express" alt="Express">
  <img src="https://img.shields.io/badge/SQLite3-5.x-003B57?style=for-the-badge&logo=sqlite" alt="SQLite3">
  <img src="https://img.shields.io/badge/Tailwind_CSS-2.2-06B6D4?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge" alt="MIT License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge" alt="PRs Welcome">
</p>

<h1 align="center">📜 Message in a Bottle</h1>
<p align="center"><em>Throw your thoughts into the digital ocean. Retrieve a stranger's secrets from the abyss.</em></p>

<p align="center">
  Sebuah aplikasi web anonim sederhana namun penuh makna — Anda menulis pesan, melemparkannya ke lautan digital, dan suatu saat orang asing akan menemukannya. Begitu pula sebaliknya: Anda bisa mengambil satu botol acak dari lautan dan membaca pesan dari seseorang yang tidak akan pernah Anda kenal.
</p>

---

## ✨ Features

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 📝 | **Tulis Pesan Anonim** | Tulis pesan rahasia tanpa perlu login, registrasi, atau identitas apapun |
| 🎲 | **Ambil Pesan Acak** | Tarik satu botol dari lautan dan baca pesan misterius dari orang asing |
| 🔒 | **Privasi Penuh** | Tidak ada metadata pengirim — IP, waktu, lokasi tidak pernah dicatat |
| ⏳ | **Batas Karakter** | Maksimal 300 karakter — seperti pesan dalam botol sungguhan yang terbatas ruang |
| 🎨 | **UI Responsif** | Antarmuka bersih dengan Tailwind CSS, mobile-friendly |
| 🚀 | **Zero Dependency on Auth** | Tidak perlu database pengguna, tidak perlu session, tidak perlu cookies |
| ⚡ | **Lightweight** | Hanya 2 dependencies: Express + SQLite3. Siap jalan dalam hitungan detik |

---

## 🛠️ Tech Stack

### Frontend
| Teknologi | Kegunaan |
|-----------|----------|
| **HTML5** | Struktur halaman |
| **Tailwind CSS 2.2** | Styling utility-first via CDN |
| **Vanilla JavaScript (ES6+)** | Interaktivitas, fetch API, dan DOM manipulation |

### Backend
| Teknologi | Kegunaan |
|-----------|----------|
| **Node.js 18.x** | Runtime JavaScript server-side |
| **Express 4.18** | HTTP server & routing framework |
| **SQLite3 5.x** | Database file-based, tanpa perlu server DB terpisah |

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

### Usage

1. Buka browser dan akses **http://localhost:3000**
2. **Tulis pesan** di kotak textarea, lalu klik **"Lempar ke Laut"**
3. Klik **"Cari Botol"** untuk mengambil satu pesan acak dari lautan
4. Ulangi terus — setiap kali Anda dapat pesan yang berbeda!

---

## 📂 Folder Structure

```
message-in-a-bottle/
├── 📄 server.js           # Entry point: Express server, routes, SQLite handler
├── 📄 script.js           # Client-side JavaScript: fetch, DOM events, animasi
├── 📄 index.html          # Halaman utama: form, tombol, display area
├── 📄 package.json        # Project manifest & dependencies
├── 📄 package-lock.json   # Lockfile dependency versioning
├── 📄 messages.db         # SQLite database (auto-generated saat pertama jalan)
├── 📄 README.md           # Dokumentasi project (ini dia!)
└── 📄 .gitignore          # Git ignore rules
```

> **Catatan:** File `messages.db` akan tergenerate otomatis saat server pertama kali dijalankan. Tidak perlu dibuat manual.

---

## 📡 API Reference

### `POST /api/messages`

Mengirim pesan baru ke lautan (database).

**Request Body:**
```json
{
  "message": "Isi pesan anonimmu (maks 300 karakter)"
}
```

**Response (201):**
```json
{
  "message": "Pesan berhasil dilempar ke laut!"
}
```

**Error (400):**
```json
{
  "error": "Pesan tidak boleh kosong atau lebih dari 300 karakter"
}
```

---

### `GET /api/messages`

Mengambil satu pesan acak dari lautan.

**Response (200):**
```json
{
  "message": "Halo, siapa pun yang membaca ini... aku merasa tidak sendirian."
}
```

**Response jika kosong:**
```json
{
  "message": "Tidak ada pesan dalam botol!"
}
```

---

## 🔐 Security

- **SQL Injection** ❌ — Semua query menggunakan **parameterized prepared statements** (`?` placeholder), bukan string concatenation
- **XSS (Cross-Site Scripting)** ❌ — Pesan ditampilkan via `textContent`, bukan `innerHTML`, sehingga script injection tidak memungkinkan
- **Input Validation** ✅ — Validasi karakter maksimal 300 dilakukan di **client-side** (HTML `maxlength`) dan **server-side** (JavaScript check)
- **Rate Limiting** ⚠️ — Belum diimplementasikan (lihat bagian rekomendasi di bawah)

---

## 🧪 Testing

Karena arsitektur yang sederhana, pengujian cukup dilakukan secara manual:

```bash
# Test POST endpoint
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"Halo dari laut lepas!"}'

# Test GET endpoint
curl http://localhost:3000/api/messages
```

---

## 🤝 Contributing

Kontribusi sangat diterima! Karena ini project open-source, silakan:

1. **Fork** repositori ini
2. Buat branch fitur baru: `git checkout -b feat/nama-fitur-keren`
3. **Commit** perubahan: `git commit -m 'feat: tambah fitur keren'`
4. **Push** ke branch: `git push origin feat/nama-fitur-keren`
5. Buka **Pull Request**

Atau cukup buka [issue](https://github.com/aldobuarlele/message-in-a-bottle/issues) untuk diskusi, ide, atau laporan bug.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Dibuat dengan 💙 dan secangkir kopi oleh <a href="https://github.com/aldobuarlele">@aldobuarlele</a>
</p>
