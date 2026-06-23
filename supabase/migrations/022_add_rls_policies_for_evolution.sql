-- Enable RLS on tables used by get_score_evolution RPC if not already enabled
-- and add SELECT policies for authenticated users

-- Matches table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view matches"
  ON matches
  FOR SELECT
  TO authenticated
  USING (true);

-- User scores table
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user scores"
  ON user_scores
  FOR SELECT
  TO authenticated
  USING (true);

-- Users profiles table
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user profiles"
  ON users_profiles
  FOR SELECT
  TO authenticated
  USING (true);
