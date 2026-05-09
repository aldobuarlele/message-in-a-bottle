const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// Serve static files
app.use(express.static(__dirname));

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

// ============================
// 🛠️ 7. HELPER FUNCTIONS
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
// 💓 8. HEALTH CHECK ENDPOINT
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
// 📩 9. POST /api/messages
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
      'INSERT INTO messages (message) VALUES (?);',
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
// 📥 10. GET /api/messages
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

// ============================
// ❗ 11. GLOBAL ERROR HANDLER
// ============================
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
// 🚫 12. 404 HANDLER (Custom Page)
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
// 🚀 13. START SERVER
// ============================
const server = app.listen(port, () => {
  logger.info(`🚀 Server berjalan pada port ${port} (${CONFIG.NODE_ENV})`);
  logger.info(`   🌐 http://localhost:${port}`);
  logger.info(`   💓 Health check: http://localhost:${port}/api/health`);
});

// ============================
// 🔄 14. GRACEFUL SHUTDOWN
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
