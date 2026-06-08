export type MatchStage =
  | "group"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type KnockoutWinnerPick = "home" | "away";

export type Match = {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  start_time: string;
  stage: MatchStage;
  finished: boolean;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_winner: KnockoutWinnerPick | null;
  created_at: string;
};
