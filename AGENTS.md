<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Leaderboard Architecture

## Data Flow

The leaderboard uses a single canonical source of truth:

1. **Storage Table**: `competition_leaderboard`
   - Stores competition scoring (group_points, knockout_points, total_points)
   - Stores rank evolution fields (previous_rank, current_rank, rank_delta)
   - Updated by `lib/scoring/recalculateCompetition.ts`

2. **Display View**: `leaderboard_detailed_view`
   - Joins `competition_leaderboard` with `user_scores` and `users_profiles`
   - Computes match statistics (exact_score_count, correct_predictions_count)
   - Exposes all fields needed for the leaderboard UI including rank fields
   - Used by `app/leaderboard/page.tsx`

3. **Recalculation Flow**:
   - Button click → `/api/recalculate-scores` → `recalculateCompetitionScores()`
   - Computes competition scores from predictions vs results
   - Upserts scores to `competition_leaderboard`
   - Fetches `leaderboard_detailed_view` to compute ranks using the same sorting criteria as the UI
   - Updates `competition_leaderboard` with rank fields (previous_rank, current_rank, rank_delta)

## Rank Evolution Implementation

Rank evolution is computed during score recalculation:

1. **Fetch old ranks**: Before updating, fetch current `current_rank` from `competition_leaderboard`
2. **Compute new ranks**: After upserting scores, fetch the full `leaderboard_detailed_view` and sort using the same logic as the UI:
   - `total_points DESC`
   - `exact_score_count DESC`
   - `email ASC`
3. **Assign ranks**: Assign ranks 1..N based on the sorted order
4. **Compute deltas**: `rank_delta = previous_rank - current_rank`
5. **Persist**: Update `competition_leaderboard` with the new rank fields

## Important: Sorting Consistency

The recalculation logic uses the same sorting criteria as the leaderboard page to ensure rank numbers match the displayed order. Any changes to the sorting logic in `app/leaderboard/page.tsx` must be mirrored in `lib/scoring/recalculateCompetition.ts`.

## Obsolete Views

- `leaderboard_view` is obsolete and not used by the leaderboard page
- The leaderboard page exclusively uses `leaderboard_detailed_view`
