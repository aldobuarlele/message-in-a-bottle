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

const CONFIG = {
  // --- Environment ---
  NODE_ENV: isNode ? (process.env.NODE_ENV || 'development') : 'development',
  PORT: isNode ? (parseInt(process.env.PORT) || 3000) : 3000,
  LOG_LEVEL: isNode ? (process.env.LOG_LEVEL || 'info') : 'info',

  // --- Konten / Pesan ---
  MIN_WORD_COUNT: parseInt(process.env.MIN_WORD_COUNT) || 70,
  MAX_MESSAGE_LENGTH: parseInt(process.env.MAX_MESSAGE_LENGTH) || 5000,
  MAX_MESSAGES: parseInt(process.env.MAX_MESSAGES) || 10000,

  // --- Rate Limiting ---
  POST_RATE_LIMIT_WINDOW_MS: parseInt(process.env.POST_RATE_LIMIT_WINDOW_MS) || 900000,   // 15 menit
  POST_RATE_LIMIT_MAX: parseInt(process.env.POST_RATE_LIMIT_MAX) || 10,                    // maks 10 POST per window
  GET_RATE_LIMIT_WINDOW_MS: parseInt(process.env.GET_RATE_LIMIT_WINDOW_MS) || 60000,      // 1 menit
  GET_RATE_LIMIT_MAX: parseInt(process.env.GET_RATE_LIMIT_MAX) || 30,                      // maks 30 GET per window

  // --- Request Timeout ---
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS) || 10000,                   // 10 detik

  // --- Payload ---
  MAX_PAYLOAD_SIZE: process.env.MAX_PAYLOAD_SIZE || '100kb',
};

// Ekspor untuk Node.js (Server.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
