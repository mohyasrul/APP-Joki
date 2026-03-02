-- =====================================================
-- Landing Page Statistics RPC
-- Run this in Supabase SQL Editor
-- Provides public stats for landing page (no auth required)
-- =====================================================

CREATE OR REPLACE FUNCTION get_landing_stats()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalCompleted', (
      SELECT COUNT(*) FROM orders WHERE status_pekerjaan = 'Selesai'
    ),
    'totalClients', (
      SELECT COUNT(*) FROM profiles WHERE role = 'client'
    ),
    'avgRating', COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1) FROM orders WHERE rating IS NOT NULL
    ), 0),
    'recentReviews', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT o.rating,
               o.review,
               LEFT(p.full_name, 1) || '***' AS client_name,
               o.created_at
        FROM orders o
        LEFT JOIN profiles p ON o.client_id = p.id
        WHERE o.rating IS NOT NULL AND o.review IS NOT NULL AND o.review != ''
        ORDER BY o.created_at DESC
        LIMIT 5
      ) t
    ), '[]'::json),
    'featuredLayanan', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT l.judul_tugas, l.harga_estimasi, l.kategori
        FROM layanan l
        WHERE l.tersedia = true
        ORDER BY l.created_at DESC
        LIMIT 6
      ) t
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant to both anon (not logged in) and authenticated
GRANT EXECUTE ON FUNCTION get_landing_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_landing_stats() TO authenticated;
