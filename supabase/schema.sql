-- =============================================================================
-- World Cup Predictor — Supabase schema
-- Paste into Supabase SQL Editor and run as a single script.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Custom types
-- -----------------------------------------------------------------------------

create type public.match_stage as enum (
  'group',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final'
);

create type public.knockout_winner_pick as enum (
  'home',
  'away'
);

-- -----------------------------------------------------------------------------
-- Utility: updated_at trigger
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. users_profiles
-- -----------------------------------------------------------------------------

create table public.users_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger users_profiles_set_updated_at
before update on public.users_profiles
for each row
execute function public.set_updated_at();

comment on table public.users_profiles is
  'Minimal profile extension for auth.users. is_admin gates match/rule writes.';

-- Admin check (must be created after users_profiles exists)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select up.is_admin
      from public.users_profiles as up
      where up.id = auth.uid()
    ),
    false
  );
$$;

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. matches
-- -----------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  home_score integer,
  away_score integer,
  start_time timestamptz not null,
  stage public.match_stage not null,
  finished boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint matches_teams_distinct check (home_team <> away_team),
  constraint matches_scores_non_negative check (
    (home_score is null or home_score >= 0)
    and (away_score is null or away_score >= 0)
  ),
  constraint matches_finished_requires_scores check (
    finished = false
    or (home_score is not null and away_score is not null)
  )
);

create trigger matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

create index matches_start_time_idx on public.matches (start_time);
create index matches_stage_idx on public.matches (stage);
create index matches_finished_idx on public.matches (finished);

comment on table public.matches is
  'Tournament matches. Results are nullable until the match is finished.';

-- -----------------------------------------------------------------------------
-- 3. predictions
-- -----------------------------------------------------------------------------

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_home_score integer not null,
  predicted_away_score integer not null,
  predicted_winner public.knockout_winner_pick,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint predictions_one_per_user_per_match unique (user_id, match_id),
  constraint predictions_scores_non_negative check (
    predicted_home_score >= 0
    and predicted_away_score >= 0
  )
);

create trigger predictions_set_updated_at
before update on public.predictions
for each row
execute function public.set_updated_at();

create index predictions_user_id_idx on public.predictions (user_id);
create index predictions_match_id_idx on public.predictions (match_id);

comment on column public.predictions.predicted_winner is
  'Required when predicting a draw in knockout stages (home/away winner pick).';

-- Enforce knockout draw winner rule + prediction deadline
create or replace function public.validate_prediction()
returns trigger
language plpgsql
as $$
declare
  match_record public.matches%rowtype;
begin
  select *
  into match_record
  from public.matches
  where id = new.match_id;

  if not found then
    raise exception 'Match % does not exist', new.match_id;
  end if;

  if match_record.finished then
    raise exception 'Cannot predict a finished match';
  end if;

  if match_record.start_time <= timezone('utc', now()) then
    raise exception 'Prediction deadline has passed for this match';
  end if;

  if
    match_record.stage <> 'group'
    and new.predicted_home_score = new.predicted_away_score
    and new.predicted_winner is null
  then
    raise exception 'predicted_winner is required for knockout draw predictions';
  end if;

  if
    match_record.stage = 'group'
    and new.predicted_winner is not null
  then
    raise exception 'predicted_winner must be null for group-stage matches';
  end if;

  return new;
end;
$$;

create trigger predictions_validate_before_insert
before insert on public.predictions
for each row
execute function public.validate_prediction();

create trigger predictions_validate_before_update
before update on public.predictions
for each row
execute function public.validate_prediction();

comment on table public.predictions is
  'One prediction per user per match. Deadline enforced at match start_time.';

-- -----------------------------------------------------------------------------
-- 4. rules (dynamic scoring engine)
-- -----------------------------------------------------------------------------

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rules_json jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint rules_json_is_object check (jsonb_typeof(rules_json) = 'object')
);

create trigger rules_set_updated_at
before update on public.rules
for each row
execute function public.set_updated_at();

create index rules_is_active_idx on public.rules (is_active);

comment on table public.rules is
  'Versioned scoring rules stored as JSONB. Update JSON without schema migrations.';

-- Seed competition rules
insert into public.rules (name, rules_json, is_active)
values (
  'Coupe du Monde Pronostics',
  '{
    "competition": "Coupe du Monde Pronostics",
    "rules": {
      "pre_tournament_predictions": {
        "group_stage": {
          "first_place_correct": 3,
          "second_place_correct": 2,
          "qualified_wrong_position": 1
        },
        "knockout_forecast": {
          "semi_finalists_per_team": 5,
          "final": {
            "one_team_correct": 10,
            "two_teams_correct": 25
          }
        }
      },
      "match_predictions": {
        "group_stage": {
          "correct_1N2": 3,
          "exact_score_per_team_if_correct_1N2": 2,
          "incorrect_1N2": 0,
          "exact_score_per_team_if_wrong_1N2": 1
        },
        "round_of_16": {
          "correct_1N2": 5,
          "exact_score_per_team_if_correct_1N2": 3,
          "correct_qualified_bonus": 2
        },
        "quarter_finals": {
          "correct_1N2": 10,
          "exact_score_per_team_if_correct_1N2": 5,
          "correct_qualified_bonus": 4
        },
        "semi_finals_and_third_place": {
          "correct_1N2": 20,
          "exact_score_per_team_if_correct_1N2": 6,
          "correct_qualified_bonus": 6
        },
        "final": {
          "correct_1N2": 30,
          "exact_score_per_team_if_correct_1N2": 12,
          "correct_qualified_bonus": 10
        }
      },
      "special_rules": {
        "knockout_draw_prediction_requires_winner": true
      }
    }
  }'::jsonb,
  true
);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.users_profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.rules enable row level security;

-- users_profiles
create policy "Users can read own profile"
on public.users_profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.users_profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.users_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- matches (public read, admin write)
create policy "Matches are publicly readable"
on public.matches
for select
to anon, authenticated
using (true);

create policy "Admins can insert matches"
on public.matches
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update matches"
on public.matches
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete matches"
on public.matches
for delete
to authenticated
using (public.is_admin());

-- predictions (own rows only)
create policy "Users can read own predictions"
on public.predictions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own predictions"
on public.predictions
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own predictions"
on public.predictions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own predictions"
on public.predictions
for delete
to authenticated
using (auth.uid() = user_id);

-- rules (public read, admin write)
create policy "Rules are publicly readable"
on public.rules
for select
to anon, authenticated
using (true);

create policy "Admins can insert rules"
on public.rules
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update rules"
on public.rules
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete rules"
on public.rules
for delete
to authenticated
using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on table public.users_profiles to authenticated;
grant insert, update on table public.users_profiles to authenticated;

grant select on table public.matches to anon, authenticated;
grant insert, update, delete on table public.matches to authenticated;

grant select, insert, update, delete on table public.predictions to authenticated;

grant select on table public.rules to anon, authenticated;
grant insert, update, delete on table public.rules to authenticated;

-- -----------------------------------------------------------------------------
-- Leaderboard note
-- -----------------------------------------------------------------------------
-- Score aggregation will join predictions + matches and read rules_json.
-- Because predictions RLS hides other users' rows from clients, compute
-- leaderboard server-side (Edge Function / service role) or add a dedicated
-- leaderboard table updated by a trusted backend job.
