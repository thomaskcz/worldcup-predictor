-- Create competition_leaderboard table for storing computed competition scores
CREATE TABLE IF NOT EXISTS public.competition_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points int NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  group_points int NOT NULL DEFAULT 0 CHECK (group_points >= 0),
  knockout_points int NOT NULL DEFAULT 0 CHECK (knockout_points >= 0),
  breakdown_json jsonb,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS competition_leaderboard_user_id_idx ON public.competition_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS competition_leaderboard_total_points_idx ON public.competition_leaderboard(total_points);

-- Grant access
GRANT SELECT ON public.competition_leaderboard TO authenticated;
