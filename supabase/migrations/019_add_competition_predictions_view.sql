-- Create a view that combines user profiles, competition predictions, and leaderboard data
-- This allows efficient fetching of all required data for displaying other players' predictions

CREATE OR REPLACE VIEW public.competition_predictions_with_users AS
SELECT
  cp.user_id,
  up.nickname,
  up.email,
  cp.predictions_json,
  cl.group_points,
  cl.knockout_points,
  cl.total_points,
  cl.breakdown_json
FROM public.competition_predictions cp
LEFT JOIN public.users_profiles up ON cp.user_id = up.id
LEFT JOIN public.competition_leaderboard cl ON cp.user_id = cl.user_id;

-- Grant access to authenticated users
GRANT SELECT ON public.competition_predictions_with_users TO authenticated;
