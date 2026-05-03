// === SATU-SATUNYA sumber kebenaran untuk batasan konten ===
// Baik Frontend (via <script src="config.js">) dan Backend (via require)
// membaca dari file yang sama.

const CONFIG = {
  // Jumlah minimum kata yang harus ada dalam sebuah pesan
  MIN_WORD_COUNT: 300,
};

// Ekspor untuk Node.js (Server.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
