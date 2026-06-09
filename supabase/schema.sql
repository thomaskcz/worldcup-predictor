-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  nickname text UNIQUE,
  CONSTRAINT users_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT users_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_score integer,
  away_score integer,
  start_time timestamp with time zone NOT NULL,
  stage USER-DEFINED NOT NULL,
  finished boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  external_id text,
  CONSTRAINT matches_pkey PRIMARY KEY (id)
);
CREATE TABLE public.predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL,
  predicted_home_score integer NOT NULL,
  predicted_away_score integer NOT NULL,
  predicted_winner USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT predictions_pkey PRIMARY KEY (id),
  CONSTRAINT predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT predictions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);
CREATE TABLE public.rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  rules_json jsonb NOT NULL CHECK (jsonb_typeof(rules_json) = 'object'::text),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  stage USER-DEFINED,
  breakdown_json jsonb,
  computed_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_scores_pkey PRIMARY KEY (id),
  CONSTRAINT user_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_scores_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id)
);

CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fifa_code text UNIQUE,
  group_name text NOT NULL,
  flag_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);

CREATE TABLE public.competition_predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  predictions_json jsonb NOT NULL CHECK (jsonb_typeof(predictions_json) = 'object'::text),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT competition_predictions_pkey PRIMARY KEY (id),
  CONSTRAINT competition_predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT competition_predictions_one_per_user UNIQUE (user_id)
);