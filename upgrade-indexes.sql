-- =====================================================
-- Performance Indexes for Orders & Custom Requests
-- Run this in Supabase SQL Editor
-- =====================================================

-- Orders indexes (critical for common queries)
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_layanan_id ON orders(layanan_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_pekerjaan ON orders(status_pekerjaan);
CREATE INDEX IF NOT EXISTS idx_orders_status_pembayaran ON orders(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Composite index for common filtered queries
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status_pekerjaan);
CREATE INDEX IF NOT EXISTS idx_orders_pembayaran_lunas ON orders(status_pembayaran, created_at DESC)
  WHERE status_pembayaran = 'Lunas';

-- Custom requests indexes
CREATE INDEX IF NOT EXISTS idx_custom_requests_client_id ON custom_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON custom_requests(status);

-- Notifications index
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Foreign key cascading: if a layanan is deleted, set orders.layanan_id to NULL
-- (prevents orphaned references)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_layanan_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_layanan_id_fkey
  FOREIGN KEY (layanan_id) REFERENCES layanan(id) ON DELETE SET NULL;

-- Verify
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('orders', 'custom_requests', 'notifications')
ORDER BY tablename, indexname;
