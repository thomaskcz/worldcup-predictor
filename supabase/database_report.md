# Database Audit Report

**Date:** 2026-06-24
**Project:** worldcup-predictor
**Scope:** Complete database schema analysis

---

## 1. Executive Summary

### Overall Quality Assessment
The database exhibits a **moderate level of quality** with several critical issues that need attention. The schema follows a basic relational pattern but suffers from:

- **Weak referential integrity** (text fields instead of foreign keys)
- **Significant data redundancy** (multiple cached/calculated tables)
- **Inconsistent security model** (missing RLS on critical tables)
- **Logic duplication** between SQL and TypeScript
- **Mixed responsibilities** (business logic scattered across triggers, functions, and application code)

### Critical Issues (P0)
1. **Missing RLS on `competition_leaderboard`** - No security policies defined
2. **Text-based team references** - `matches.home_team`/`away_team` are text, not FKs
3. **Singleton table design flaw** - `competition_visibility_settings` has no user_id
4. **Duplicate function definition** - `rls_auto_enable` defined twice with differences
5. **Calculated data without consistency guarantees** - `user_scores` and `competition_leaderboard` can desync

### Major Issues (P1)
1. **Inconsistent enum usage** - `competition_results.stage` uses text instead of `match_stage` enum
2. **Obsolete view still present** - `leaderboard_view` exists but is not used
3. **Derived columns stored** - `predicted_winner` and `matches.winner` can be computed
4. **Complex view logic** - `user_prediction_tracking` has fragile CTE logic
5. **Missing constraints** - No CHECK constraints on score ranges in leaderboard tables

### Quick Wins (P2)
1. Add missing NOT NULL constraints
2. Remove duplicate indexes
3. Standardize timestamp conventions
4. Add missing indexes for common query patterns
5. Consolidate duplicate function definitions

### Sensitive Areas Requiring Caution
- **Score recalculation logic** - Duplicated between TypeScript and views
- **Leaderboard computation** - Frontend sorting vs view ordering inconsistency
- **Policy conflicts** - Multiple SELECT policies on same tables
- **Trigger-based validation** - Business logic in triggers vs application layer

---

## 2. Overview of Current Database Design

### Core Entities

#### Source of Truth Tables
1. **`users_profiles`** - User profile data (extends auth.users)
2. **`matches`** - Match information and results
3. **`teams`** - Team metadata
4. **`predictions`** - User match predictions
5. **`competition_predictions`** - User competition-wide predictions
6. **`competition_results`** - Official competition results
7. **`rules`** - Scoring rules configuration

#### Calculated/Derived Tables
1. **`user_scores`** - Computed scores per user per match (cache)
2. **`competition_leaderboard`** - Computed competition scores (cache)
3. **`competition_visibility_settings`** - Singleton settings for UI visibility

#### Views
1. **`leaderboard_detailed_view`** - Rich leaderboard with statistics (ACTIVE)
2. **`leaderboard_view`** - Simple leaderboard (OBSOLETE per AGENTS.md)
3. **`competition_predictions_with_users`** - Competition predictions with user info
4. **`user_prediction_tracking`** - Complex prediction continuity metrics

### Business Flow Covered

1. **User Management**: `auth.users` → `users_profiles` (via trigger)
2. **Match Flow**: `teams` → `matches` → `predictions` → `user_scores` (calculated)
3. **Competition Flow**: `competition_predictions` → `competition_results` → `competition_leaderboard` (calculated)
4. **Display**: Views aggregate data for leaderboard and tracking UIs

### Data Architecture Pattern
The database uses a **hybrid cache pattern**:
- Core data stored in source tables
- Derived scores stored in cache tables (`user_scores`, `competition_leaderboard`)
- Recalculation triggered manually via API endpoints
- Views provide read-optimized aggregations

**Weakness**: No automatic cache invalidation or consistency guarantees between source and derived data.

---

## 3. Table-by-Table Analysis

### 3.1 `users_profiles`

**Role**: Extension of Supabase auth.users with application-specific user data

**Issues**:
- ✅ Well-designed with proper FK to `auth.users`
- ✅ Unique constraint on `nickname` prevents duplicates
- ⚠️ `email` stored here but also in `auth.users` - potential redundancy
- ⚠️ No constraint on `nickname` format (length, characters)
- ⚠️ `is_admin` flag - no audit trail for admin changes

**Recommendations**:
- Consider removing `email` from this table (already in auth.users)
- Add CHECK constraint on `nickname` format if applicable
- Add audit table for admin privilege changes if security is critical

---

### 3.2 `matches`

**Role**: Stores match information, schedules, and results

**Critical Issues**:
- 🔴 **`home_team` and `away_team` are TEXT fields, not FKs to `teams`**
  - Impact: No referential integrity, can reference non-existent teams
  - Risk: Typos, inconsistent team names, orphaned data
  - Should be: `home_team_id uuid REFERENCES teams(id)`

- 🔴 **`winner` is TEXT, not enum**
  - Uses text 'home'/'away' instead of `knockout_winner_pick` enum
  - Inconsistent with `predictions.predicted_winner` which uses the enum

**Other Issues**:
- ⚠️ `external_id` has no UNIQUE constraint - potential duplicates
- ⚠️ `finished` flag can desync from actual score presence
- ⚠️ No constraint ensuring `home_score`/`away_score` are non-negative
- ⚠️ `stage` uses `match_stage` enum (correct) but inconsistent with `competition_results.stage`

**Derived Columns**:
- `winner` can be computed from `home_score`/`away_score` - redundant storage

**Recommendations**:
- **P0**: Convert `home_team`/`away_team` to FKs to `teams`
- **P0**: Add UNIQUE constraint on `external_id`
- **P1**: Use `knockout_winner_pick` enum for `winner`
- **P1**: Consider removing `winner` (compute on read)
- **P2**: Add CHECK constraints for score ranges

---

### 3.3 `predictions`

**Role**: Stores user predictions for individual matches

