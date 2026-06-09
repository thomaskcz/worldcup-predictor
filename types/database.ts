export type MatchStage =
  | "group"
  | "round_of_16"
  | "round_of_8"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type KnockoutWinnerPick = "home" | "away";

export type UserProfile = {
  id: string;
  email: string;
  nickname: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type Match = {
  id: string;
  external_id: string | null;
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

export type UserScore = {
  id: string;
  user_id: string;
  match_id: string;
  score: number;
  stage: MatchStage | null;
  breakdown_json: Record<string, unknown> | null;
  computed_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  email: string;
  nickname: string | null;
  total_score: number;
};
