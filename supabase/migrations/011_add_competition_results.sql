-- Create competition_results table to store official results
-- Supports group stage, semi-finals, and finals

CREATE TABLE IF NOT EXISTS public.competition_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage text NOT NULL CHECK (stage IN ('groups', 'semi_final', 'final')),
  group_name text,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  position int CHECK (position >= 1),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS competition_results_stage_idx ON public.competition_results(stage);
CREATE INDEX IF NOT EXISTS competition_results_group_name_idx ON public.competition_results(group_name);
CREATE INDEX IF NOT EXISTS competition_results_team_id_idx ON public.competition_results(team_id);

-- Enable RLS: read for authenticated, write for service role only
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view competition results"
  ON public.competition_results
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage competition results"
  ON public.competition_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
