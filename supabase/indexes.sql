-- =========================
-- MATCHES
-- =========================

CREATE INDEX matches_external_id_idx
    ON public.matches (external_id);

CREATE INDEX matches_finished_idx
    ON public.matches (finished);

CREATE INDEX matches_stage_idx
    ON public.matches (stage);

CREATE INDEX matches_start_time_idx
    ON public.matches (start_time);


-- =========================
-- PREDICTIONS
-- =========================

CREATE INDEX predictions_user_id_idx
    ON public.predictions (user_id);

CREATE INDEX predictions_match_id_idx
    ON public.predictions (match_id);

-- déjà couvert par UNIQUE (user_id, match_id ? non dans ce schema donc OK)
CREATE UNIQUE INDEX predictions_one_per_user_per_match
    ON public.predictions (user_id, match_id);


-- =========================
-- USER_SCORES
-- =========================

CREATE INDEX user_scores_user_id_idx
    ON public.user_scores (user_id);

CREATE INDEX user_scores_match_id_idx
    ON public.user_scores (match_id);

CREATE INDEX user_scores_computed_at_idx
    ON public.user_scores (computed_at);

-- optionnel mais souvent utile pour leaderboard recalculation
CREATE UNIQUE INDEX user_scores_one_per_user_per_match
    ON public.user_scores (user_id, match_id);


-- =========================
-- TEAMS
-- =========================

CREATE INDEX teams_group_name_idx
    ON public.teams (group_name);


-- =========================
-- COMPETITION_RESULTS
-- =========================

CREATE INDEX competition_results_group_name_idx
    ON public.competition_results (group_name);

CREATE INDEX competition_results_stage_idx
    ON public.competition_results (stage);

CREATE INDEX competition_results_team_id_idx
    ON public.competition_results (team_id);


-- =========================
-- COMPETITION_LEADERBOARD
-- =========================

CREATE INDEX competition_leaderboard_total_points_idx
    ON public.competition_leaderboard (total_points);

CREATE INDEX competition_leaderboard_user_id_idx
    ON public.competition_leaderboard (user_id);


-- =========================
-- RULES
-- =========================

CREATE INDEX rules_is_active_idx
    ON public.rules (is_active);