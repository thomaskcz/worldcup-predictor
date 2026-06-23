-- Add RPC function to get ranking evolution over time per user
-- Computes rank at each timestamp based on cumulative scores
CREATE OR REPLACE FUNCTION get_rank_evolution()
RETURNS TABLE (
  nickname text,
  email text,
  user_id uuid,
  start_time timestamp with time zone,
  rank integer
)
LANGUAGE sql
SECURITY INVOKER
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
),

ranked AS (
  SELECT
    c.user_id,
    c.start_time,
    c.cumulative_score,
    RANK() OVER (
      PARTITION BY c.start_time
      ORDER BY c.cumulative_score DESC
    ) AS rank
  FROM cumulative c
)

SELECT
  up.nickname,
  up.email,
  r.user_id,
  r.start_time,
  r.rank
FROM ranked r
JOIN users_profiles up ON up.id = r.user_id
ORDER BY r.start_time ASC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_rank_evolution() TO authenticated;
