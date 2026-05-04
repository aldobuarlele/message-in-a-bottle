// === SATU-SATUNYA sumber kebenaran untuk seluruh konfigurasi aplikasi ===
// Baik Frontend (via <script src="config.js">) dan Backend (via require)
// membaca dari file yang sama.

const CONFIG = {
  // --- Konten / Pesan ---
  // Jumlah minimum kata yang harus ada dalam sebuah pesan
  MIN_WORD_COUNT: 70,

  // Maksimum panjang karakter pesan (lines of text, bukan word count)
  MAX_MESSAGE_LENGTH: 5000,

  // Maksimum jumlah pesan yang bisa disimpan di database
  // Jika terlampaui, pesan tertua akan otomatis dihapus
  MAX_MESSAGES: 10000,

  // --- Rate Limiting ---
  // POST: maksimal request per window (cegah spam database)
  POST_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,   // 15 menit
  POST_RATE_LIMIT_MAX: 10,                      // maks 10 POST per window

  // GET: maksimal request per window (cegah scraping)
  GET_RATE_LIMIT_WINDOW_MS: 1 * 60 * 1000,     // 1 menit
  GET_RATE_LIMIT_MAX: 30,                       // maks 30 GET per window

  // Request timeout (ms)
  REQUEST_TIMEOUT_MS: 10000,                    // 10 detik

  // --- Payload ---
  // Maksimum ukuran body JSON yang diterima (dalam bytes)
  MAX_PAYLOAD_SIZE: '100kb',
};

// Ekspor untuk Node.js (Server.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