**Issues**:
- ✅ Proper FKs to `auth.users` and `matches`
- ✅ Unique constraint on `(user_id, match_id)` via index
- ⚠️ `predicted_winner` can be derived from score comparison
- ⚠️ `stage` column exists but is redundant (can join to `matches.stage`)

**Validation**:
- Trigger `validate_prediction` enforces business rules:
  - Cannot predict finished matches
  - Cannot predict after deadline
  - Knockout stages require `predicted_winner` for draws
  - Group stages must not have `predicted_winner`

**Recommendations**:
- **P2**: Remove `stage` column (derive from `matches`)
- **P2**: Consider removing `predicted_winner` (compute on read)
- **P3**: Move validation logic to application layer for better testability

---

### 3.4 `rules`

**Role**: Stores scoring rules configuration

**Issues**:
- ✅ JSONB storage flexible for rules
- ✅ `is_active` flag allows multiple rules with one active
- ⚠️ No constraint ensuring exactly one active rule
- ⚠️ No versioning/history of rule changes
- ⚠️ No migration strategy when rules structure changes

**Usage**:
- Read by `lib/recalculateScores.ts` to compute match scores
- NOT used for competition scoring (separate logic in TypeScript)

**Recommendations**:
- **P1**: Add constraint to ensure exactly one active rule
- **P2**: Add versioning/history table for rule changes
- **P2**: Add migration strategy documentation

---

### 3.5 `user_scores`

**Role**: Cache of computed scores per user per match

**Critical Issues**:
- 🔴 **Cache table without consistency guarantees**
  - Can desync from `predictions` + `matches` + `rules`
  - No automatic invalidation
  - Manual recalculation required via API

**Issues**:
- ⚠️ `stage` column redundant (can join to `matches`)
- ⚠️ `breakdown_json` structure not validated
- ⚠️ No constraint ensuring `score` matches breakdown sum
- ⚠️ `computed_at` doesn't track which rules version was used

**Recalculation**:
- Done by `lib/recalculateScores.ts`
- Skips matches if `computed_at >= match.updated_at` (optimization)
- Upserts with conflict on `(user_id, match_id)`

**Recommendations**:
- **P0**: Add `rules_version_id` to track which rules produced the score
- **P1**: Consider computed column or materialized view instead of cache table
- **P2**: Remove `stage` column (derive from `matches`)
- **P2**: Add constraint validating breakdown structure

---

### 3.6 `teams`

**Role**: Team metadata and group assignments

**Issues**:
- ✅ Simple, well-designed table
- ✅ UNIQUE constraint on `fifa_code`
- ⚠️ `group_name` is TEXT, no enum or FK to groups table
- ⚠️ No constraint on valid group names (A-H, etc.)
- ⚠️ `flag_url` not validated

**Recommendations**:
- **P2**: Add CHECK constraint on `group_name` format
- **P2**: Add CHECK constraint on `flag_url` format if applicable

---

### 3.7 `competition_predictions`

**Role**: Stores user predictions for competition-wide outcomes

**Issues**:
- ✅ UNIQUE constraint on `user_id` (one prediction per user)
- ✅ JSONB flexible for prediction structure
- ⚠️ `predictions_json` structure not validated by database
- ⚠️ No constraint ensuring valid team references in JSON
- ⚠️ No version history for prediction changes

**Structure** (from TypeScript):
```typescript
{
  groups: Record<string, { first: string; second: string }>,
  semi_finalists: string[],
  finalists: string[]
}
```

**Recommendations**:
- **P1**: Add CHECK constraint or trigger to validate JSON structure
- **P1**: Add foreign key validation for team IDs in JSON
- **P2**: Add version history table

---

### 3.8 `competition_results`

**Role**: Official competition results (group standings, knockout positions)

**Critical Issues**:
- 🔴 **`stage` uses TEXT instead of `match_stage` enum**
  - Values: 'groups', 'semi_final', 'final'
  - Inconsistent with `matches.stage` which uses enum
  - No database-level validation of valid values

**Issues**:
- ⚠️ `position` has CHECK `>= 1` but no upper bound
- ⚠️ No constraint ensuring unique (stage, group_name, position) combinations
- ⚠️ `team_id` FK exists but no constraint on team participation in stage
- ⚠️ `updated_at` only, no `created_at`

**Recommendations**:
- **P0**: Convert `stage` to use `match_stage` enum (or create new enum)
- **P1**: Add UNIQUE constraint on `(stage, group_name, position)` where applicable
- **P2**: Add `created_at` timestamp

---

### 3.9 `competition_leaderboard`

**Role**: Cache of computed competition scores per user

**Critical Issues**:
- 🔴 **NO RLS POLICIES DEFINED**
  - Table is not RLS-enabled
  - Anyone with database access can read/modify
  - Major security vulnerability

- 🔴 **Cache table without consistency guarantees**
  - Can desync from `competition_predictions` + `competition_results`
  - No automatic invalidation
  - Manual recalculation required

**Issues**:
- ⚠️ `breakdown_json` structure not validated
- ⚠️ No constraint ensuring `total_points = group_points + knockout_points`
- ⚠️ No tracking of which results version produced the score
- ⚠️ `updated_at` only, no `created_at`

**Recalculation**:
- Done by `lib/scoring/recalculateCompetition.ts`
- Upserts with conflict on `user_id`
- Uses `simpleScoring.ts` for actual calculation logic

**Recommendations**:
- **P0**: ENABLE RLS and define appropriate policies
- **P0**: Add CHECK constraint: `total_points = group_points + knockout_points`
- **P1**: Add `results_version_id` to track which results produced the score
- **P2**: Add `created_at` timestamp
- **P2**: Consider computed column or materialized view instead of cache table

---

### 3.10 `competition_visibility_settings`

**Role**: Singleton settings for controlling visibility of competition predictions

**Critical Design Flaw**:
- 🔴 **No `user_id` column**
  - UNIQUE constraint on `id` makes it a singleton table
  - But settings should likely be per-admin or configurable
  - Update policy uses `is_admin()` but no row-level context
  - Confusing design: is this global or per-user?

