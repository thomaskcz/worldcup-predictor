CREATE OR REPLACE VIEW public.leaderboard_detailed_view AS
WITH match_stats AS (
    SELECT
        p.user_id,
        COUNT(*) FILTER (
            WHERE p.predicted_home_score = m.home_score
            AND p.predicted_away_score = m.away_score
        ) AS exact_score_count,
        COUNT(*) FILTER (
            WHERE (p.predicted_home_score > p.predicted_away_score AND m.home_score > m.away_score)
            OR (p.predicted_home_score < p.predicted_away_score AND m.home_score < m.away_score)
            OR (p.predicted_home_score = p.predicted_away_score AND m.home_score = m.away_score)
        ) AS correct_predictions_count
    FROM
        public.predictions p
    JOIN
        public.matches m ON p.match_id = m.id
    WHERE
        m.finished = true
    GROUP BY
        p.user_id
)
SELECT
    u.id AS user_id,
    u.email,
    u.nickname,
    COALESCE(SUM(us.score), 0) + COALESCE(cl.total_points, 0) AS total_points,
    COALESCE(SUM(us.score), 0) AS match_points,
    COALESCE(cl.group_points, 0) + COALESCE(cl.knockout_points, 0) AS competition_points,
    COALESCE(ms.correct_predictions_count, 0) AS correct_predictions_count,
    COALESCE(ms.exact_score_count, 0) AS exact_score_count,
    COALESCE(cl.group_points, 0) AS group_stage_points,
    COALESCE(cl.knockout_points, 0) AS knockout_points
FROM
    public.users_profiles u
LEFT JOIN
    public.user_scores us ON u.id = us.user_id
LEFT JOIN
    public.competition_leaderboard cl ON u.id = cl.user_id
LEFT JOIN
    match_stats ms ON u.id = ms.user_id
GROUP BY
    u.id, u.email, u.nickname, cl.total_points, cl.group_points, cl.knockout_points, ms.correct_predictions_count, ms.exact_score_count;
