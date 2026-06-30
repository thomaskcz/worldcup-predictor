export type GroupStageRules = {
  correct_1N2: number;
  exact_score_per_team_if_correct_1N2: number;
  incorrect_1N2: number;
  exact_score_per_team_if_wrong_1N2: number;
};

export type KnockoutStageRules = {
  correct_1N2: number;
  exact_score_per_team_if_correct_1N2: number;
  incorrect_1N2: number;
  exact_score_per_team_if_wrong_1N2: number;
  correct_qualified_bonus: number;
};

export type MatchPredictionsRules = {
  group_stage: GroupStageRules;
  round_of_32: KnockoutStageRules;
  round_of_16: KnockoutStageRules;
  quarter_finals: KnockoutStageRules;
  semi_finals_and_third_place: KnockoutStageRules;
  final: KnockoutStageRules;
};

export type PreTournamentGroupStageRules = {
  first_place_correct: number;
  second_place_correct: number;
  qualified_wrong_position: number;
};

export type PreTournamentFinalForecastRules = {
  one_team_correct: number;
  two_teams_correct: number;
};

export type PreTournamentKnockoutForecastRules = {
  semi_finalists_per_team: number;
  final: PreTournamentFinalForecastRules;
};

export type PreTournamentPredictionsRules = {
  deadline: string;
  group_stage: PreTournamentGroupStageRules;
  knockout_forecast: PreTournamentKnockoutForecastRules;
};

export type SpecialRules = Record<string, string>;

export type RulesConfig = {
  competition: string;
  rules: {
    pre_tournament_predictions: PreTournamentPredictionsRules;
    match_predictions: {
      deadline: string;
      score_basis: string;
      stages: MatchPredictionsRules;
    };
    special_rules: SpecialRules;
  };
};

export type CompetitionRulesJson = {
  competition: string;
  rules: {
    pre_tournament_predictions: Record<string, unknown>;
    match_predictions: MatchPredictionsRules;
    special_rules: {
      knockout_draw_prediction_requires_winner: boolean;
    };
  };
};

export type ScoreBreakdown = {
  base: number;
  home_exact_bonus: number;
  away_exact_bonus: number;
  qualified_bonus: number;
  outcome: "home" | "draw" | "away";
  predicted_outcome: "home" | "draw" | "away";
  correct_outcome: boolean;
  skipped_reason?: string;
};