**Issues**:
- ⚠️ Three boolean flags for different stages
- ⚠️ No `created_at` timestamp
- ⚠️ Update policy allows any admin to modify (no audit trail)

**Recommendations**:
- **P0**: Clarify design - should this be:
  - Option A: Global singleton (current, but document it)
  - Option B: Per-user settings (add `user_id`)
  - Option C: Per-admin settings (add `user_id` with admin constraint)
- **P1**: Add audit trail for changes
- **P2**: Add `created_at` timestamp

---

## 4. Enums Analysis

### 4.1 `match_stage`

**Definition**:
```sql
CREATE TYPE public.match_stage AS ENUM (
    'group',
    'round_of_16',
    'round_of_32',
    'quarter_final',
    'semi_final',
    'third_place',
    'final'
);
```

**Usage**:
- ✅ Used in `matches.stage` (correct)
- ❌ NOT used in `competition_results.stage` (uses TEXT instead)
- ❌ NOT used in `user_scores.stage` (uses USER-DEFINED but type not enforced in schema)

**Issues**:
- Contains both `round_of_16` and `round_of_32` - World Cup typically uses one or the other
- TypeScript types match the enum (good)

**Recommendations**:
- **P0**: Use this enum in `competition_results.stage`
- **P1**: Remove unused stage value based on actual tournament format
- **P2**: Add COMMENT to document each stage

---

### 4.2 `knockout_winner_pick`

**Definition**:
```sql
CREATE TYPE public.knockout_winner_pick AS ENUM (
    'home',
    'away'
);
```

**Usage**:
- ✅ Used in `predictions.predicted_winner` (correct)
- ❌ NOT used in `matches.winner` (uses TEXT with CHECK instead)

**Issues**:
- Simple enum, well-designed
- Inconsistent usage between predictions and results

**Recommendations**:
- **P1**: Use this enum in `matches.winner` instead of TEXT + CHECK

---

## 5. Functions Analysis

### 5.1 `handle_new_user()`

**Role**: Trigger function to create user profile on auth.user creation

**Analysis**:
- ✅ Simple, clear purpose
- ✅ Uses ON CONFLICT DO UPDATE for idempotency
- ✅ Updates email on conflict (good for email changes)
- ⚠️ SECURITY DEFINER - necessary but should be reviewed
- ⚠️ No handling of other profile fields (nickname, is_admin)

**Recommendations**:
- **P2**: Add COMMENT documenting purpose
- **P3**: Consider adding default values for other fields if needed

---

### 5.2 `is_admin()`

**Role**: Returns true if current user is admin

**Analysis**:
- ✅ Simple, clear purpose
- ✅ Uses COALESCE for null safety
- ✅ SECURITY DEFINER necessary for auth.uid() access
- ⚠️ No caching - queries users_profiles on every call
- ⚠️ Used in multiple policies - potential performance impact

**Recommendations**:
- **P2**: Add COMMENT documenting usage
- **P3**: Consider caching if performance issues arise

---

### 5.3 `rls_auto_enable()` (CRITICAL - DUPLICATE)

**Role**: Event trigger to automatically enable RLS on new tables

**Analysis**:
- 🔴 **DEFINED TWICE** with slight differences:
  - Version 1 in `functions.sql` (lines 43-83)
  - Version 2 in `triggers.sql` (lines 58-97)
  - Version 2 has `SET search_path TO 'pg_catalog'` (more secure)
  - Both create the same function name - last one wins

- ✅ Good security practice
- ✅ Exception handling with logging
- ⚠️ Complex condition checking schema names
- ⚠️ Version 2 has redundant condition: `schema_name IN ('public')` then `NOT IN ('pg_catalog'...)`

**Recommendations**:
- **P0**: Remove duplicate definition - keep only version 2 (more secure)
- **P1**: Simplify condition logic
- **P2**: Add COMMENT documenting purpose

---

### 5.4 `set_updated_at()`

**Role**: Trigger function to auto-update `updated_at` timestamp

**Analysis**:
- ✅ Simple, clear purpose
- ✅ SECURITY INVOKER (appropriate - no special privileges needed)
- ✅ Used consistently across multiple tables
- ⚠️ No handling of NULL values (not an issue given defaults)

**Recommendations**:
- No changes needed - well-designed

---

### 5.5 `validate_prediction()`

**Role**: Trigger function to validate prediction business rules

**Analysis**:
- ✅ Enforces important business rules at database level
- ✅ Clear error messages
- ⚠️ **Business logic in database layer** - should this be in application?
- ⚠️ Complex validation logic harder to test than application code
- ⚠️ Time-based validation (deadline) uses `timezone('utc', now())` - hard to test
- ⚠️ No consideration for admin overrides (admin might need to override)

**Validation Rules**:
1. Match must exist
2. Match cannot be finished
3. Prediction deadline not passed
4. Knockout draws require predicted_winner
5. Group stages must not have predicted_winner

**Recommendations**:
- **P1**: Consider moving validation to application layer for better testability
- **P2**: Add admin bypass if needed
- **P2**: Add COMMENT documenting each rule
- **P3**: Consider making deadline validation configurable per match

---

## 6. Triggers Analysis

### 6.1 `matches_set_updated_at`

**Status**: ✅ Healthy
- Standard updated_at trigger
- No issues

---

### 6.2 `predictions_set_updated_at`

**Status**: ✅ Healthy
- Standard updated_at trigger
- No issues

---

### 6.3 `predictions_validate_before_insert` / `predictions_validate_before_update`

**Status**: ⚠️ Discussable
- Both use `validate_prediction()` function
- Same issues as the function (see section 5.5)
- Business logic in database layer

**Recommendations**:
- Same as function recommendations (move to app layer if desired)

---

### 6.4 `rules_set_updated_at`

**Status**: ✅ Healthy
- Standard updated_at trigger
- No issues

---

### 6.5 `users_profiles_set_updated_at`

**Status**: ✅ Healthy
- Standard updated_at trigger
- No issues

---

### 6.6 `ensure_rls` (Event Trigger)

