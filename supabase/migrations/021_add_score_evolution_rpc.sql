-- Add RPC function to get score evolution over time per user
CREATE OR REPLACE FUNCTION get_score_evolution()
RETURNS TABLE (
  nickname text,
  email text,
  user_id uuid,
  start_time timestamp with time zone,
  cumulative_score numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH ordered_matches AS (
  SELECT id, start_time
  FROM matches
  WHERE finished = true
  ORDER BY start_time ASC
),

scores AS (
  SELECT
    us.user_id,
    us.match_id,
    m.start_time,
    us.score
  FROM user_scores us
  JOIN matches m ON m.id = us.match_id
  WHERE m.finished = true
),

cumulative AS (
  SELECT
    user_id,
    start_time,
    SUM(score) OVER (
      PARTITION BY user_id
      ORDER BY start_time
    ) AS cumulative_score
  FROM scores
)

SELECT
  up.nickname,
  up.email,
  c.user_id,
  c.start_time,
  c.cumulative_score
FROM cumulative c
JOIN users_profiles up ON up.id = c.user_id
ORDER BY c.start_time ASC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_score_evolution() TO authenticated;
