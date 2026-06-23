create view public.competition_predictions_with_users as
select
    cp.user_id,
    up.nickname,
    up.email,
    cp.predictions_json,
    cl.group_points,
    cl.knockout_points,
    cl.total_points,
    cl.breakdown_json
from
    competition_predictions cp
        left join users_profiles up on cp.user_id = up.id
        left join competition_leaderboard cl on cp.user_id = cl.user_id;


create view public.leaderboard_detailed_view as
with
    match_stats as (
        select
            p.user_id,
            count(*) filter (
        where
          p.predicted_home_score = m.home_score
          and p.predicted_away_score = m.away_score
      ) as exact_score_count,
            count(*) filter (
        where
          p.predicted_home_score > p.predicted_away_score
          and m.home_score > m.away_score
          or p.predicted_home_score < p.predicted_away_score
          and m.home_score < m.away_score
          or p.predicted_home_score = p.predicted_away_score
          and m.home_score = m.away_score
      ) as correct_predictions_count
        from
            predictions p
                join matches m on p.match_id = m.id
        where
            m.finished = true
        group by
            p.user_id
    )
select
    u.id as user_id,
    u.email,
    u.nickname,
    COALESCE(sum(us.score), 0::bigint) + COALESCE(cl.total_points, 0) as total_points,
    COALESCE(sum(us.score), 0::bigint) as match_points,
    COALESCE(cl.group_points, 0) + COALESCE(cl.knockout_points, 0) as competition_points,
    COALESCE(ms.correct_predictions_count, 0::bigint) as correct_predictions_count,
    COALESCE(ms.exact_score_count, 0::bigint) as exact_score_count,
    COALESCE(cl.group_points, 0) as group_stage_points,
    COALESCE(cl.knockout_points, 0) as knockout_points
from
    users_profiles u
        left join user_scores us on u.id = us.user_id
        left join competition_leaderboard cl on u.id = cl.user_id
        left join match_stats ms on u.id = ms.user_id
group by
    u.id,
    u.email,
    u.nickname,
    cl.total_points,
    cl.group_points,
    cl.knockout_points,
    ms.correct_predictions_count,
    ms.exact_score_count;


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


create view public.user_prediction_tracking as
with
    ordered_matches as (
        select
            matches.id,
            matches.home_team,
            matches.away_team,
            matches.start_time,
            row_number() over (
        order by
          matches.start_time
      ) as match_order
        from
            matches
        where
            matches.finished = false
          and matches.start_time > now()
    ),
    user_prediction_status as (
        select
            up.id as user_id,
            up.nickname,
            up.email,
            om.id as match_id,
            om.home_team,
            om.away_team,
            om.start_time,
            om.match_order,
            case
                when p.id is not null then 1
                else 0
                end as has_prediction
        from
            users_profiles up
                cross join ordered_matches om
                left join predictions p on p.user_id = up.id
                and p.match_id = om.id
    ),
    first_gap_per_user as (
        select
            user_prediction_status.user_id,
            min(user_prediction_status.match_order) as first_gap_order
        from
            user_prediction_status
        where
            user_prediction_status.has_prediction = 0
        group by
            user_prediction_status.user_id
    ),
    user_continuity_metrics as (
        select
            up.id as user_id,
            up.nickname,
            up.email,
            case
                when fg.first_gap_order is null then (
                    select
                        count(*) as count
    from
    ordered_matches
)
    else fg.first_gap_order - 1
end as continuous_predictions_count,
      case
        when fg.first_gap_order is null then (
          select
            count(*) as count
          from
            ordered_matches
        )
        else fg.first_gap_order - 1
end as last_continuous_match_order
    from
      users_profiles up
      left join first_gap_per_user fg on fg.user_id = up.id
  ),
  last_continuous_match_details as (
    select
      ucm_1.user_id,
      om.home_team,
      om.away_team,
      om.start_time
    from
      user_continuity_metrics ucm_1
      left join ordered_matches om on om.match_order = ucm_1.last_continuous_match_order
  )
select
    ucm.user_id,
    ucm.nickname,
    ucm.email,
    case
        when cp.id is not null then true
        else false
        end as has_competition_predictions,
    ucm.continuous_predictions_count,
    lcm.home_team as last_continuous_home_team,
    lcm.away_team as last_continuous_away_team,
    lcm.start_time as last_continuous_start_time,
    (
        select
            count(*) as count
from
    predictions p
where
    p.user_id = ucm.user_id
    ) as total_predictions
from
    user_continuity_metrics ucm
    left join last_continuous_match_details lcm on lcm.user_id = ucm.user_id
    left join competition_predictions cp on cp.user_id = ucm.user_id
order by
    ucm.continuous_predictions_count,
    ucm.nickname;