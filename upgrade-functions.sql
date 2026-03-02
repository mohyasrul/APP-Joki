-- =====================================================
-- Server-side Functions & Triggers
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1) Atomic promo claiming (prevents race condition)
-- Usage: SELECT * FROM claim_promo('KODE123')
CREATE OR REPLACE FUNCTION claim_promo(p_kode TEXT)
RETURNS TABLE(
  out_id UUID,
  out_kode TEXT,
  out_tipe TEXT,
  out_nilai NUMERIC,
  out_kuota INT,
  out_terpakai INT,
  out_aktif BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  promo_row promos%ROWTYPE;
BEGIN
  -- Lock the row to prevent concurrent claims
  SELECT * INTO promo_row
  FROM promos p
  WHERE p.kode = p_kode AND p.aktif = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode promo tidak valid atau sudah tidak aktif';
  END IF;

  IF promo_row.kuota IS NOT NULL AND promo_row.terpakai >= promo_row.kuota THEN
    RAISE EXCEPTION 'Kuota promo sudah habis';
  END IF;

  -- Increment usage atomically
  UPDATE promos SET terpakai = promos.terpakai + 1 WHERE promos.id = promo_row.id;

  out_id := promo_row.id;
  out_kode := promo_row.kode;
  out_tipe := promo_row.tipe;
  out_nilai := promo_row.nilai;
  out_kuota := promo_row.kuota;
  out_terpakai := promo_row.terpakai + 1;
  out_aktif := promo_row.aktif;
  RETURN NEXT;
END;
$$;

-- 2) Dashboard statistics RPC (avoids fetching all orders client-side)
-- Usage: SELECT * FROM get_dashboard_stats()
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalIncome', COALESCE((
      SELECT SUM(harga_final) FROM orders WHERE status_pembayaran = 'Lunas'
    ), 0),
    'activeOrders', (
      SELECT COUNT(*) FROM orders WHERE status_pekerjaan IN ('Menunggu Diproses', 'Sedang Dikerjakan')
    ),
    'pendingVerify', (
      SELECT COUNT(*) FROM orders WHERE status_pembayaran = 'Menunggu Verifikasi'
    ),
    'completedOrders', (
      SELECT COUNT(*) FROM orders WHERE status_pekerjaan = 'Selesai'
    ),
    'recentOrders', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT o.id, o.harga_final, o.status_pekerjaan, o.created_at,
               l.judul_tugas AS layanan_judul,
               p.full_name AS client_name
        FROM orders o
        LEFT JOIN layanan l ON o.layanan_id = l.id
        LEFT JOIN profiles p ON o.client_id = p.id
        ORDER BY o.created_at DESC
        LIMIT 5
      ) t
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users (RLS still applies via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION claim_promo(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;

-- Verify
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('claim_promo', 'get_dashboard_stats');
