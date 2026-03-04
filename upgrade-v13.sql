-- =============================================
-- JokiHub - P5 Schema Upgrades
-- Jalankan di Supabase SQL Editor
-- =============================================

-- 1. layanan: estimasi pengerjaan dalam hari
ALTER TABLE public.layanan ADD COLUMN IF NOT EXISTS estimasi_hari integer;


-- 2. orders: catatan internal admin (tidak diekspos ke client via query)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS catatan_internal text;


-- 3. custom_requests: budget range
ALTER TABLE public.custom_requests ADD COLUMN IF NOT EXISTS budget_min integer;
ALTER TABLE public.custom_requests ADD COLUMN IF NOT EXISTS budget_max integer;


-- 4. custom_requests: file attachments
ALTER TABLE public.custom_requests ADD COLUMN IF NOT EXISTS lampiran_files jsonb DEFAULT '[]'::jsonb;


-- 5. settings: app_config row (default max revisi + announcement)
INSERT INTO public.settings (id, data)
VALUES ('app_config', '{"default_max_revisi": 2, "announcement": null}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Allow admin to insert new settings rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'settings' AND policyname = 'Admin can insert settings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin can insert settings" ON public.settings
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
    $policy$;
  END IF;
END
$$;


-- 6. get_keuangan_summary: add optional year parameter
DROP FUNCTION IF EXISTS get_keuangan_summary();
DROP FUNCTION IF EXISTS get_keuangan_summary(integer);

CREATE OR REPLACE FUNCTION get_keuangan_summary(p_year integer DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_role TEXT;
  v_year integer;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::integer);

  WITH paid AS (
    SELECT harga_final, created_at
    FROM orders
    WHERE status_pembayaran = 'Lunas'
      AND EXTRACT(YEAR FROM created_at)::integer = v_year
  ),
  paid_all AS (
    SELECT harga_final, created_at
    FROM orders
    WHERE status_pembayaran = 'Lunas'
  ),
  stats AS (
    SELECT
      COALESCE(SUM(pa.harga_final), 0) AS total,
      COALESCE(SUM(CASE WHEN pa.created_at >= date_trunc('week', NOW()) THEN pa.harga_final ELSE 0 END), 0) AS week_total,
      COALESCE(SUM(CASE WHEN pa.created_at >= date_trunc('month', NOW()) THEN pa.harga_final ELSE 0 END), 0) AS month_total,
      COALESCE(SUM(CASE
        WHEN pa.created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
         AND pa.created_at < date_trunc('month', NOW())
        THEN pa.harga_final ELSE 0 END), 0) AS prev_month_total,
      COUNT(*) AS total_count
    FROM paid_all pa
  ),
  monthly AS (
    SELECT
      EXTRACT(MONTH FROM d.month)::INT AS bulan,
      COALESCE(SUM(p.harga_final), 0) AS value
    FROM (
      SELECT generate_series(
        make_date(v_year, 1, 1)::timestamp,
        make_date(v_year, 12, 1)::timestamp,
        '1 month'
      ) AS month
    ) d
    LEFT JOIN paid p ON date_trunc('month', p.created_at) = d.month
    GROUP BY d.month
    ORDER BY d.month
  )
  SELECT json_build_object(
    'total', s.total,
    'week_total', s.week_total,
    'month_total', s.month_total,
    'prev_month_total', s.prev_month_total,
    'total_count', s.total_count,
    'growth', CASE
      WHEN s.prev_month_total > 0
        THEN ROUND(((s.month_total - s.prev_month_total)::NUMERIC / s.prev_month_total) * 100)
      WHEN s.month_total > 0 THEN 100
      ELSE 0
    END,
    'monthly', (SELECT json_agg(json_build_object('bulan', m.bulan, 'value', m.value)) FROM monthly m)
  ) INTO result FROM stats s;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_keuangan_summary(integer) TO authenticated;


-- 7. get_dashboard_stats: add pendingRequests + avg_rating
DROP FUNCTION IF EXISTS get_dashboard_stats();

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

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
    'pendingRequests', (
      SELECT COUNT(*) FROM custom_requests WHERE status = 'Menunggu'
    ),
    'avgRating', COALESCE((
      SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM orders WHERE rating IS NOT NULL
    ), 0),
    'recentOrders', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT o.id, o.harga_final, o.status_pekerjaan, o.created_at,
               o.tenggat_waktu,
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

GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;


-- 8. get_client_stats: statistik per-client
CREATE OR REPLACE FUNCTION public.get_client_stats(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_role text;
  v_result jsonb;
BEGIN
  -- Only allow the client themselves or admin to call
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF auth.uid() != p_user_id AND v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_orders', (
      SELECT COUNT(*) FROM public.orders WHERE client_id = p_user_id
    ),
    'selesai', (
      SELECT COUNT(*) FROM public.orders WHERE client_id = p_user_id AND status_pekerjaan = 'Selesai'
    ),
    'pengeluaran_total', COALESCE((
      SELECT SUM(harga_final) FROM public.orders WHERE client_id = p_user_id AND status_pembayaran = 'Lunas'
    ), 0),
    'bergabung_sejak', (
      SELECT created_at FROM public.profiles WHERE id = p_user_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_stats(uuid) TO authenticated;
