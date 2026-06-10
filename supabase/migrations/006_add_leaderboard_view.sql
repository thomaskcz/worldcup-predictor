create view public.leaderboard_view as
select
    up.id as user_id,
    up.email,
    up.nickname,
    COALESCE(sum(us.score), 0::bigint)::integer as match_points,
    COALESCE(cl.total_points, 0) as competition_points,
    (
        COALESCE(sum(us.score), 0::bigint) + COALESCE(cl.total_points, 0)
        )::integer as total_score
from
    users_profiles up
        left join user_scores us on us.user_id = up.id
        left join competition_leaderboard cl on cl.user_id = up.id
group by
    up.id,
    up.email,
    up.nickname,
    cl.total_points
order by
    (
        (
            COALESCE(sum(us.score), 0::bigint) + COALESCE(cl.total_points, 0)
            )::integer
        ) desc,
        up.nickname;