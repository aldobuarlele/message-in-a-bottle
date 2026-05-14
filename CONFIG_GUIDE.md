# 📋 Panduan Konfigurasi — Message in a Bottle

> **Step-by-step lengkap** cara kerja konfigurasi, file mana yang perlu diubah, dan urutan yang benar.

---

## 📐 Arsitektur Konfigurasi

Proyek ini menggunakan arsitektur **Single Source of Truth**: SATU file konfigurasi (`config.js`) yang dibaca oleh **Frontend** dan **Backend**.

```
┌─────────────────────────────────────────────────────────────┐
│                     config.js                                │
│  (SATU-SATUNYA sumber kebenaran)                            │
│                                                             │
│  • Deteksi environment (Node.js vs Browser)                 │
│  • Load dotenv (hanya di Node.js)                           │
│  • Fallback default untuk setiap nilai                      │
│  • Export CONFIG object                                     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
     ┌──────────────────┐          ┌──────────────────┐
     │   Backend        │          │   Frontend        │
     │  (server.js)     │          │  (browser)        │
     │                  │          │                   │
     │ require(config)  │          │ <script src="...">│
     │ process.env      │          │ default values    │
     │ dotenv .env.*    │          │ only              │
     └──────────────────┘          └──────────────────┘
```

---

## 📁 File-File yang Terlibat

| # | File | Peran | Wajib Diubah? |
|---|------|-------|---------------|
| 1 | **`config.js`** | Sumber kebenaran — logika deteksi env, safeEnv, semua default | ❌ Jarang (hanya jika menambah/ubah key) |
| 2 | **`.env.development`** | Override nilai untuk mode development | ✅ Sering (setting lokal) |
| 3 | **`.env.production`** | Override nilai untuk mode production | ✅ Sering (setting server) |
| 4 | **`package.json`** | Script npm untuk memilih environment | ❌ Jarang (hanya jika tambah script) |
| 5 | **`server.js`** | Backend — baca `CONFIG.*` | ❌ Hanya jika pakai config baru |
| 6 | **`script.js`** | Frontend — baca `CONFIG.*` (global) | ❌ Hanya jika pakai config baru |

---

## ⚙️ Step-by-Step Penggunaan Konfigurasi

### 🟢 STEP 1: Pahami Urutan Prioritas Nilai

Nilai akhir sebuah konfigurasi ditentukan oleh prioritas berikut (tertinggi ke terendah):

```
1️⃣  process.env[key]          ← dari file .env.* (via dotenv)
2️⃣  default di config.js      ← hardcoded fallback
```

**Contoh:** Jika `MIN_WORD_COUNT` tidak di-set di `.env.development`:
- `config.js` akan pakai default: `parseInt(safeEnv('MIN_WORD_COUNT', '5'), 10) || 5` → **5**

---

### 🟢 STEP 2: Pilih Environment yang Tepat

Ada **2 environment** yang didukung:

| Environment | File .env | Cara Menjalankan | Kegunaan |
|-------------|-----------|-------------------|----------|
| **development** | `.env.development` | `npm run start:dev` atau `NODE_ENV=development node server.js` | Local development, debug logging |
| **production** | `.env.production` | `npm run start:prod` atau `NODE_ENV=production node server.js` | Server live, info logging |

```bash
# Via npm scripts (recommended):
npm run start:dev    # → Development
npm run start:prod   # → Production
npm start            # → Development (default)

# Via langsung:
NODE_ENV=development node server.js
NODE_ENV=production node server.js
```

> **⚠️ Penting:** Jika `NODE_ENV` tidak di-set, defaultnya adalah **development**.

---

### 🟢 STEP 3: Ubah Nilai yang Diinginkan

Buka file `.env.*` yang sesuai dengan environment tujuan, lalu edit nilainya.

#### Tabel Semua Key Konfigurasi

