-- =============================================
-- upgrade-v9.sql — P3 Clean-up
-- #23: Rating CHECK constraint
-- #24: Notification cleanup (TTL 30 days)
-- =============================================

-- -------------------------------------------------------
-- #23 — Rating CHECK constraint
-- Prevents out-of-range values (0, 6, 999, etc.).
-- IS NULL is allowed — most orders don't have a rating yet.
-- -------------------------------------------------------
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS rating_range_check;

ALTER TABLE public.orders
  ADD CONSTRAINT rating_range_check
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));


-- -------------------------------------------------------
-- #24 — Notification cleanup
-- Deletes notifications older than 30 days.
-- -------------------------------------------------------

-- Index to make the delete efficient
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at);

-- Cleanup function (call manually or schedule via pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- -------------------------------------------------------
-- Schedule with pg_cron (runs every day at 03:00 UTC).
-- Requires the pg_cron extension. Enable it in Supabase:
--   Dashboard → Database → Extensions → pg_cron
--
-- If pg_cron is not available on your plan, run the
-- cleanup manually in the SQL Editor:
--   SELECT cleanup_old_notifications();
-- -------------------------------------------------------
-- Uncomment the block below ONLY after enabling pg_cron:
/*
SELECT cron.schedule(
  'cleanup-old-notifications',   -- job name (unique)
  '0 3 * * *',                   -- cron expression: daily at 03:00 UTC
  'SELECT public.cleanup_old_notifications()'
);
*/
