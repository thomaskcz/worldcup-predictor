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
                                winner text CHECK (winner IS NULL OR (winner = ANY (ARRAY['home'::text, 'away'::text]))),
                                CONSTRAINT matches_pkey PRIMARY KEY (id),
                                CONSTRAINT matches_external_id_unique UNIQUE (external_id)
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
                                                user_id uuid NOT NULL UNIQUE,
                                                predictions_json jsonb NOT NULL CHECK (jsonb_typeof(predictions_json) = 'object'::text),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT competition_predictions_pkey PRIMARY KEY (id),
  CONSTRAINT competition_predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.competition_results (
                                            id uuid NOT NULL DEFAULT gen_random_uuid(),
                                            stage text NOT NULL CHECK (stage = ANY (ARRAY['groups'::text, 'semi_final'::text, 'final'::text])),
                                            group_name text,
                                            team_id uuid NOT NULL,
                                            position integer CHECK ("position" >= 1),
                                            updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
                                            CONSTRAINT competition_results_pkey PRIMARY KEY (id),
                                            CONSTRAINT competition_results_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.competition_leaderboard (
                                                id uuid NOT NULL DEFAULT gen_random_uuid(),
                                                user_id uuid NOT NULL UNIQUE,
                                                total_points integer NOT NULL DEFAULT 0 CHECK (total_points >= 0),
                                                group_points integer NOT NULL DEFAULT 0 CHECK (group_points >= 0),
                                                knockout_points integer NOT NULL DEFAULT 0 CHECK (knockout_points >= 0),
                                                breakdown_json jsonb,
                                                updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
                                                CONSTRAINT competition_leaderboard_pkey PRIMARY KEY (id),
                                                CONSTRAINT competition_leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
                                                CONSTRAINT competition_leaderboard_total_points_sum_check CHECK (total_points = group_points + knockout_points)
);
CREATE TABLE public.competition_visibility_settings (
                                                        id uuid NOT NULL DEFAULT gen_random_uuid(),
                                                        show_group_predictions boolean NOT NULL DEFAULT false,
                                                        show_semi_predictions boolean NOT NULL DEFAULT false,
                                                        show_final_predictions boolean NOT NULL DEFAULT false,
                                                        updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
                                                        CONSTRAINT competition_visibility_settings_pkey PRIMARY KEY (id)
);
-- NOTE: This is a singleton global table - only one row should exist
-- Settings apply globally to all users
-- Only admins can modify (INSERT, UPDATE, DELETE) per RLS policies