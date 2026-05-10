// === SATU-SATUNYA sumber kebenaran untuk seluruh konfigurasi aplikasi ===
// Baik Frontend (via <script src="config.js">) dan Backend (via require)
// membaca dari file yang sama.
//
// Di Backend: nilai dibaca dari process.env (via dotenv).
// Di Frontend: nilai menggunakan fallback default (karena process.env tidak tersedia).
//
// Cara pakai:
//   Dev:  NODE_ENV=development node server.js
//         (otomatis load .env.development)
//   Prod: NODE_ENV=production node server.js
//         (otomatis load .env.production)

// Deteksi environment: Frontend (browser) vs Backend (Node.js)
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// === Load dotenv hanya di Node.js ===
if (isNode) {
  const dotenv = require('dotenv');
  const path = require('path');

  // Pilih file .env berdasarkan NODE_ENV
  const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

  dotenv.config({ path: path.resolve(__dirname, envFile) });
}

// Helper aman: ambil nilai dari process.env jika tersedia, fallback ke default
function safeEnv(key, defaultValue) {
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  return defaultValue;
}

const CONFIG = {
  // --- Environment ---
  NODE_ENV: isNode ? (process.env.NODE_ENV || 'development') : 'development',
  PORT: isNode ? (parseInt(safeEnv('PORT', '3000')) || 3000) : 3000,
  LOG_LEVEL: isNode ? (safeEnv('LOG_LEVEL', 'info')) : 'info',

  // --- Konten / Pesan ---
  MIN_WORD_COUNT: parseInt(safeEnv('MIN_WORD_COUNT', '5'), 10) || 5,
  MAX_MESSAGE_LENGTH: parseInt(safeEnv('MAX_MESSAGE_LENGTH', '5000'), 10) || 5000,
  MAX_MESSAGES: parseInt(safeEnv('MAX_MESSAGES', '10000'), 10) || 10000,

  // --- Rate Limiting ---
  POST_RATE_LIMIT_WINDOW_MS: parseInt(safeEnv('POST_RATE_LIMIT_WINDOW_MS', '900000'), 10) || 900000,   // 15 menit
  POST_RATE_LIMIT_MAX: parseInt(safeEnv('POST_RATE_LIMIT_MAX', '10'), 10) || 10,                    // maks 10 POST per window
  GET_RATE_LIMIT_WINDOW_MS: parseInt(safeEnv('GET_RATE_LIMIT_WINDOW_MS', '60000'), 10) || 60000,      // 1 menit
  GET_RATE_LIMIT_MAX: parseInt(safeEnv('GET_RATE_LIMIT_MAX', '30'), 10) || 30,                      // maks 30 GET per window

  // --- Request Timeout ---
  REQUEST_TIMEOUT_MS: parseInt(safeEnv('REQUEST_TIMEOUT_MS', '10000'), 10) || 10000,                   // 10 detik

  // --- Payload ---
  MAX_PAYLOAD_SIZE: safeEnv('MAX_PAYLOAD_SIZE', '100kb'),
};

// Ekspor untuk Node.js (Server.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
