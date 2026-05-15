const express = require('express');
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
  transport: CONFIG.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
});

// ============================
// 🗄️ DATABASE SELECTOR
// ============================
// Production (Vercel) → PostgreSQL via db.js
// Development (lokal) → SQLite
// ============================
const USE_POSTGRES = !!(process.env.DATABASE_URL);

let db = null; // Untuk SQLite
let pgDb = null; // Untuk PostgreSQL

if (USE_POSTGRES) {
  pgDb = require('./db.js');
  logger.info('[DB] Using PostgreSQL');
} else {
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database('./messages.db');

  db.serialize(function () {
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL
      );
    `);

    db.all("PRAGMA table_info(messages);", (err, columns) => {
      if (err) {
        logger.error(err, 'Gagal membaca schema tabel');
        return;
      }

      const hasCreatedAt = columns.some(col => col.name === 'created_at');
      if (!hasCreatedAt) {
        db.run("ALTER TABLE messages ADD COLUMN created_at TEXT;", (alterErr) => {
          if (alterErr) {
            logger.error(alterErr, 'Gagal migrasi created_at');
          } else {
            logger.info('Migrasi: kolom created_at berhasil ditambahkan');
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
}

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
// 📦 5. RATE LIMITING
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
// 🛡️ 6. REQUIRE ADMIN MIDDLEWARE (JWT)
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

// ============================
// 💓 8. HEALTH CHECK ENDPOINT
// ============================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: CONFIG.NODE_ENV,
    database: USE_POSTGRES ? 'postgresql' : 'sqlite',
  });
});

// ============================
// 📩 9. POST /api/messages
// ============================
app.post('/api/messages', postLimiter, async (req, res) => {
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

  try {
    if (USE_POSTGRES) {
      // PostgreSQL path
      const total = await pgDb.countMessages();
      if (total > CONFIG.MAX_MESSAGES) {
        const excess = total - CONFIG.MAX_MESSAGES;
        await pgDb.deleteOldestMessages(excess);
        logger.info(`Storage limit enforced: removed ${excess} oldest message(s)`);
      }

      const result = await pgDb.insertMessage(message);
      logger.info({ id: result.id, wordCount }, 'Pesan baru berhasil disimpan');
      res.json({ message: 'Pesan berhasil dilempar ke laut!' });
    } else {
      // SQLite path
      db.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
        if (err) {
          logger.error(err, 'Gagal cek count database');
        } else if (row.count > CONFIG.MAX_MESSAGES) {
          const excess = row.count - CONFIG.MAX_MESSAGES;
          db.run(
            'DELETE FROM messages WHERE id IN (SELECT id FROM messages ORDER BY id ASC LIMIT ?)',
            [excess]
          );
          logger.info(`Storage limit enforced: removed ${excess} oldest message(s)`);
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
    }
  } catch (err) {
    logger.error(err, 'Gagal menyimpan pesan');
    res.status(500).json({ error: 'Gagal menyimpan pesan' });
  }
});

// ============================
// 📥 10. GET /api/messages
// ============================
app.get('/api/messages', getLimiter, async (req, res) => {
  try {
    if (USE_POSTGRES) {
      const rows = await pgDb.getRandomMessage();
      if (rows.length === 0) {
        res.json({ message: 'Tidak ada pesan dalam botol!' });
      } else {
        res.json({ message: rows[0].message });
      }
    } else {
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
    }
  } catch (err) {
    logger.error(err, 'Gagal mengambil pesan');
    res.status(500).json({ error: 'Gagal mengambil pesan' });
  }
});

// ====================================================================
// 🔐 ADMIN ENDPOINTS (Protected by JWT)
// ====================================================================

// ============================
// 🔑 11. POST /api/admin/login
// ============================
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password diperlukan' });
  }

  if (username !== CONFIG.ADMIN_USERNAME || password !== CONFIG.ADMIN_PASSWORD) {
    logger.warn({ ip: req.ip }, 'Percobaan login admin gagal');
    return res.status(401).json({ error: 'Username atau password salah' });
  }

  const token = jwt.sign(
    {
      username: CONFIG.ADMIN_USERNAME,
      role: 'admin',
    },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRES_IN }
  );

  logger.info({ ip: req.ip }, 'Admin login berhasil');

  const expiresInSeconds = parseExpiresIn(CONFIG.JWT_EXPIRES_IN);

  res.json({ token, expiresIn: expiresInSeconds });
});

function parseExpiresIn(str) {
  if (typeof str === 'number') return str;
  const match = str.match(/^(\d+)(h|m|s|d)$/);
  if (!match) return 7200;
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
// 👤 12. GET /api/admin/me
// ============================
app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({
    username: req.admin.username,
    role: req.admin.role,
  });
});

// ============================
// 📋 13. GET /api/admin/messages
// ============================
app.get('/api/admin/messages', requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const search = req.query.search ? req.query.search.trim() : '';

  try {
    if (USE_POSTGRES) {
      const result = await pgDb.getMessagesAdmin({ page, limit, search });
      // Add word_count
      result.messages = result.messages.map(row => ({
        id: row.id,
        message: row.message,
        word_count: countWords(row.message),
        created_at: row.created_at || 'Unknown',
      }));
      res.json(result);
    } else {
      const offset = (page - 1) * limit;

      let countQuery = 'SELECT COUNT(*) as total FROM messages';
      let dataQuery = 'SELECT id, message, created_at FROM messages';
      const searchParams = [];

      if (search) {
        const whereClause = ' WHERE message LIKE ?';
        const searchParam = `%${search}%`;
        countQuery += whereClause;
        dataQuery += whereClause;
        searchParams.push(searchParam);
      }

      dataQuery += ' ORDER BY id DESC LIMIT ? OFFSET ?';

      db.get(countQuery, searchParams, (err, countRow) => {
        if (err) {
          logger.error(err, 'Gagal menghitung total messages (admin)');
          return res.status(500).json({ error: 'Gagal mengambil data pesan' });
        }

        const total = countRow ? countRow.total : 0;
        const totalPages = Math.ceil(total / limit);

        const dataParams = [...searchParams, limit, offset];
        db.all(dataQuery, dataParams, (err, rows) => {
          if (err) {
            logger.error(err, 'Gagal mengambil messages (admin)');
            return res.status(500).json({ error: 'Gagal mengambil data pesan' });
          }

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
    }
  } catch (err) {
    logger.error(err, 'Gagal mengambil data pesan (admin)');
    res.status(500).json({ error: 'Gagal mengambil data pesan' });
  }
});

// ============================
// 🗑️ 14. DELETE /api/admin/messages/:id
// ============================
app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 1) {
    return res.status(400).json({ error: 'ID pesan tidak valid' });
  }

  try {
    if (USE_POSTGRES) {
      const exists = await pgDb.getMessageById(id);
      if (!exists) {
        return res.status(404).json({ error: 'Pesan tidak ditemukan' });
      }

      await pgDb.deleteMessageById(id);
      logger.info({ id, admin: req.admin.username }, 'Pesan berhasil dihapus oleh admin');
      res.json({ message: 'Pesan berhasil dihapus', id });
    } else {
      db.get('SELECT id FROM messages WHERE id = ?', [id], (err, row) => {
        if (err) {
          logger.error(err, 'Gagal mencari pesan untuk dihapus');
          return res.status(500).json({ error: 'Gagal menghapus pesan' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Pesan tidak ditemukan' });
        }

        db.run('DELETE FROM messages WHERE id = ?', [id], function (err) {
          if (err) {
            logger.error(err, 'Gagal menghapus pesan');
            return res.status(500).json({ error: 'Gagal menghapus pesan' });
          }

          logger.info({ id, admin: req.admin.username }, 'Pesan berhasil dihapus oleh admin');
          res.json({ message: 'Pesan berhasil dihapus', id });
        });
      });
    }
  } catch (err) {
    logger.error(err, 'Gagal menghapus pesan');
    res.status(500).json({ error: 'Gagal menghapus pesan' });
  }
});

// ====================================================================
// ❗ 15. GLOBAL ERROR HANDLER
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
// 🚫 16. 404 HANDLER (Custom Page)
// ============================
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint tidak ditemukan' });
  }

  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ============================
// 🚀 17. START SERVER
// ============================
async function startServer() {
  if (USE_POSTGRES) {
    try {
      await pgDb.initDatabase();
      logger.info('PostgreSQL database initialized');
    } catch (err) {
      logger.error(err, 'Gagal inisialisasi PostgreSQL');
      process.exit(1);
    }
  }

  const server = app.listen(port, () => {
    logger.info(`🚀 Server berjalan pada port ${port} (${CONFIG.NODE_ENV})`);
    logger.info(`   🌐 http://localhost:${port}`);
    logger.info(`   💓 Health check: http://localhost:${port}/api/health`);
    logger.info(`   🔐 Admin panel: http://localhost:${port}/admin.html`);
    logger.info(`   🗄️  Database: ${USE_POSTGRES ? 'PostgreSQL' : 'SQLite'}`);
  });

  // ============================
  // 🔄 18. GRACEFUL SHUTDOWN
  // ============================
  function shutdown(signal) {
    logger.info(`${signal} received — shutting down gracefully...`);

    server.close(() => {
      if (!USE_POSTGRES && db) {
        db.close((err) => {
          if (err) {
            logger.error(err, 'Error closing database');
            process.exit(1);
          }
          logger.info('Database connection closed. Goodbye! 👋');
          process.exit(0);
        });
      } else {
        logger.info('Goodbye! 👋');
        process.exit(0);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 5000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