**Status**: ⚠️ Discussable
- Calls `rls_auto_enable()` function
- Good security practice
- Depends on duplicate function (see section 5.3)

**Recommendations**:
- Fix duplicate function issue first

---

## 7. Views Analysis

### 7.1 `leaderboard_detailed_view`

**Role**: Main leaderboard view with detailed statistics

**Status**: ✅ Active (used by app/leaderboard/page.tsx)

**Analysis**:
- ✅ Complex CTE structure for match statistics
- ✅ Computes exact_score_count and correct_predictions_count
- ✅ Joins user_scores and competition_leaderboard
- ⚠️ **Logic duplication**: Statistics computed here but also in TypeScript sorting
- ⚠️ SUM aggregation might have issues if user_scores has duplicates (shouldn't with unique constraint)
- ⚠️ No handling of NULL breakdown_json in COALESCE
- ⚠️ Performance: Multiple joins and aggregations on potentially large datasets

**Frontend Usage**:
- Read by `app/leaderboard/page.tsx`
- **Sorting done in TypeScript**, not in view (lines 22-30)
- Sorting criteria: `total_points DESC, exact_score_count DESC, email ASC`
- This is documented in AGENTS.md - important for consistency

**Recommendations**:
- **P1**: Add ORDER BY to view to match frontend sorting (or document why not)
- **P1**: Add indexes to support view queries
- **P2**: Consider materialized view if performance issues
- **P2**: Add COMMENT documenting the statistics logic

---

### 7.2 `leaderboard_view`

**Role**: Simple leaderboard view

**Status**: ❌ Obsolete (per AGENTS.md)

**Analysis**:
- Simpler version of leaderboard_detailed_view
- Has ORDER BY in view definition
- Not used by application code
- AGENTS.md explicitly states it's obsolete

**Recommendations**:
- **P2**: Remove this view (documented as obsolete)

---

### 7.3 `competition_predictions_with_users`

**Role**: Competition predictions with user profile and leaderboard data

**Status**: ⚠️ Discussable

**Analysis**:
- Joins competition_predictions with users_profiles and competition_leaderboard
- Simple LEFT JOIN structure
- ⚠️ No usage found in codebase (need to verify)
- ⚠️ If unused, should be removed

**Recommendations**:
- **P2**: Verify usage - remove if unused
- **P2**: Add COMMENT documenting purpose if used

---

### 7.4 `user_prediction_tracking`

**Role**: Complex view tracking prediction continuity

**Status**: ⚠️ Fragile

**Analysis**:
- Very complex CTE structure (4 CTEs)
- Computes "continuous predictions count" - streak of consecutive predictions
- Finds first gap in prediction sequence
- Cross join users_profiles with ordered_matches (potential performance issue)
- Multiple subqueries within CTEs

**Issues**:
- 🔴 **Complex, fragile logic** - hard to maintain
- 🔴 **Cross join** could be expensive with many users and matches
- ⚠️ Duplicate logic for counting ordered_matches (lines 156-159 and 164-168)
- ⚠️ No documentation of what "continuous" means in business terms
- ⚠️ Subquery in SELECT clause (line 198-204) - executed per row

**Usage**:
- Used by `components/admin/UserPredictionTracking.tsx` (likely)

**Recommendations**:
- **P1**: Simplify or refactor this view
- **P1**: Add comprehensive COMMENT documenting the business logic
- **P1**: Consider moving this logic to application layer for better testability
- **P2**: Add indexes to support the queries
- **P2**: Benchmark performance with realistic data volumes

---

## 8. Indexes Analysis

### 8.1 Matches Indexes

**Existing**:
- `matches_external_id_idx` on `external_id`
- `matches_finished_idx` on `finished`
- `matches_stage_idx` on `stage`
- `matches_start_time_idx` on `start_time`

**Analysis**:
- ✅ All indexes are appropriate for common query patterns
- ✅ `finished` index for filtering finished matches
- ✅ `start_time` index for ordering by time
- ⚠️ No composite index for common patterns (e.g., finished + start_time)

**Recommendations**:
- **P2**: Consider composite index on `(finished, start_time)` for common query pattern
- **P2**: Add UNIQUE index on `external_id` (P0 issue from table analysis)

---

### 8.2 Predictions Indexes

**Existing**:
- `predictions_user_id_idx` on `user_id`
- `predictions_match_id_idx` on `match_id`
- `predictions_one_per_user_per_match` UNIQUE on `(user_id, match_id)`

**Analysis**:
- ✅ UNIQUE index serves as both constraint and index
- ⚠️ `predictions_user_id_idx` and `predictions_match_id_idx` are redundant
  - The UNIQUE index on `(user_id, match_id)` can be used for both queries
  - PostgreSQL can use leftmost prefixes of composite indexes

**Recommendations**:
- **P2**: Remove redundant single-column indexes (keep only UNIQUE)
- **P2**: Verify query plans before removal

---

### 8.3 User Scores Indexes

**Existing**:
- `user_scores_user_id_idx` on `user_id`
- `user_scores_match_id_idx` on `match_id`
- `user_scores_computed_at_idx` on `computed_at`
- `user_scores_one_per_user_per_match` UNIQUE on `(user_id, match_id)`

**Analysis**:
- ⚠️ Same redundancy issue as predictions
- ⚠️ `computed_at` index - is this actually used? Need to verify
- ✅ UNIQUE index appropriate

**Recommendations**:
- **P2**: Remove redundant single-column indexes
- **P2**: Verify if `computed_at` index is used - remove if not

---

### 8.4 Teams Indexes

**Existing**:
- `teams_group_name_idx` on `group_name`

**Analysis**:
- ✅ Appropriate for filtering by group
- ⚠️ `fifa_code` has UNIQUE constraint which creates index automatically

**Recommendations**:
- No changes needed

---

### 8.5 Competition Results Indexes

**Existing**:
- `competition_results_group_name_idx` on `group_name`
- `competition_results_stage_idx` on `stage`
- `competition_results_team_id_idx` on `team_id`

**Analysis**:
- ✅ All appropriate for common query patterns
- ✅ FK to teams indexed (good practice)

**Recommendations**:
- No changes needed

---

### 8.6 Competition Leaderboard Indexes

**Existing**:
- `competition_leaderboard_total_points_idx` on `total_points`
- `competition_leaderboard_user_id_idx` on `user_id`

**Analysis**:
- ⚠️ `user_id` index is redundant - UNIQUE constraint on `user_id` creates index
- ✅ `total_points` index useful for leaderboard sorting
- ⚠️ No index on `group_points` or `knockout_points` if filtered by these

**Recommendations**:
- **P2**: Remove redundant `user_id` index
- **P2**: Consider composite index on `(total_points, group_points, knockout_points)` for leaderboard queries

---

### 8.7 Rules Indexes

**Existing**:
- `rules_is_active_idx` on `is_active`

**Analysis**:
- ✅ Appropriate for finding active rule
- ⚠️ Query also orders by `updated_at DESC` - might benefit from composite index

**Recommendations**:
- **P2**: Consider composite index on `(is_active, updated_at DESC)`

---

## 9. RLS / Security Analysis

### 9.1 Critical Security Issues

#### 🔴 Missing RLS on `competition_leaderboard`
- **Table has NO RLS policies defined**
- **Table is NOT RLS-enabled**
- Anyone with database access can read/modify leaderboard
- **Impact**: Users could manipulate their own scores
- **Priority**: P0

#### 🔴 Missing RLS on `competition_visibility_settings`
- **Table has RLS enabled but policies are incomplete**
- Only SELECT and UPDATE policies defined
- No INSERT or DELETE policies
- **Impact**: Incomplete security model
- **Priority**: P1

---

### 9.2 Table-by-Table Security Analysis

### `competition_predictions`
**Policies**:
- ✅ SELECT: Authenticated users can view own predictions
- ✅ INSERT: Users can insert own predictions
- ✅ UPDATE: Users can update own predictions
- ✅ DELETE: Users can delete own predictions

**Issues**:
- ⚠️ No admin override policy
- ✅ Well-designed row-level security

---

### `competition_results`
**Policies**:
- ✅ SELECT: Authenticated users can view (read-only)
- ✅ ALL: Service role can manage (admin operations)

**Issues**:
- ⚠️ No authenticated admin policy (only service_role)
- ✅ Appropriate for reference data

---

### `competition_visibility_settings`
**Policies**:
- ✅ SELECT: Authenticated users can read
- ✅ UPDATE: Only admins can update (uses `is_admin()`)

**Issues**:
- 🔴 No INSERT policy (how is the row created?)
- 🔴 No DELETE policy
- ⚠️ Update policy uses `is_admin()` but table has no user_id
- **Impact**: Incomplete - table might be unusable

**Recommendations**:
- **P1**: Add INSERT policy (for initial setup)
- **P1**: Add DELETE policy (if needed)
- **P0**: Clarify table design (singleton vs per-user)

---

### `matches`
**Policies**:
- ✅ SELECT: Authenticated users can view
- ✅ SELECT: Public can view (anon + authenticated)
- ✅ INSERT/UPDATE/DELETE: Only admins

**Issues**:
- ⚠️ Two SELECT policies (authenticated and public) - redundant
- ✅ Appropriate for reference data

**Recommendations**:
- **P2**: Consolidate SELECT policies (keep public only)

---

### `predictions`
**Policies**:
- ✅ SELECT: Authenticated users can view own predictions
- ✅ INSERT: Users can insert own predictions
- ✅ UPDATE: Users can update own predictions
- ✅ DELETE: Users can delete own predictions

**Issues**:
- ⚠️ No admin override policy
- ✅ Well-designed row-level security

---

### `rules`
**Policies**:
- ✅ SELECT: Public can view (anon + authenticated)
- ✅ INSERT/UPDATE/DELETE: Only admins

**Issues**:
- ✅ Appropriate for reference data

---

### `teams`
**Policies**:
- ✅ SELECT: Public can view

**Issues**:
- ✅ Appropriate for reference data

---

### `user_scores`
**Policies**:
- ✅ SELECT: Authenticated users can view
- ✅ SELECT: Public can view (anon + authenticated)
- ✅ ALL: Only admins can update

**Issues**:
- ⚠️ Two SELECT policies (authenticated and public) - redundant
- ⚠️ Public read access - is this intentional? Scores reveal user performance
- ✅ Admin-only modification is appropriate

**Recommendations**:
- **P2**: Consolidate SELECT policies
- **P1**: Review if public read access is appropriate

---

### `users_profiles`
**Policies**:
- ✅ SELECT: Authenticated users can view all profiles
- ✅ SELECT: Public can view (for leaderboard)
- ✅ INSERT: Users can insert own profile
- ✅ SELECT: Users can read own profile
- ✅ UPDATE: Users can update own profile

**Issues**:
- ⚠️ Three SELECT policies - potential redundancy
- ⚠️ Public read access exposes emails - privacy concern?
- ✅ User self-management is appropriate

**Recommendations**:
- **P1**: Review if public read access with emails is appropriate
- **P2**: Consolidate SELECT policies

---

### 9.3 Security Summary

**What a normal user can see/modify**:
- ✅ View: matches, teams, rules, own predictions, own competition predictions, user scores, user profiles
- ✅ Modify: own predictions, own competition predictions, own profile
- ❌ Cannot: modify matches, results, scores, leaderboard, rules, visibility settings

**What an admin can see/modify**:
- ✅ View: everything
- ✅ Modify: matches, rules, user scores, visibility settings
- ❌ Cannot: directly modify competition_leaderboard (no RLS, but no policy either)

**Risks**:
1. **competition_leaderboard** - No RLS at all
2. **competition_visibility_settings** - Incomplete policies
3. **Public read access** - Emails and scores exposed to anonymous users
4. **No admin override** - Cannot fix user predictions if needed

---

## 10. Cross-Cutting Issues and Technical Debt

### 10.1 Logic Duplication

**Score Calculation**:
- Logic exists in TypeScript: `lib/scoringEngine.ts`, `lib/scoring/simpleScoring.ts`
- Views also compute statistics: `leaderboard_detailed_view`
- Risk: Inconsistency between application and database calculations

**Prediction Validation**:
- Logic in trigger: `validate_prediction()`
- Also likely in application layer
- Risk: Different validation rules in different layers

**Sorting/Ordering**:
- Frontend sorts leaderboard in TypeScript (app/leaderboard/page.tsx)
- AGENTS.md documents this as important for consistency
- Risk: Future changes might not maintain consistency

**Recommendations**:
- **P1**: Choose single source of truth for score calculation
- **P1**: Document which layer owns which business logic
- **P1**: Add tests to ensure consistency between layers

---

### 10.2 Cache Without Invalidation

**User Scores**:
- Stored in `user_scores` table
- Recalculated manually via API
- No automatic invalidation when:
  - Prediction changes
  - Match result changes
  - Rules change
- Risk: Stale scores if recalculation not triggered

**Competition Leaderboard**:
- Stored in `competition_leaderboard` table
- Recalculated manually via API
- No automatic invalidation when:
  - Competition prediction changes
  - Competition result changes
- Risk: Stale leaderboard if recalculation not triggered

**Recommendations**:
- **P0**: Document cache invalidation strategy
- **P1**: Consider triggers to auto-invalidate on relevant changes
- **P1**: Add `last_invalidated_at` timestamp to track staleness
- **P2**: Consider materialized views with refresh strategies

---

### 10.3 Inconsistent Data Types

**Text vs Enum**:
- `matches.stage` uses `match_stage` enum ✅
- `competition_results.stage` uses TEXT ❌
- `matches.winner` uses TEXT + CHECK ❌
- `predictions.predicted_winner` uses `knockout_winner_pick` enum ✅

**Text vs Foreign Key**:
- `matches.home_team`/`away_team` use TEXT ❌
- Should reference `teams.id` via FK ✅

**Recommendations**:
- **P0**: Standardize on enums where applicable
- **P0**: Use FKs instead of text references

---

### 10.4 Inconsistent Timestamps

**Pattern**:
- Most tables have `created_at` and `updated_at`
- `competition_results` only has `updated_at`
- `competition_visibility_settings` only has `updated_at`
- `competition_leaderboard` only has `updated_at`

**Recommendations**:
- **P2**: Add `created_at` to all tables for audit trail
- **P2**: Standardize timestamp naming convention

---

### 10.5 Missing Constraints

**Uniqueness**:
- `matches.external_id` - no UNIQUE constraint
- `competition_results` - no UNIQUE on (stage, group_name, position)

**Check Constraints**:
- No CHECK on score ranges in leaderboard tables
- No CHECK on `total_points = group_points + knockout_points`
- No CHECK on `group_name` format in teams

**Recommendations**:
- **P0**: Add UNIQUE on `matches.external_id`
- **P1**: Add CHECK constraints for data integrity
- **P2**: Add UNIQUE constraints where appropriate

---

### 10.6 Business Logic in Wrong Layer

**Database Layer**:
- Prediction validation in trigger
- RLS policies (appropriate)
- Event triggers for RLS (appropriate)

**Application Layer**:
- Score calculation in TypeScript
- Competition scoring in TypeScript
- Leaderboard sorting in TypeScript

**Issues**:
- Validation logic split between database and application
- Score calculation only in application (should database enforce constraints?)
- No clear separation of concerns

**Recommendations**:
- **P1**: Document which logic belongs in which layer
- **P1**: Consider moving all validation to application layer for testability
- **P2**: Add database-level constraints for critical business rules

---

### 10.7 Naming Inconsistencies

**Table Names**:
- Plural: `users_profiles`, `matches`, `predictions`, `teams` ✅
- Singular: `rules` ❌ (should be `rules_configurations` or similar)

**Column Names**:
- Generally consistent ✅
- `created_at`/`updated_at` pattern consistent ✅
- `*_json` suffix for JSONB columns consistent ✅

**Recommendations**:
- **P3**: Rename `rules` to `scoring_rules` for clarity

---

## 11. Suspected Dead / Redundant / Legacy Elements

### 11.1 Definitely Redundant

**Duplicate Function Definition**:
- `rls_auto_enable()` defined in both `functions.sql` and `triggers.sql`
- **Risk**: Last definition wins, unclear which is used
- **Action**: Remove one (keep the more secure version)

**Redundant Indexes**:
- `predictions_user_id_idx` - covered by UNIQUE index
- `predictions_match_id_idx` - covered by UNIQUE index
- `user_scores_user_id_idx` - covered by UNIQUE index
- `user_scores_match_id_idx` - covered by UNIQUE index
- `competition_leaderboard_user_id_idx` - covered by UNIQUE constraint
- **Action**: Remove redundant indexes

**Redundant SELECT Policies**:
- `matches`: Two SELECT policies (authenticated + public)
- `user_scores`: Two SELECT policies (authenticated + public)
- `users_profiles`: Three SELECT policies
- **Action**: Consolidate

---

### 11.2 Likely Unused

**Obsolete View**:
- `leaderboard_view` - documented as obsolete in AGENTS.md
- Not used by application code
- **Action**: Remove after confirmation

**Possibly Unused View**:
- `competition_predictions_with_users` - no usage found in codebase
- **Action**: Verify usage, remove if unused

**Possibly Unused Index**:
- `user_scores_computed_at_idx` - need to verify if actually used
- **Action**: Check query plans, remove if unused

---

### 11.3 Derived Columns (Potential Redundancy)

**Computed Columns That Could Be Derived**:
- `predictions.predicted_winner` - can be computed from scores
- `matches.winner` - can be computed from scores
- `user_scores.stage` - can be joined from `matches`
- `predictions.stage` - can be joined from `matches`

**Action**:
- **P2**: Evaluate if these columns are needed for performance
- **P2**: Consider removing if not performance-critical

---

### 11.4 Singleton Table Design

**`competition_visibility_settings`**:
- Single row table (UNIQUE on `id`)
- No user_id column
- Unclear if global or per-user
- **Action**: Clarify design intent (see section 3.10)

---

## 12. Prioritized Recommendations

### P0 - Urgent / Bug / Security / Critical Inconsistency

#### 1. Enable RLS on `competition_leaderboard`
- **Problem**: Table has no RLS policies, not even enabled
- **Impact**: Anyone can read/modify leaderboard scores
- **Proposal**:
  ```sql
  ALTER TABLE public.competition_leaderboard ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view own leaderboard entry"
    ON public.competition_leaderboard
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
  CREATE POLICY "Admins can manage leaderboard"
    ON public.competition_leaderboard
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  ```
- **Risk if not fixed**: Users could manipulate their own scores, leaderboard integrity compromised
- **Complexity**: Low

#### 2. Fix duplicate `rls_auto_enable()` function
- **Problem**: Function defined twice with slight differences
- **Impact**: Unclear which version is used, potential security issue
- **Proposal**: Remove version from `functions.sql`, keep version from `triggers.sql` (has `SET search_path TO 'pg_catalog'`)
- **Risk if not fixed**: Configuration drift, potential security vulnerability
- **Complexity**: Low

#### 3. Convert `matches.home_team`/`away_team` to FKs
- **Problem**: Text fields instead of foreign keys to `teams`
- **Impact**: No referential integrity, can reference non-existent teams
- **Proposal**:
  ```sql
  ALTER TABLE public.matches
    ADD COLUMN home_team_id uuid REFERENCES teams(id),
    ADD COLUMN away_team_id uuid REFERENCES teams(id);
  -- Migration required to populate from existing text values
  ```
- **Risk if not fixed**: Data corruption, inconsistent team names
- **Complexity**: High (requires migration)

#### 4. Add UNIQUE constraint on `matches.external_id`
- **Problem**: No uniqueness constraint on external ID
- **Impact**: Can import same match twice
- **Proposal**: `ALTER TABLE public.matches ADD CONSTRAINT matches_external_id_unique UNIQUE (external_id);`
- **Risk if not fixed**: Duplicate matches, incorrect data
- **Complexity**: Low (but need to check for existing duplicates first)

#### 5. Fix `competition_visibility_settings` design
- **Problem**: No user_id, unclear if singleton or per-user, incomplete policies
- **Impact**: Table might be unusable or confusing
- **Proposal**: Choose one:
  - Option A: Document as global singleton, add INSERT policy for initial setup
  - Option B: Add user_id, make it per-user settings
- **Risk if not fixed**: Configuration management issues
- **Complexity**: Medium

#### 6. Add CHECK constraint to `competition_leaderboard`
- **Problem**: No constraint ensuring `total_points = group_points + knockout_points`
- **Impact**: Data inconsistency possible
- **Proposal**: `ALTER TABLE public.competition_leaderboard ADD CONSTRAINT total_points_sum_check CHECK (total_points = group_points + knockout_points);`
- **Risk if not fixed**: Incorrect leaderboard calculations
- **Complexity**: Low

---

### P1 - Important

#### 7. Use enum for `competition_results.stage`
- **Problem**: Uses TEXT instead of `match_stage` enum
- **Impact**: No database-level validation
- **Proposal**: Add column with enum, migrate data, drop old column
- **Risk if not fixed**: Invalid stage values possible
- **Complexity**: Medium (requires migration)

#### 8. Use enum for `matches.winner`
- **Problem**: Uses TEXT + CHECK instead of `knockout_winner_pick` enum
- **Impact**: Inconsistent with predictions, less type safety
- **Proposal**: Change column type to `knockout_winner_pick`
- **Risk if not fixed**: Type inconsistency
- **Complexity**: Low

#### 9. Remove obsolete `leaderboard_view`
- **Problem**: Documented as obsolete but still exists
- **Impact**: Confusion, maintenance burden
- **Proposal**: `DROP VIEW public.leaderboard_view;`
- **Risk if not fixed**: None (documented as obsolete)
- **Complexity**: Low

#### 10. Add version tracking to cache tables
- **Problem**: `user_scores` and `competition_leaderboard` don't track which rules/results produced them
- **Impact**: Hard to debug score inconsistencies
- **Proposal**: Add `rules_version_id` or `results_version_id` columns
- **Risk if not fixed**: Difficult to troubleshoot scoring issues
- **Complexity**: Medium

#### 11. Simplify `user_prediction_tracking` view
- **Problem**: Very complex, fragile CTE logic
- **Impact**: Hard to maintain, potential performance issues
- **Proposal**: Refactor to simpler structure or move to application layer
- **Risk if not fixed**: Maintenance burden, potential bugs
- **Complexity**: High

#### 12. Add validation to `competition_predictions.predictions_json`
- **Problem**: No database-level validation of JSON structure
- **Impact**: Invalid predictions can be stored
- **Proposal**: Add CHECK constraint or trigger to validate structure
- **Risk if not fixed**: Invalid data in database
- **Complexity**: Medium

#### 13. Add admin override policies
- **Problem**: No admin can override user restrictions
- **Impact**: Admins cannot fix user issues
- **Proposal**: Add admin bypass policies to key tables
- **Risk if not fixed**: Admin cannot fix user errors
- **Complexity**: Low

#### 14. Review public read access
- **Problem**: Emails and scores exposed to anonymous users
- **Impact**: Privacy concern
- **Proposal**: Remove public read from sensitive tables, keep on reference data
- **Risk if not fixed**: Privacy exposure
- **Complexity**: Low

#### 15. Add UNIQUE constraint to `competition_results`
- **Problem**: No constraint on (stage, group_name, position)
- **Impact**: Can have duplicate results
- **Proposal**: Add UNIQUE constraint where applicable
- **Risk if not fixed**: Duplicate results possible
- **Complexity**: Low

---

### P2 - Useful Improvements

#### 16. Remove redundant indexes
- **Problem**: Single-column indexes covered by UNIQUE indexes
- **Impact**: Wasted storage, slower writes
- **Proposal**: Remove redundant indexes listed in section 8
- **Risk if not fixed**: Slight performance overhead
- **Complexity**: Low (but verify query plans first)

#### 17. Consolidate SELECT policies
- **Problem**: Multiple SELECT policies on same tables
- **Impact**: Confusion, maintenance burden
- **Proposal**: Keep most permissive policy, remove others
- **Risk if not fixed**: None
- **Complexity**: Low

#### 18. Add composite indexes for common patterns
- **Problem**: Single-column indexes might not cover common query patterns
- **Impact**: Suboptimal query performance
- **Proposal**: Add composite indexes for (finished, start_time), (is_active, updated_at), etc.
- **Risk if not fixed**: Slower queries at scale
- **Complexity**: Low

#### 19. Add `created_at` to all tables
- **Problem**: Some tables missing `created_at` timestamp
- **Impact**: No audit trail for when records were created
- **Proposal**: Add `created_at` with default to all tables
- **Risk if not fixed**: Limited audit capability
- **Complexity**: Low

#### 20. Add CHECK constraints for data integrity
- **Problem**: Missing CHECK constraints for ranges and formats
- **Impact**: Invalid data can be stored
- **Proposal**: Add CHECK for score ranges, group_name format, etc.
- **Risk if not fixed**: Data quality issues
- **Complexity**: Low

#### 21. Remove derived columns (if not performance-critical)
- **Problem**: Some columns can be computed from others
- **Impact**: Data redundancy, potential inconsistency
- **Proposal**: Evaluate and remove `predicted_winner`, `matches.winner`, `stage` in predictions/scores
- **Risk if not fixed**: None (if not performance-critical)
- **Complexity**: Medium (need to update queries)

#### 22. Document cache invalidation strategy
- **Problem**: No clear strategy for when to recalculate scores
- **Impact**: Stale data possible
- **Proposal**: Document triggers and manual recalculation processes
- **Risk if not fixed**: Stale data in production
- **Complexity**: Low

#### 23. Add constraints to ensure exactly one active rule
- **Problem**: Can have multiple active rules or none
- **Impact**: Unclear which rules apply
- **Proposal**: Add partial UNIQUE index on `is_active` where true
- **Risk if not fixed**: Confusion over scoring rules
- **Complexity**: Low

#### 24. Rename `rules` table
- **Problem**: Singular name inconsistent with other tables
- **Impact**: Minor inconsistency
- **Proposal**: Rename to `scoring_rules`
- **Risk if not fixed**: None (cosmetic)
- **Complexity**: Medium (requires migration)

---

### P3 - Comfort / Cleanup

#### 25. Add COMMENTS to all functions
- **Problem**: Functions lack documentation
- **Impact**: Harder to understand code
- **Proposal**: Add COMMENT ON FUNCTION for each function
- **Risk if not fixed**: Maintenance burden
- **Complexity**: Low

#### 26. Add COMMENTS to all complex views
- **Problem**: Complex views lack documentation
- **Impact**: Harder to understand logic
- **Proposal**: Add COMMENT ON VIEW for complex views
- **Risk if not fixed**: Maintenance burden
- **Complexity**: Low

#### 27. Move validation logic to application layer
- **Problem**: Business logic in database triggers
- **Impact**: Harder to test, less flexible
- **Proposal**: Move `validate_prediction` logic to TypeScript
- **Risk if not fixed**: Testing complexity
- **Complexity**: High

#### 28. Consider materialized views for caching
- **Problem**: Cache tables require manual invalidation
- **Impact**: Maintenance burden
- **Proposal**: Evaluate materialized views with refresh strategies
- **Risk if not fixed**: Maintenance burden
- **Complexity**: High

---

## 13. Safe Cleanup Candidates

### Can Be Removed With Low Risk

1. **`leaderboard_view`** - Documented as obsolete in AGENTS.md
   - Verification needed: Search codebase for references
   - Action: Remove if no references found

2. **Redundant indexes** (after verification):
   - `predictions_user_id_idx`
   - `predictions_match_id_idx`
   - `user_scores_user_id_idx`
   - `user_scores_match_id_idx`
   - `competition_leaderboard_user_id_idx`
   - Verification needed: Check EXPLAIN ANALYZE for queries
   - Action: Remove if query plans show they're not used

3. **Redundant SELECT policies**:
   - Duplicate SELECT policies on `matches`, `user_scores`, `users_profiles`
   - Verification needed: Confirm most permissive policy covers all cases
   - Action: Consolidate to single policy per table

### Requires Verification Before Removal

1. **`competition_predictions_with_users`** view
   - Status: No usage found in initial scan
   - Verification needed: Full codebase search
   - Action: Remove if truly unused

2. **`user_scores_computed_at_idx`**
   - Status: Unclear if used
   - Verification needed: Check query plans for time-based filters
   - Action: Remove if not used

### Should Be Refactored (Not Removed)

1. **`user_prediction_tracking`** view
   - Status: Too complex, fragile
   - Action: Refactor to simpler structure or move to application layer
   - Do not remove without replacement (used by admin UI)

### Should Be Clarified (Not Removed)

1. **`competition_visibility_settings`** table
   - Status: Design unclear (singleton vs per-user)
   - Action: Clarify design intent and document
   - Do not remove without understanding usage

---

## Conclusion

This database audit reveals a **functional but immature** schema with several critical security and integrity issues that should be addressed:

**Immediate Actions (P0)**:
1. Enable RLS on `competition_leaderboard`
2. Fix duplicate function definition
3. Plan migration for team FKs
4. Add missing UNIQUE constraints
5. Clarify singleton table design

**Short-term Actions (P1)**:
1. Standardize enum usage
2. Remove obsolete elements
3. Add version tracking to caches
4. Improve validation
5. Review security model

**Long-term Actions (P2-P3)**:
1. Remove redundancy
2. Improve documentation
3. Consider architectural changes (materialized views, logic layering)

The database is **production-ready only if P0 issues are addressed**. The current state poses security risks (missing RLS) and data integrity risks (missing constraints, weak referential integrity).

**Overall Assessment**: 6/10 - Functional but needs significant hardening for production use.
