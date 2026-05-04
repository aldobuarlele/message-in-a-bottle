const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const CONFIG = require('./config.js');
const app = express();
const port = 3000;

// ============================
// 🛡️ 1. SECURITY HEADERS (Helmet)
// ============================
// Menggantikan 15+ header keamanan sekaligus.
// CSP dikustom agar CDN Tailwind, Google Fonts, dan placeholder tetap bisa di-load.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://cdn.tailwindcss.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",        // Diperlukan Tailwind + inline style di index.html
        "https://fonts.googleapis.com",
        "https://cdn.tailwindcss.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      connectSrc: ["'self'"],
      imgSrc: [
        "'self'",
        "data:",
        "https://via.placeholder.com",
      ],
      // Anti-clickjacking: tidak boleh di-frame oleh situs lain
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  // Nonaktifkan karena kita pakai CDN eksternal
  crossOriginEmbedderPolicy: false,
}));

// ============================
// 🛡️ 2. BODY SIZE LIMIT & JSON PARSER
// ============================
// Mencegah oversized payload (≥100KB langsung ditolak 413)
app.use(express.json({ limit: CONFIG.MAX_PAYLOAD_SIZE }));

// Serve static files
app.use(express.static(__dirname));

// ============================
// 🛡️ 3. REQUEST TIMEOUT
// ============================
// Mencegah request lambat mengikat koneksi terlalu lama
app.use((req, res, next) => {
  req.setTimeout(CONFIG.REQUEST_TIMEOUT_MS, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// ============================
// 🗄️ 4. DATABASE SETUP
// ============================
const db = new sqlite3.Database('./messages.db');

db.serialize(function () {
  // Buat tabel jika belum ada
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL
    );
  `);

  // Aktifkan WAL mode untuk performa concurrent read/write lebih baik
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA synchronous=NORMAL;');
});

// ============================
// 📦 5. RATE LIMITING
// ============================
// Limiter KETAT untuk POST — cegah spam database
const postLimiter = rateLimit({
  windowMs: CONFIG.POST_RATE_LIMIT_WINDOW_MS,
  max: CONFIG.POST_RATE_LIMIT_MAX,
  message: { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter MODERAT untuk GET — cegah scraping
const getLimiter = rateLimit({
  windowMs: CONFIG.GET_RATE_LIMIT_WINDOW_MS,
  max: CONFIG.GET_RATE_LIMIT_MAX,
  message: { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================
// 🛠️ 6. HELPER FUNCTIONS
// ============================
function countWords(text) {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

// Validasi ketat: pastikan input benar-benar string yang tidak kosong
function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Hapus pesan tertua jika database sudah melebihi batas maksimum
function enforceStorageLimit(callback) {
  db.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
    if (err) {
      console.error('Gagal cek count database:', err);
      return callback(err);
    }
    if (row.count > CONFIG.MAX_MESSAGES) {
      // Hapus kelebihan (pesan tertua)
      const excess = row.count - CONFIG.MAX_MESSAGES;
      db.run(
        'DELETE FROM messages WHERE id IN (SELECT id FROM messages ORDER BY id ASC LIMIT ?)',
        [excess],
        callback
      );
    } else {
      callback(null);
    }
  });
}

// ============================
// 📩 7. POST /api/messages
// ============================
app.post('/api/messages', postLimiter, (req, res) => {
  const message = req.body.message;

  // Validasi 1: Pastikan message adalah string dan tidak kosong
  if (!isValidString(message)) {
    res.status(400).json({ error: 'Pesan tidak boleh kosong' });
    return;
  }

  // Validasi 2: Cek type (waterfall setelah isValidString lolos, kita tahu ini string)
  if (typeof message !== 'string') {
    res.status(400).json({ error: 'Pesan harus berupa teks' });
    return;
  }

  // Validasi 3: Cek panjang maksimum karakter
  if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
    res.status(400).json({
      error: `Pesan terlalu panjang. Maksimal ${CONFIG.MAX_MESSAGE_LENGTH} karakter.`
    });
    return;
  }

  // Validasi 4: Cek minimum word count
  const wordCount = countWords(message);
  if (wordCount < CONFIG.MIN_WORD_COUNT) {
    res.status(400).json({
      error: `Pesan harus minimal ${CONFIG.MIN_WORD_COUNT} kata. Saat ini: ${wordCount} kata.`
    });
    return;
  }

  // Validasi 5: Cek storage limit, hapus yang tertua jika perlu
  enforceStorageLimit((err) => {
    if (err) {
      console.error('Gagal enforce storage limit:', err);
      // Tetap lanjutkan — lebih baik menyimpan daripada error total
    }

    // Simpan pesan
    db.run(
      'INSERT INTO messages (message) VALUES (?);',
      [message],
      function (err) {
        if (err) {
          console.error(err);
          res.status(500).json({ error: 'Gagal menyimpan pesan' });
        } else {
          res.json({ message: 'Pesan berhasil dilempar ke laut!' });
        }
      }
    );
  });
});

// ============================
// 📥 8. GET /api/messages
// ============================
app.get('/api/messages', getLimiter, (req, res) => {
  db.all(
    'SELECT message FROM messages ORDER BY RANDOM() LIMIT 1;',
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil pesan' });
      } else if (rows.length === 0) {
        res.json({ message: 'Tidak ada pesan dalam botol!' });
      } else {
        res.json({ message: rows[0].message });
      }
    }
  );
});

// ============================
// ❗ 9. GLOBAL ERROR HANDLER
// ============================
// Menangkap error dari manapun (misal JSON parse failure, timeout, dll)
app.use((err, req, res, next) => {
  // Error dari express.json() — invalid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Format JSON tidak valid' });
  }

  // Error dari express.json({ limit }) — payload terlalu besar
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload terlalu besar' });
  }

  // Error dari rate limiter
  if (err.statusCode === 429) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
  }

  // Fallback untuk error tak terduga
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Terjadi kesalahan internal server' });
});

// ============================
// 🚀 10. START SERVER
// ============================
app.listen(port, () => {
  console.log(`Server berjalan pada port ${port}`);
});
