-- View for tracking user prediction progress
-- Computes prediction continuity: how many consecutive matches each user has predicted from the start
CREATE OR REPLACE VIEW user_prediction_tracking AS
WITH ordered_matches AS (
  SELECT 
    id,
    home_team,
    away_team,
    start_time,
    ROW_NUMBER() OVER (ORDER BY start_time ASC) as match_order
  FROM matches
),
user_prediction_status AS (
  SELECT 
    up.id as user_id,
    up.nickname,
    up.email,
    om.id as match_id,
    om.home_team,
    om.away_team,
    om.start_time,
    om.match_order,
    CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END as has_prediction
  FROM users_profiles up
  CROSS JOIN ordered_matches om
  LEFT JOIN predictions p ON p.user_id = up.id AND p.match_id = om.id
),
first_gap_per_user AS (
  SELECT 
    user_id,
    MIN(match_order) as first_gap_order
  FROM user_prediction_status
  WHERE has_prediction = 0
  GROUP BY user_id
),
user_continuity_metrics AS (
  SELECT 
    up.id as user_id,
    up.nickname,
    up.email,
    -- If no gap, count all matches; otherwise count matches before first gap
    CASE 
      WHEN fg.first_gap_order IS NULL THEN (SELECT COUNT(*) FROM ordered_matches)
      ELSE fg.first_gap_order - 1
    END as continuous_predictions_count,
    CASE 
      WHEN fg.first_gap_order IS NULL THEN (SELECT COUNT(*) FROM ordered_matches)
      ELSE fg.first_gap_order - 1
    END as last_continuous_match_order
  FROM users_profiles up
  LEFT JOIN first_gap_per_user fg ON fg.user_id = up.id
),
last_continuous_match_details AS (
  SELECT 
    ucm.user_id,
    om.home_team,
    om.away_team,
    om.start_time
  FROM user_continuity_metrics ucm
  LEFT JOIN ordered_matches om ON om.match_order = ucm.last_continuous_match_order
)
SELECT 
  ucm.user_id,
  ucm.nickname,
  ucm.email,
  CASE WHEN cp.id IS NOT NULL THEN true ELSE false END as has_competition_predictions,
  ucm.continuous_predictions_count,
  lcm.home_team as last_continuous_home_team,
  lcm.away_team as last_continuous_away_team,
  lcm.start_time as last_continuous_start_time,
  (SELECT COUNT(*) FROM predictions p WHERE p.user_id = ucm.user_id) as total_predictions
FROM user_continuity_metrics ucm
LEFT JOIN last_continuous_match_details lcm ON lcm.user_id = ucm.user_id
LEFT JOIN competition_predictions cp ON cp.user_id = ucm.user_id
ORDER BY 
  ucm.continuous_predictions_count ASC,
  ucm.nickname ASC;
