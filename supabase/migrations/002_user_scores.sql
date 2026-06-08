-- =============================================================================
-- user_scores + leaderboard support
-- Run in Supabase SQL Editor after schema.sql
-- =============================================================================

create table if not exists public.user_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  score integer not null default 0,
  stage public.match_stage,
  breakdown_json jsonb,
  computed_at timestamptz not null default timezone('utc', now()),

  constraint user_scores_one_per_user_per_match unique (user_id, match_id),
  constraint user_scores_non_negative check (score >= 0)
);

create index if not exists user_scores_user_id_idx on public.user_scores (user_id);
create index if not exists user_scores_match_id_idx on public.user_scores (match_id);
create index if not exists user_scores_computed_at_idx on public.user_scores (computed_at);

comment on table public.user_scores is
  'Computed points per user per finished match. Idempotent via upsert on (user_id, match_id).';

-- Leaderboard aggregation view
create or replace view public.leaderboard_view as
select
  up.id as user_id,
  up.email,
  coalesce(sum(us.score), 0)::integer as total_score
from public.users_profiles as up
left join public.user_scores as us on us.user_id = up.id
group by up.id, up.email
order by total_score desc, up.email asc;

grant select on public.leaderboard_view to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.user_scores enable row level security;

create policy "Scores are publicly readable"
on public.user_scores
for select
to anon, authenticated
using (true);

-- Writes happen via service role (API recalculate) which bypasses RLS.

-- Allow public read of profiles for leaderboard emails
create policy "Profiles are publicly readable for leaderboard"
on public.users_profiles
for select
to anon, authenticated
using (true);

grant select on table public.user_scores to anon, authenticated;
