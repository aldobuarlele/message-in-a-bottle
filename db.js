// === KONEKSI DATABASE POSTGRESQL ===
// Digunakan untuk production di Vercel (via Neon.tech)
// Di development lokal, fallback ke SQLite (server.js handle sendiri)

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL tidak ditemukan di environment variables');
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Diperlukan untuk Neon.tech
      },
      // Connection pool settings
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle error pool
    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client', err);
    });
  }

  return pool;
}

// === Inisialisasi tabel ===
async function initDatabase() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[DB] Database initialized (PostgreSQL)');
  } finally {
    client.release();
  }
}

// === Query helpers ===

// Ambil satu pesan acak
async function getRandomMessage() {
  const result = await getPool().query(
    'SELECT message FROM messages ORDER BY RANDOM() LIMIT 1'
  );
  return result.rows;
}

// Simpan pesan baru
async function insertMessage(message) {
  const result = await getPool().query(
    'INSERT INTO messages (message, created_at) VALUES ($1, NOW()) RETURNING id',
    [message]
  );
  return result.rows[0];
}

// Hitung total pesan
async function countMessages() {
  const result = await getPool().query('SELECT COUNT(*) as count FROM messages');
  return parseInt(result.rows[0].count, 10);
}

// Hapus pesan tertua (untuk storage limit)
async function deleteOldestMessages(limit) {
  await getPool().query(
    'DELETE FROM messages WHERE id IN (SELECT id FROM messages ORDER BY id ASC LIMIT $1)',
    [limit]
  );
}

// === Admin queries ===

// Ambil pesan dengan pagination & search
async function getMessagesAdmin({ page, limit, search }) {
  const offset = (page - 1) * limit;
  let countQuery = 'SELECT COUNT(*) as total FROM messages';
  let dataQuery = 'SELECT id, message, created_at FROM messages';
  const params = [];
  const searchParams = [];

  if (search) {
    const whereClause = ' WHERE message ILIKE $1';
    const searchParam = `%${search}%`;
    countQuery += whereClause;
    dataQuery += whereClause;
    searchParams.push(searchParam);
  }

  dataQuery += ' ORDER BY id DESC LIMIT $' + (searchParams.length + 1) + ' OFFSET $' + (searchParams.length + 2);

  const countResult = await getPool().query(countQuery, searchParams);
  const total = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(total / limit);

  const dataParams = [...searchParams, limit, offset];
  const dataResult = await getPool().query(dataQuery, dataParams);

  return {
    messages: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Hapus pesan by ID
async function deleteMessageById(id) {
  const result = await getPool().query(
    'DELETE FROM messages WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows.length > 0;
}

// Cek apakah pesan exists
async function getMessageById(id) {
  const result = await getPool().query(
    'SELECT id FROM messages WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  getPool,
  initDatabase,
  getRandomMessage,
  insertMessage,
  countMessages,
  deleteOldestMessages,
  getMessagesAdmin,
  deleteMessageById,
  getMessageById,
};