| Key | Default | .env File | Deskripsi |
|-----|---------|-----------|-----------|
| `PORT` | `3000` | `.env.*` | Port server HTTP |
| `LOG_LEVEL` | `info` (dev: `debug`) | `.env.*` | Level logging (trace, debug, info, warn, error, fatal) |
| `MIN_WORD_COUNT` | `5` | `.env.*` | Minimal jumlah kata per pesan |
| `MAX_MESSAGE_LENGTH` | `5000` | `.env.*` | Maksimal karakter per pesan |
| `MAX_MESSAGES` | `10000` | `.env.*` | Maksimal jumlah pesan di database |
| `POST_RATE_LIMIT_WINDOW_MS` | `900000` (15 mnt) | `.env.*` | Window rate limit POST (ms) |
| `POST_RATE_LIMIT_MAX` | `10` | `.env.*` | Maksimal POST per window |
| `GET_RATE_LIMIT_WINDOW_MS` | `60000` (1 mnt) | `.env.*` | Window rate limit GET (ms) |
| `GET_RATE_LIMIT_MAX` | `30` | `.env.*` | Maksimal GET per window |
| `ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS` | `900000` (15 mnt) | `.env.*` | Window rate limit login admin (ms) |
| `ADMIN_LOGIN_RATE_LIMIT_MAX` | `5` | `.env.*` | Maksimal percobaan login per window |
| `REQUEST_TIMEOUT_MS` | `10000` (10 dtk) | `.env.*` | Timeout request (ms) |
| `MAX_PAYLOAD_SIZE` | `100kb` | `.env.*` | Maksimal ukuran body request |
| `ADMIN_USERNAME` | `admin` | `.env.*` | Username admin panel |
| `ADMIN_PASSWORD` | `""` (kosong) | `.env.*` | Password admin panel |
| `JWT_SECRET` | `change-me-in-production` | `.env.*` | Secret key untuk JWT token |
| `JWT_EXPIRES_IN` | `2h` | `.env.*` | Masa berlaku JWT (contoh: `1h`, `7d`, `30m`) |

---

### 🟢 STEP 4: Jalankan Ulang Server

**Setiap perubahan di file `.env.*` membutuhkan restart server** agar terbaca ulang.

```bash
# Jika server berjalan: Ctrl+C untuk stop, lalu:
npm run start:dev

# Atau jika menggunakan PM2:
npm run start:pm2
```

---

### 🟢 STEP 5: Verifikasi Perubahan

Cek apakah perubahan sudah aktif:

```bash
# Cek health endpoint (lihat environment & status)
curl http://localhost:3000/api/health

# Cek min word count dengan kirim pesan pendek
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"Pesan pendek"}'
```

---

## 🎯 Contoh Kasus Nyata

### Kasus 1: Ganti Password Admin di Development

**File yang diedit:** `.env.development`

```diff
# Before
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ganti-dengan-password-anda

# After
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password-baru-anda
```

**Langkah:**
1. Edit `.env.development` baris `ADMIN_PASSWORD`
2. Simpan file
3. Restart server: `npm run start:dev`
4. Login ke `/admin.html` dengan password baru

---

### Kasus 2: Ubah Minimal Kata dari 30 ke 10 (Development)

**File yang diedit:** `.env.development`

```diff
- MIN_WORD_COUNT=30
+ MIN_WORD_COUNT=10
```

**Langkah:**
1. Edit `.env.development`
2. Simpan file
3. Restart server
4. Coba kirim pesan dengan 10+ kata — seharusnya berhasil

---

### Kasus 3: Set Production ke Port 8080

**File yang diedit:** `.env.production`

```diff
- PORT=3000
+ PORT=8080
```

**Langkah:**
1. Edit `.env.production`
2. Simpan file
3. Restart server: `npm run start:prod`
4. Buka `http://localhost:8080`

---

### Kasus 4: Generate JWT Secret untuk Production

**File yang diedit:** `.env.production`

```bash
# Generate random 64-byte hex string
openssl rand -hex 64
# Contoh output: a1b2c3d4e5f6... (128 karakter)
```

```diff
- JWT_SECRET=ganti-ini-dengan-random-string-panjang
+ JWT_SECRET=a1b2c3d4e5f6... (hasil dari openssl)
```

**Langkah:**
1. Jalankan `openssl rand -hex 64` di terminal
2. Copy output
3. Edit `.env.production`, paste sebagai `JWT_SECRET`
4. Simpan file
5. Restart server

---

### Kasus 5: Perketat Rate Limiting Admin Login

**File yang diedit:** `.env.production`

```diff
- ADMIN_LOGIN_RATE_LIMIT_MAX=5
+ ADMIN_LOGIN_RATE_LIMIT_MAX=3
- ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS=900000
+ ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS=1800000  # 30 menit
```

**Langkah:**
1. Edit `.env.production`
2. Simpan file
3. Restart server: `npm run start:prod`

