-- Add rank evolution tracking columns to competition_leaderboard
ALTER TABLE public.competition_leaderboard
ADD COLUMN IF NOT EXISTS previous_rank int,
ADD COLUMN IF NOT EXISTS current_rank int,
ADD COLUMN IF NOT EXISTS rank_delta int;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS competition_leaderboard_current_rank_idx ON public.competition_leaderboard(current_rank);
CREATE INDEX IF NOT EXISTS competition_leaderboard_rank_delta_idx ON public.competition_leaderboard(rank_delta);
