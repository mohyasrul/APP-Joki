-- =============================================
-- upgrade-v11.sql — P4 Features: Preferences & Account Deletion
-- #38: Notification preferences column on profiles
-- #39: delete_own_account() RPC function
-- =============================================

-- -------------------------------------------------------
-- #38 — Notification preferences
-- Stored as jsonb on profiles. Keys:
--   notif_order_status   boolean (default true)
--   notif_payment        boolean (default true)
--   notif_custom_request boolean (default true)
-- -------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{"notif_order_status": true, "notif_payment": true, "notif_custom_request": true}'::jsonb;


-- -------------------------------------------------------
-- #39 — Account deletion
-- Deletes the calling user's auth row (cascades to profiles
-- and all related data via ON DELETE CASCADE).
-- Must be called via supabase.rpc('delete_own_account')
-- from an authenticated session.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete from auth.users — cascades to profiles, orders (client_id),
    -- notifications, order_messages, order_activities via FK ON DELETE CASCADE.
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Revoke from public, grant only to authenticated users
REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
