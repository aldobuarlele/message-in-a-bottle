const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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

app.post('/api/messages', (req, res) => {
  const message = req.body.message;
  if (!message || message.length > 300) {
    res.status(400).send({ error: 'Pesan tidak boleh kosong atau lebih dari 300 karakter' });
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