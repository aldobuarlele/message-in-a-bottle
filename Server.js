const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const CONFIG = require('./config.js');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./messages.db');

db.serialize(function () {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL
    );
  `);
});

// === Fungsi bantu hitung word count (sama persis logikanya dengan di Frontend) ===
function countWords(text) {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

app.post('/api/messages', (req, res) => {
  const message = req.body.message;

  // Cek apakah pesan ada
  if (!message) {
    res.status(400).send({ error: 'Pesan tidak boleh kosong' });
    return;
  }

  // Validasi word count
  const wordCount = countWords(message);
  if (wordCount < CONFIG.MIN_WORD_COUNT) {
    res.status(400).send({
      error: `Pesan harus minimal ${CONFIG.MIN_WORD_COUNT} kata. Saat ini: ${wordCount} kata.`
    });
    return;
  }

  db.run(`
    INSERT INTO messages (message) VALUES (?);
  `, [message], function (err) {
    if (err) {
      console.error(err);
      res.status(500).send({ error: 'Gagal menyimpan pesan' });
    } else {
      res.send({ message: 'Pesan berhasil dilempar ke laut!' });
    }
  });
});

app.get('/api/messages', (req, res) => {
  db.all(`
    SELECT message FROM messages ORDER BY RANDOM() LIMIT 1;
  `, [], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send({ error: 'Gagal mengambil pesan' });
    } else if (rows.length === 0) {
      res.send({ message: 'Tidak ada pesan dalam botol!' });
    } else {
      res.send({ message: rows[0].message });
    }
  });
});

app.listen(port, () => {
  console.log(`Server berjalan pada port ${port}`);
});
