-- =============================================
-- Jokskuy - Dashboard Chart Data Function
-- Run this in Supabase SQL Editor
-- =============================================

-- Function: get_dashboard_chart_data
-- Returns aggregated data for dashboard charts and widgets
DROP FUNCTION IF EXISTS get_dashboard_chart_data(INTEGER);

CREATE OR REPLACE FUNCTION get_dashboard_chart_data(p_days INTEGER DEFAULT 7)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
  caller_role TEXT;
  v_start DATE;
  v_prev_start DATE;
  v_prev_end DATE;
BEGIN
  -- Auth check
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  v_start := CURRENT_DATE - p_days;
  v_prev_start := CURRENT_DATE - (p_days * 2);
  v_prev_end := v_start;

  SELECT json_build_object(
    -- Daily order counts for line chart
    'daily_orders', COALESCE((
      SELECT json_agg(row_to_json(t) ORDER BY t.day)
      FROM (
        SELECT d::date AS day,
               COUNT(o.id) AS count
        FROM generate_series(v_start, CURRENT_DATE, '1 day') d
        LEFT JOIN orders o ON o.created_at::date = d::date
        GROUP BY d::date
      ) t
    ), '[]'::json),

    -- Daily revenue for bar chart
    'daily_revenue', COALESCE((
      SELECT json_agg(row_to_json(t) ORDER BY t.day)
      FROM (
        SELECT d::date AS day,
               COALESCE(SUM(CASE WHEN o.status_pembayaran = 'Lunas' THEN o.harga_final ELSE 0 END), 0) AS revenue
        FROM generate_series(v_start, CURRENT_DATE, '1 day') d
        LEFT JOIN orders o ON o.created_at::date = d::date
        GROUP BY d::date
      ) t
    ), '[]'::json),

    -- Current period totals
    'current_income', COALESCE((
      SELECT SUM(harga_final) FROM orders
      WHERE status_pembayaran = 'Lunas' AND created_at::date >= v_start
    ), 0),
    'current_orders', (
      SELECT COUNT(*) FROM orders WHERE created_at::date >= v_start
    ),

    -- Previous period totals (for trend calculation)
    'prev_income', COALESCE((
      SELECT SUM(harga_final) FROM orders
      WHERE status_pembayaran = 'Lunas' AND created_at::date >= v_prev_start AND created_at::date < v_prev_end
    ), 0),
    'prev_orders', (
      SELECT COUNT(*) FROM orders
      WHERE created_at::date >= v_prev_start AND created_at::date < v_prev_end
    ),

    -- Top clients by total spend
    'top_clients', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT p.full_name, p.email, p.avatar_url,
               SUM(o.harga_final) AS total_spend,
               COUNT(o.id) AS order_count
        FROM orders o
        JOIN profiles p ON o.client_id = p.id
        WHERE o.status_pembayaran = 'Lunas'
        GROUP BY p.id, p.full_name, p.email, p.avatar_url
        ORDER BY total_spend DESC
        LIMIT 5
      ) t
    ), '[]'::json),

    -- Status breakdown
    'status_breakdown', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT status_pekerjaan AS status, COUNT(*) AS count
        FROM orders
        GROUP BY status_pekerjaan
        ORDER BY count DESC
      ) t
    ), '[]'::json),

    -- Payment summary
    'paid_total', COALESCE((SELECT SUM(harga_final) FROM orders WHERE status_pembayaran = 'Lunas'), 0),
    'unpaid_total', COALESCE((SELECT SUM(harga_final) FROM orders WHERE status_pembayaran IN ('Belum Bayar', 'Menunggu Verifikasi')), 0),
    'paid_count', (SELECT COUNT(*) FROM orders WHERE status_pembayaran = 'Lunas'),
    'unpaid_count', (SELECT COUNT(*) FROM orders WHERE status_pembayaran IN ('Belum Bayar', 'Menunggu Verifikasi'))

  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_chart_data(INTEGER) TO authenticated;
