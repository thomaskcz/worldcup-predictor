-- =========================================
-- P0 Database Fixes - Safe Migration Script
-- =========================================
-- Date: 2026-06-24
-- Purpose: Fix critical P0 issues identified in database audit
-- Strategy: Safe, non-destructive migrations with data validation
--
-- CRITICAL: Review and test this script in a staging environment
-- before running in production.
-- =========================================

-- =========================================
-- PRE-MIGRATION CHECKS
-- =========================================

-- Check 1: Verify no duplicate external_id in matches table
-- This ensures the UNIQUE constraint can be added safely
DO $$
DECLARE
    duplicate_count integer;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT external_id, COUNT(*)
        FROM public.matches
        WHERE external_id IS NOT NULL
        GROUP BY external_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Cannot add UNIQUE constraint on matches.external_id: Found % duplicate external_id values. Please resolve duplicates before running this migration.', duplicate_count;
    END IF;

    RAISE NOTICE 'Pre-migration check passed: No duplicate external_id values found';
END $$;

-- Check 2: Verify competition_leaderboard data consistency
-- This ensures the CHECK constraint can be added safely
DO $$
DECLARE
    inconsistent_count integer;
BEGIN
    SELECT COUNT(*) INTO inconsistent_count
    FROM public.competition_leaderboard
    WHERE total_points != (group_points + knockout_points);

    IF inconsistent_count > 0 THEN
        RAISE EXCEPTION 'Cannot add CHECK constraint on competition_leaderboard: Found % rows where total_points != group_points + knockout_points. Please fix data inconsistencies before running this migration.', inconsistent_count;
    END IF;

    RAISE NOTICE 'Pre-migration check passed: All competition_leaderboard rows have consistent point totals';
END $$;

-- =========================================
-- P0-1: Enable RLS on competition_leaderboard
-- =========================================
-- Issue: Table has no RLS policies, not even enabled
-- Impact: Anyone can read/modify leaderboard scores
-- Risk if not fixed: Users could manipulate their own scores
-- Strategy: Add RLS with appropriate policies
-- Destructive: NO - only adds security

-- Enable RLS on the table
ALTER TABLE public.competition_leaderboard ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own leaderboard entry
CREATE POLICY "Users can view own leaderboard entry"
ON public.competition_leaderboard
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can manage (SELECT, INSERT, UPDATE, DELETE) leaderboard entries
CREATE POLICY "Admins can manage leaderboard"
ON public.competition_leaderboard
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

RAISE NOTICE 'P0-1 completed: RLS enabled on competition_leaderboard with appropriate policies';

-- =========================================
-- P0-4: Add UNIQUE constraint on matches.external_id
-- =========================================
-- Issue: No uniqueness constraint on external ID
-- Impact: Can import same match twice
-- Risk if not fixed: Duplicate matches, incorrect data
-- Strategy: Add UNIQUE constraint (pre-checked for duplicates above)
-- Destructive: NO - only adds constraint, no data modification

-- Add UNIQUE constraint on external_id
-- Note: This allows NULL values (multiple NULLs are allowed in UNIQUE constraint)
ALTER TABLE public.matches
ADD CONSTRAINT matches_external_id_unique UNIQUE (external_id);

RAISE NOTICE 'P0-4 completed: UNIQUE constraint added to matches.external_id';

-- =========================================
-- P0-6: Add CHECK constraint to competition_leaderboard
-- =========================================
-- Issue: No constraint ensuring total_points = group_points + knockout_points
-- Impact: Data inconsistency possible
-- Risk if not fixed: Incorrect leaderboard calculations
-- Strategy: Add CHECK constraint (pre-checked for consistency above)
-- Destructive: NO - only adds constraint, no data modification

-- Add CHECK constraint to ensure point totals are consistent
ALTER TABLE public.competition_leaderboard
ADD CONSTRAINT competition_leaderboard_total_points_sum_check
CHECK (total_points = group_points + knockout_points);

RAISE NOTICE 'P0-6 completed: CHECK constraint added to competition_leaderboard for point consistency';

-- =========================================
-- POST-MIGRATION VERIFICATION
-- =========================================

-- Verify RLS is enabled on competition_leaderboard
DO $$
DECLARE
    rls_enabled boolean;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'competition_leaderboard'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    IF rls_enabled THEN
        RAISE NOTICE 'Verification passed: RLS is enabled on competition_leaderboard';
    ELSE
        RAISE EXCEPTION 'Verification failed: RLS is NOT enabled on competition_leaderboard';
    END IF;
END $$;

-- Verify policies exist on competition_leaderboard
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'competition_leaderboard'
    AND schemaname = 'public';

    IF policy_count = 2 THEN
        RAISE NOTICE 'Verification passed: 2 policies exist on competition_leaderboard';
    ELSE
        RAISE EXCEPTION 'Verification failed: Expected 2 policies on competition_leaderboard, found %', policy_count;
    END IF;
END $$;

-- Verify UNIQUE constraint on matches.external_id
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    SELECT COUNT(*) > 0 INTO constraint_exists
    FROM pg_constraint
    WHERE conname = 'matches_external_id_unique'
    AND conrelid = (SELECT oid FROM pg_class WHERE relname = 'matches' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'));

    IF constraint_exists THEN
        RAISE NOTICE 'Verification passed: UNIQUE constraint exists on matches.external_id';
    ELSE
        RAISE EXCEPTION 'Verification failed: UNIQUE constraint does NOT exist on matches.external_id';
    END IF;
END $$;

-- Verify CHECK constraint on competition_leaderboard
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    SELECT COUNT(*) > 0 INTO constraint_exists
    FROM pg_constraint
    WHERE conname = 'competition_leaderboard_total_points_sum_check'
    AND conrelid = (SELECT oid FROM pg_class WHERE relname = 'competition_leaderboard' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'));

    IF constraint_exists THEN
        RAISE NOTICE 'Verification passed: CHECK constraint exists on competition_leaderboard';
    ELSE
        RAISE EXCEPTION 'Verification failed: CHECK constraint does NOT exist on competition_leaderboard';
    END IF;
END $$;

-- =========================================
-- MIGRATION COMPLETE
-- =========================================

RAISE NOTICE '========================================';
RAISE NOTICE 'P0 Database Fixes Migration Complete';
RAISE NOTICE '========================================';
RAISE NOTICE 'Fixed issues:';
RAISE NOTICE '  - P0-1: RLS enabled on competition_leaderboard';
RAISE NOTICE '  - P0-4: UNIQUE constraint on matches.external_id';
RAISE NOTICE '  - P0-6: CHECK constraint on competition_leaderboard';
RAISE NOTICE '========================================';
RAISE NOTICE 'IMPORTANT: Verify application functionality after migration';
RAISE NOTICE '========================================';
