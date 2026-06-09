-- Create teams table and competition_predictions table with RLS policies

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fifa_code text UNIQUE,
  group_name text NOT NULL,
  flag_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS teams_group_name_idx ON public.teams(group_name);

GRANT SELECT ON public.teams TO anon;
GRANT SELECT ON public.teams TO authenticated;

CREATE TABLE IF NOT EXISTS public.competition_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  predictions_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT competition_predictions_one_per_user UNIQUE (user_id)
);

ALTER TABLE public.competition_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own competition predictions"
  ON public.competition_predictions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own competition predictions"
  ON public.competition_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own competition predictions"
  ON public.competition_predictions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own competition predictions"
  ON public.competition_predictions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
