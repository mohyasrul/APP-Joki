-- =============================================
-- Jokskuy - Security Fixes
-- Jalankan di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. Block role self-escalation on profiles
--    (Users can update their own profile BUT cannot change 'role')
-- =============================================

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a trigger that prevents role changes by non-service-role callers
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if role hasn't changed
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  -- Block role changes from non-admin/service callers
  -- Only a current admin can change roles
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Anda tidak memiliki izin untuk mengubah role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- Recreate the update policy (same as before, trigger handles role protection)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Also protect INSERT: ensure new profiles always have role = 'client'
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'client');

-- =============================================
-- 2. Restrict notification INSERT
--    Only SECURITY DEFINER triggers should insert notifications.
--    Remove the overly permissive "with check (true)" policy.
-- =============================================

DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- No INSERT policy for regular users — only triggers (SECURITY DEFINER) can insert.
-- If you need to insert from Edge Functions using service_role key, that bypasses RLS.

-- =============================================
-- 3. Fix push_subscriptions SELECT leak
--    The "Service can read push subs" policy exposes ALL users' push endpoints.
--    The Edge Function uses service_role key which bypasses RLS anyway.
-- =============================================

DROP POLICY IF EXISTS "Service can read push subs" ON public.push_subscriptions;

-- =============================================
-- 4. Add DELETE policy for layanan (admin only)
--    The UI has a delete button but no RLS policy allows it.
-- =============================================

CREATE POLICY "Admin can delete layanan"
  ON public.layanan FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- 5. Add DELETE policy for notifications (users can delete own)
-- =============================================

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- Verification queries (run these to confirm):
-- =============================================
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles';
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'notifications';
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'push_subscriptions';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'layanan';
--
-- Test privilege escalation (should fail):
-- UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
