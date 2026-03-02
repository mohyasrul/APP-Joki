-- =============================================
-- upgrade-v6.sql — P1 Batch B
-- #6: get_keuangan_summary() — server-side aggregation
-- #7: search_orders()        — server-side ILIKE search
-- #8: notify_admins_payment_uploaded() — notification trigger
-- =============================================

-- =============================================
-- #6: Keuangan — server-side stats + monthly chart
-- =============================================
DROP FUNCTION IF EXISTS get_keuangan_summary();

CREATE OR REPLACE FUNCTION get_keuangan_summary()
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH paid AS (
    SELECT harga_final, created_at
    FROM orders
    WHERE status_pembayaran = 'Lunas'
  ),
  stats AS (
    SELECT
      COALESCE(SUM(harga_final), 0) AS total,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('week', NOW()) THEN harga_final ELSE 0 END), 0) AS week_total,
      COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN harga_final ELSE 0 END), 0) AS month_total,
      COALESCE(SUM(CASE
        WHEN created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
         AND created_at < date_trunc('month', NOW())
        THEN harga_final ELSE 0 END), 0) AS prev_month_total,
      COUNT(*) AS total_count
    FROM paid
  ),
  monthly AS (
    SELECT
      EXTRACT(MONTH FROM d.month)::INT AS bulan,
      COALESCE(SUM(p.harga_final), 0) AS value
    FROM (
      SELECT generate_series(
        date_trunc('month', NOW() - INTERVAL '5 months'),
        date_trunc('month', NOW()),
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


-- =============================================
-- #7: Server-side order search with ILIKE + pagination
-- =============================================
DROP FUNCTION IF EXISTS search_orders(TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION search_orders(
  p_term TEXT DEFAULT '',
  p_status TEXT DEFAULT 'Semua',
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  result JSON;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH filtered AS (
    SELECT
      o.*,
      json_build_object('judul_tugas', l.judul_tugas) AS layanan,
      json_build_object('full_name', p.full_name, 'phone', p.phone) AS profiles
    FROM orders o
    LEFT JOIN layanan l ON l.id = o.layanan_id
    LEFT JOIN profiles p ON p.id = o.client_id
    WHERE
      (p_status = 'Semua' OR
       (p_status = 'Menunggu Verifikasi' AND o.status_pembayaran = 'Menunggu Verifikasi') OR
       (p_status != 'Menunggu Verifikasi' AND o.status_pekerjaan = p_status))
      AND (p_term = '' OR
           l.judul_tugas ILIKE '%' || p_term || '%' OR
           p.full_name ILIKE '%' || p_term || '%' OR
           o.detail_tambahan ILIKE '%' || p_term || '%')
    ORDER BY o.created_at DESC
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM filtered
  )
  SELECT json_build_object(
    'data', COALESCE(
      (SELECT json_agg(row_to_json(f)) FROM (SELECT * FROM filtered LIMIT p_limit OFFSET p_offset) f),
      '[]'::json
    ),
    'count', (SELECT total FROM counted)
  ) INTO result;

  RETURN result;
END;
$$;


-- =============================================
-- #8: Notify admins when client uploads bukti transfer
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_admins_payment_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  client_name TEXT;
  layanan_name TEXT;
BEGIN
  -- Only fire when status_pembayaran changes TO 'Menunggu Verifikasi'
  IF NEW.status_pembayaran != 'Menunggu Verifikasi'
     OR OLD.status_pembayaran = NEW.status_pembayaran THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO client_name FROM public.profiles WHERE id = NEW.client_id;
  IF NEW.layanan_id IS NOT NULL THEN
    SELECT judul_tugas INTO layanan_name FROM public.layanan WHERE id = NEW.layanan_id;
  END IF;

  FOR admin_record IN SELECT id FROM public.profiles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      admin_record.id,
      'payment_verification',
      '💳 Bukti Bayar Baru!',
      COALESCE(client_name, 'Client') || ' mengupload bukti bayar untuk "' || COALESCE(layanan_name, 'Order') || '"',
      jsonb_build_object('order_id', NEW.id, 'client_name', client_name)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admins_payment_uploaded ON public.orders;
CREATE TRIGGER trigger_notify_admins_payment_uploaded
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_payment_uploaded();
