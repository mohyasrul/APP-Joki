-- =============================================
-- upgrade-v8.sql — Fix: orders_client_id_fkey for new accounts
-- Root cause: with email verification enabled, signUp() has no session,
-- so the client-side profile insert is rejected silently by RLS.
-- Fix: DB-level trigger that creates the profile row the moment
-- auth.users is populated — before email verification, before any session.
-- =============================================

-- 1. Trigger function: runs as SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Attach trigger to auth.users (fires on every new registration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Back-fill: create missing profiles for users who registered after
--    email verification was enabled but before this fix (their profile
--    row was silently dropped by RLS). Safe to run multiple times.
INSERT INTO public.profiles (id, full_name, phone, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  NULLIF(u.raw_user_meta_data->>'phone', ''),
  'client'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
-- Only back-fill confirmed users (unconfirmed ones will be handled by the trigger)
AND u.email_confirmed_at IS NOT NULL;
