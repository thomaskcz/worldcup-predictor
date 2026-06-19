-- Create competition_visibility_settings table for controlling visibility of other players' competition predictions
CREATE TABLE IF NOT EXISTS public.competition_visibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_group_predictions boolean NOT NULL DEFAULT false,
  show_semi_predictions boolean NOT NULL DEFAULT false,
  show_final_predictions boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Insert default row (only one row should exist)
INSERT INTO public.competition_visibility_settings (id, show_group_predictions, show_semi_predictions, show_final_predictions)
VALUES (gen_random_uuid(), false, false, false)
ON CONFLICT DO NOTHING;

-- Grant access to authenticated users (read-only for non-admins)
GRANT SELECT ON public.competition_visibility_settings TO authenticated;

-- Grant all permissions to service role (for admin operations)
GRANT ALL ON public.competition_visibility_settings TO service_role;

-- Add RLS policies
ALTER TABLE public.competition_visibility_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read visibility settings
CREATE POLICY "Authenticated users can read visibility settings"
  ON public.competition_visibility_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can update visibility settings
CREATE POLICY "Only admins can update visibility settings"
  ON public.competition_visibility_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
