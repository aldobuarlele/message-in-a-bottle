-- === MIGRASI DATABASE: SQLite → PostgreSQL ===
-- Jalankan script ini di PostgreSQL (Neon.tech) untuk membuat tabel
-- 
-- Cara pakai:
--   psql "postgresql://..." -f migrate.sql
--
-- Atau jalankan langsung dari query editor di Neon.tech

-- Buat tabel messages (sama struktur dengan SQLite)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk mempercepat pencarian (admin panel)
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_id_desc ON messages(id DESC);
