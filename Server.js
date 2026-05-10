const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const path = require('path');
const CONFIG = require('./config.js');
const app = express();
const port = CONFIG.PORT;

// ============================
// 📝 STRUCTURED LOGGING (Pino)
// ============================
const pino = require('pino');
const logger = pino({
  level: CONFIG.LOG_LEVEL,
  // Di development: format human-readable via pino-pretty
  // Di production: JSON streaming (otomatis terstruktur, cocok untuk log aggregator)
  transport: CONFIG.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
});

// ============================
// 🛡️ 1. SECURITY HEADERS (Helmet)
// ============================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
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
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ============================
// 🛡️ 2. BODY SIZE LIMIT & JSON PARSER
// ============================
app.use(express.json({ limit: CONFIG.MAX_PAYLOAD_SIZE }));

// ============================
// 📊 3. REQUEST LOGGING MIDDLEWARE
// ============================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
    });
  });
  next();
});

// Serve static files (root + public directory)
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// ============================
// 🛡️ 4. REQUEST TIMEOUT
// ============================
app.use((req, res, next) => {
  req.setTimeout(CONFIG.REQUEST_TIMEOUT_MS, () => {
    logger.warn({ path: req.path }, 'Request timeout');
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// ============================
// 🗄️ 5. DATABASE SETUP
// ============================
const db = new sqlite3.Database('./messages.db');

db.serialize(function () {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL
    );
  `);

  // === Migrasi: tambah kolom created_at jika belum ada ===
  // SQLite tidak memiliki IF NOT EXISTS untuk ALTER TABLE,
  // jadi kita cek pragma table_info terlebih dahulu.
  db.all("PRAGMA table_info(messages);", (err, columns) => {
    if (err) {
      logger.error(err, 'Gagal membaca schema tabel');
      return;
    }

    const hasCreatedAt = columns.some(col => col.name === 'created_at');
    if (!hasCreatedAt) {
      // SQLite versi lama tidak mendukung DEFAULT dengan fungsi datetime('now')
      // pada ALTER TABLE. Jadi kita tambah kolom dulu tanpa default,
      // lalu isi manual dengan UPDATE.
      db.run("ALTER TABLE messages ADD COLUMN created_at TEXT;", (alterErr) => {
        if (alterErr) {
          logger.error(alterErr, 'Gagal migrasi created_at');
        } else {
          logger.info('Migrasi: kolom created_at berhasil ditambahkan');

          // Set created_at untuk baris yang sudah ada ke timestamp sekarang
          db.run("UPDATE messages SET created_at = datetime('now') WHERE created_at IS NULL;", (updateErr) => {
            if (updateErr) {
              logger.error(updateErr, 'Gagal mengisi created_at untuk data lama');
            } else {
              logger.info('Migrasi: created_at diisi untuk semua data lama');
            }
          });
        }
      });
    } else {
      logger.info('Kolom created_at sudah ada — tidak perlu migrasi');
    }
  });

  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA synchronous=NORMAL;');

  logger.info('Database initialized (SQLite)');
});

// ============================
// 📦 6. RATE LIMITING
// ============================
const postLimiter = rateLimit({
  windowMs: CONFIG.POST_RATE_LIMIT_WINDOW_MS,
  max: CONFIG.POST_RATE_LIMIT_MAX,
  message: { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const getLimiter = rateLimit({
  windowMs: CONFIG.GET_RATE_LIMIT_WINDOW_MS,
  max: CONFIG.GET_RATE_LIMIT_MAX,
  message: { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLoginLimiter = rateLimit({
  windowMs: CONFIG.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS,
  max: CONFIG.ADMIN_LOGIN_RATE_LIMIT_MAX,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================
// 🛡️ 7. REQUIRE ADMIN MIDDLEWARE (JWT)
// ============================
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — no token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================
// 🛠️ 8. HELPER FUNCTIONS
// ============================
function countWords(text) {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

function isValidString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function enforceStorageLimit(callback) {
  db.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
    if (err) {
      logger.error(err, 'Gagal cek count database');
      return callback(err);
    }
    if (row.count > CONFIG.MAX_MESSAGES) {
      const excess = row.count - CONFIG.MAX_MESSAGES;
      db.run(
        'DELETE FROM messages WHERE id IN (SELECT id FROM messages ORDER BY id ASC LIMIT ?)',
        [excess],
        callback
      );
      logger.info(`Storage limit enforced: removed ${excess} oldest message(s)`);
    } else {
      callback(null);
    }
  });
}

// ============================
// 💓 9. HEALTH CHECK ENDPOINT
// ============================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: CONFIG.NODE_ENV,
  });
});

// ============================
// 📩 10. POST /api/messages
// ============================
app.post('/api/messages', postLimiter, (req, res) => {
  const message = req.body.message;

  if (!isValidString(message)) {
    res.status(400).json({ error: 'Pesan tidak boleh kosong' });
    return;
  }

  if (typeof message !== 'string') {
    res.status(400).json({ error: 'Pesan harus berupa teks' });
    return;
  }

  if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
    res.status(400).json({
      error: `Pesan terlalu panjang. Maksimal ${CONFIG.MAX_MESSAGE_LENGTH} karakter.`
    });
    return;
  }

  const wordCount = countWords(message);
  if (wordCount < CONFIG.MIN_WORD_COUNT) {
    res.status(400).json({
      error: `Pesan harus minimal ${CONFIG.MIN_WORD_COUNT} kata. Saat ini: ${wordCount} kata.`
    });
    return;
  }

  enforceStorageLimit((err) => {
    if (err) {
      logger.error(err, 'Gagal enforce storage limit');
    }

    db.run(
      'INSERT INTO messages (message, created_at) VALUES (?, datetime(\'now\'));',
      [message],
      function (err) {
        if (err) {
          logger.error(err, 'Gagal menyimpan pesan');
          res.status(500).json({ error: 'Gagal menyimpan pesan' });
        } else {
          logger.info({ id: this.lastID, wordCount }, 'Pesan baru berhasil disimpan');
          res.json({ message: 'Pesan berhasil dilempar ke laut!' });
        }
      }
    );
  });
});

// ============================
// 📥 11. GET /api/messages
// ============================
app.get('/api/messages', getLimiter, (req, res) => {
  db.all(
    'SELECT message FROM messages ORDER BY RANDOM() LIMIT 1;',
    [],
    (err, rows) => {
      if (err) {
        logger.error(err, 'Gagal mengambil pesan');
        res.status(500).json({ error: 'Gagal mengambil pesan' });
      } else if (rows.length === 0) {
        res.json({ message: 'Tidak ada pesan dalam botol!' });
      } else {
        res.json({ message: rows[0].message });
      }
    }
  );
});

// ====================================================================
// 🔐 ADMIN ENDPOINTS (Protected by JWT)
// ====================================================================

// ============================
// 🔑 12. POST /api/admin/login
// ============================
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password diperlukan' });
  }

  // Plain string comparison (sesuai permintaan: no bcrypt)
  if (username !== CONFIG.ADMIN_USERNAME || password !== CONFIG.ADMIN_PASSWORD) {
    logger.warn({ ip: req.ip }, 'Percobaan login admin gagal');
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  // Generate JWT
  const token = jwt.sign(
    {
      username: CONFIG.ADMIN_USERNAME,
      role: 'admin',
    },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRES_IN }
  );

  logger.info({ ip: req.ip }, 'Admin login berhasil');

  // Parse expiresIn ke detik untuk frontend
  const expiresInSeconds = parseExpiresIn(CONFIG.JWT_EXPIRES_IN);

  res.json({ token, expiresIn: expiresInSeconds });
});

// Helper: parse JWT expiresIn string ke detik
function parseExpiresIn(str) {
  if (typeof str === 'number') return str;
  const match = str.match(/^(\d+)(h|m|s|d)$/);
  if (!match) return 7200; // default 2 jam
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val;
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 86400;
    default: return 7200;
  }
}

// ============================
// 👤 13. GET /api/admin/me
// ============================
app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({
    username: req.admin.username,
    role: req.admin.role,
  });
});

// ============================
// 📋 14. GET /api/admin/messages
// ============================
app.get('/api/admin/messages', requireAdmin, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const search = req.query.search ? req.query.search.trim() : '';
  const offset = (page - 1) * limit;

  // Hitung total message (dengan filter search jika ada)
  let countQuery = 'SELECT COUNT(*) as total FROM messages';
  let dataQuery = 'SELECT id, message, created_at FROM messages';
  const params = [];
  const searchParams = [];

  if (search) {
    const whereClause = ' WHERE message LIKE ?';
    const searchParam = `%${search}%`;
    countQuery += whereClause;
    dataQuery += whereClause;
    searchParams.push(searchParam);
  }

  dataQuery += ' ORDER BY id DESC LIMIT ? OFFSET ?';

  // Ambil total count
  db.get(countQuery, searchParams, (err, countRow) => {
    if (err) {
      logger.error(err, 'Gagal menghitung total messages (admin)');
      return res.status(500).json({ error: 'Gagal mengambil data pesan' });
    }

    const total = countRow ? countRow.total : 0;
    const totalPages = Math.ceil(total / limit);

    // Ambil data halaman ini
    const dataParams = [...searchParams, limit, offset];
    db.all(dataQuery, dataParams, (err, rows) => {
      if (err) {
        logger.error(err, 'Gagal mengambil messages (admin)');
        return res.status(500).json({ error: 'Gagal mengambil data pesan' });
      }

      // Tambah word_count ke setiap row
      const messages = (rows || []).map(row => ({
        id: row.id,
        message: row.message,
        word_count: countWords(row.message),
        created_at: row.created_at || 'Unknown',
      }));

      res.json({
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    });
  });
});

// ============================
// 🗑️ 15. DELETE /api/admin/messages/:id
// ============================
app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'ID pesan tidak valid' });
  }

  // Cek apakah pesan ada
  db.get('SELECT id FROM messages WHERE id = ?', [id], (err, row) => {
    if (err) {
      logger.error(err, 'Gagal mencari pesan untuk dihapus');
      return res.status(500).json({ error: 'Gagal menghapus pesan' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Pesan tidak ditemukan' });
    }

    // Hapus pesan
    db.run('DELETE FROM messages WHERE id = ?', [id], function (err) {
      if (err) {
        logger.error(err, 'Gagal menghapus pesan');
        return res.status(500).json({ error: 'Gagal menghapus pesan' });
      }

      logger.info({ id, admin: req.admin.username }, 'Pesan berhasil dihapus oleh admin');
      res.json({ message: 'Pesan berhasil dihapus', id });
    });
  });
});

// ====================================================================
// ❗ 16. GLOBAL ERROR HANDLER
// ====================================================================
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Format JSON tidak valid' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload terlalu besar' });
  }

  if (err.statusCode === 429) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' });
  }

  logger.error(err, 'Unexpected error');
  res.status(500).json({ error: 'Terjadi kesalahan internal server' });
});

// ============================
// 🚫 17. 404 HANDLER (Custom Page)
// ============================
app.use((req, res) => {
  // API routes — return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint tidak ditemukan' });
  }

  // Static pages — serve custom 404
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ============================
// 🚀 18. START SERVER
// ============================
const server = app.listen(port, () => {
  logger.info(`🚀 Server berjalan pada port ${port} (${CONFIG.NODE_ENV})`);
  logger.info(`   🌐 http://localhost:${port}`);
  logger.info(`   💓 Health check: http://localhost:${port}/api/health`);
  logger.info(`   🔐 Admin panel: http://localhost:${port}/admin.html`);
});

// ============================
// 🔄 19. GRACEFUL SHUTDOWN
// ============================
function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully...`);

  server.close(() => {
    db.close((err) => {
      if (err) {
        logger.error(err, 'Error closing database');
        process.exit(1);
      }
      logger.info('Database connection closed. Goodbye! 👋');
      process.exit(0);
    });
  });

  // Force shutdown after 5 seconds if graceful fails
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
