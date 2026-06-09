-- Update leaderboard_view to include nickname
create or replace view public.leaderboard_view as
select
  up.id as user_id,
  up.email,
  up.nickname,
  coalesce(sum(us.score), 0)::integer as total_score
from public.users_profiles as up
left join public.user_scores as us on us.user_id = up.id
group by up.id, up.email, up.nickname
order by total_score desc, up.email asc;

grant select on public.leaderboard_view to anon, authenticated;
