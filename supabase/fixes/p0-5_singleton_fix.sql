-- =========================================
-- P0-5: Fix competition_visibility_settings design (singleton global)
-- =========================================
-- Issue: Table design unclear - should be singleton global, only admins can modify
-- Impact: Configuration management issues if not properly secured
-- Risk if not fixed: Non-admin users could modify global settings
-- Strategy: Ensure RLS policies enforce singleton global with admin-only modifications
-- Destructive: NO - only adds/updates policies, no data changes
--
-- Design decision: Singleton global table
-- - Only one row should exist for the entire application
-- - Settings apply globally to all users
-- - Only admins can INSERT, UPDATE, DELETE (modify)
-- - All authenticated users can SELECT (read)
-- =========================================

-- Step 1: Ensure RLS is enabled
ALTER TABLE public.competition_visibility_settings ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read visibility settings" ON public.competition_visibility_settings;
DROP POLICY IF EXISTS "Admins can insert visibility settings" ON public.competition_visibility_settings;
DROP POLICY IF EXISTS "Only admins can update visibility settings" ON public.competition_visibility_settings;
DROP POLICY IF EXISTS "Admins can delete visibility settings" ON public.competition_visibility_settings;

-- Step 3: Create policies for singleton global design

-- Policy: All authenticated users can read the singleton settings
CREATE POLICY "Authenticated users can read visibility settings"
ON public.competition_visibility_settings
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins can insert (initialize) the singleton settings
CREATE POLICY "Admins can insert visibility settings"
ON public.competition_visibility_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy: Only admins can update the singleton settings
CREATE POLICY "Only admins can update visibility settings"
ON public.competition_visibility_settings
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy: Only admins can delete the singleton settings
CREATE POLICY "Admins can delete visibility settings"
ON public.competition_visibility_settings
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Step 4: Add a comment to document the singleton intent
COMMENT ON TABLE public.competition_visibility_settings IS 'Singleton global table for competition visibility settings. Only one row should exist. Settings apply to all users. Only admins can modify.';

RAISE NOTICE 'P0-5 completed: competition_visibility_settings configured as singleton global with admin-only modifications';

-- =========================================
-- VERIFICATION
-- =========================================

DO $$
DECLARE
    rls_enabled boolean;
    policy_count integer;
BEGIN
    -- Verify RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'competition_visibility_settings'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    IF rls_enabled THEN
        RAISE NOTICE '✓ RLS is enabled on competition_visibility_settings';
    ELSE
        RAISE EXCEPTION '✗ RLS is NOT enabled on competition_visibility_settings';
    END IF;

    -- Verify 4 policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'competition_visibility_settings'
    AND schemaname = 'public';

    IF policy_count = 4 THEN
        RAISE NOTICE '✓ All 4 policies exist on competition_visibility_settings (SELECT, INSERT, UPDATE, DELETE)';
    ELSE
        RAISE EXCEPTION '✗ Expected 4 policies on competition_visibility_settings, found %', policy_count;
    END IF;

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'P0-5 VERIFICATION PASSED';
    RAISE NOTICE 'competition_visibility_settings is now:';
    RAISE NOTICE '  - Singleton global table (documented)';
    RAISE NOTICE '  - RLS enabled';
    RAISE NOTICE '  - SELECT: All authenticated users';
    RAISE NOTICE '  - INSERT/UPDATE/DELETE: Admins only';
    RAISE NOTICE '==========================================';
END $$;
