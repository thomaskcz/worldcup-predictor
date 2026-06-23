<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Leaderboard Architecture

## Data Flow

The leaderboard uses a single canonical source of truth:

1. **Storage Table**: `competition_leaderboard`
   - Stores competition scoring (group_points, knockout_points, total_points)
   - Updated by `lib/scoring/recalculateCompetition.ts`

2. **Display View**: `leaderboard_detailed_view`
   - Joins `competition_leaderboard` with `user_scores` and `users_profiles`
   - Computes match statistics (exact_score_count, correct_predictions_count)
   - Exposes all fields needed for the leaderboard UI
   - Used by `app/leaderboard/page.tsx`

3. **Recalculation Flow**:
   - Button click → `/api/recalculate-scores` → `recalculateCompetitionScores()`
   - Computes competition scores from predictions vs results
   - Upserts scores to `competition_leaderboard`

## Important: Sorting Consistency

The leaderboard page computes ranks dynamically based on the sorted order using these criteria:
- `total_points DESC`
- `exact_score_count DESC`
- `email ASC`

Any changes to the sorting logic in `app/leaderboard/page.tsx` must maintain this order for consistency.

## Obsolete Views

- `leaderboard_view` is obsolete and not used by the leaderboard page
- The leaderboard page exclusively uses `leaderboard_detailed_view`