---

## 🔄 Flow Lengkap (Dari Awal Sampai Akhir)

Berikut urutan persis bagaimana konfigurasi diproses saat server dijalankan:

```
1. USER menjalankan:
   $ npm run start:prod
   (atau: NODE_ENV=production node server.js)

2. Node.js mulai mengeksekusi server.js

3. Baris 7 server.js:
   const CONFIG = require('./config.js');

4. config.js mendeteksi bahwa ini Node.js:
   const isNode = typeof process !== 'undefined' 
               && process.versions 
               && process.versions.node;

5. Karena isNode === true, config.js memuat dotenv:
   dotenv.config({ path: path.resolve(__dirname, '.env.production') });
   
   (Pemilihan file .env berdasarkan NODE_ENV)

6. dotenv membaca .env.production → mengisi process.env
   process.env.PORT = '3000'
   process.env.MIN_WORD_COUNT = '70'
   process.env.ADMIN_PASSWORD = 'ganti-dengan-password-anda'
   ...dst

7. Fungsi safeEnv() mengambil nilai dari process.env:
   PORT = safeEnv('PORT', '3000')        → '3000'
   MIN_WORD_COUNT = safeEnv('MIN_WORD_COUNT', '5') → '70'
   
   (Kalo tidak ada di .env, pakai default)

8. CONFIG object selesai dibuat dan di-export

9. server.js menggunakan CONFIG.*:
   - app.listen(CONFIG.PORT, ...)
   - logger level = CONFIG.LOG_LEVEL
   - Validasi: wordCount < CONFIG.MIN_WORD_COUNT
   - Rate limit: CONFIG.POST_RATE_LIMIT_MAX
   - JWT: CONFIG.JWT_SECRET

10. DI BROWSER (Frontend):
    index.html baris 309:
    <script src="config.js"></script>
    
    config.js dieksekusi di browser:
    - isNode = false (karena bukan Node.js)
    - dotenv tidak di-load
    - safeEnv() selalu pakai default
    
    CONFIG.MIN_WORD_COUNT = 5 (default, bukan 70!)

11. index.html baris 310:
    <script src="script.js"></script>
    
    script.js membaca:
    const MIN_WORDS = CONFIG.MIN_WORD_COUNT;  // = 5

12. Frontend menggunakan MIN_WORDS untuk validasi word counter
```

> **🔑 Insight Penting:** Frontend **tidak bisa membaca** file `.env.*` — jadi nilai di browser selalu **default** dari `config.js`. Jika ingin nilai yang sama antara frontend dan backend, nilai default di `config.js` harus diselaraskan dengan isi `.env.*`.

---

## 🧪 Testing Perubahan Konfigurasi

```bash
# 1. Cek health endpoint
curl http://localhost:3000/api/health

# 2. Cek min word count (kirim pesan pendek)
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"Pesan yang terlalu pendek"}'

# 3. Cek rate limit (kirim berkali-kali)
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/messages \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"Test nomor $i untuk mengecek rate limit\"}"
done

# 4. Cek admin login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ganti-dengan-password-anda"}'

# 5. Cek payload terlalu besar
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"'$(python3 -c "print('A'*6000)")'"}'
```

---

## 🚨 Troubleshooting

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Port sudah dipakai | Aplikasi lain di port sama | Ubah `PORT` di `.env.*` |
| "Gagal terhubung" | Server tidak jalan | Jalankan `npm run start:dev` |
| Login admin gagal | Password salah di `.env.*` | Cek `ADMIN_PASSWORD` di file `.env` yang aktif |
| JWT error "invalid signature" | Secret berbeda antara session | Restart server setelah ubah `JWT_SECRET` |
| Word counter di frontend beda dengan backend | Frontend pakai default, backend pakai `.env` | Sesuaikan default di `config.js` dengan `.env.*` |
| Perubahan tidak berdampak | Belum restart server | **Selalu restart** setelah edit `.env.*` |

---

## 📝 Checklist Cepat

Ketika hendak mengubah konfigurasi:

- [ ] Tentukan environment mana yang akan diubah (development/production)
- [ ] Buka file `.env.development` atau `.env.production` yang sesuai
- [ ] Edit nilai yang diinginkan
- [ ] **Simpan** file (Ctrl+S)
- [ ] **Restart** server
- [ ] Verifikasi dengan curl atau browser
