export type MatchStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
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
  winner: KnockoutWinnerPick | null;
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

export type Team = {
  id: string;
  name: string;
  fifa_code: string | null;
  group_name: string | null;
  flag_url: string | null;
  created_at: string;
};

export type CompetitionPredictionsJson = {
  groups: Record<
    string,
    {
      first: string;
      second: string;
    }
  >;
  semi_finalists: string[];
  finalists: string[];
};

export type CompetitionPrediction = {
  id: string;
  user_id: string;
  predictions_json: CompetitionPredictionsJson;
  created_at: string;
  updated_at: string;
};

export type CompetitionResult = {
  id: string;
  stage: "groups" | "semi_final" | "final";
  group_name: string | null;
  team_id: string;
  position: number | null;
  updated_at: string;
};

export type CompetitionLeaderboardRow = {
  id: string;
  user_id: string;
  total_points: number;
  group_points: number;
  knockout_points: number;
  breakdown_json: Record<string, unknown> | null;
  updated_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  email: string;
  nickname: string | null;
  total_score: number;
};

export type LeaderboardDetailedRow = {
  user_id: string;
  email: string;
  nickname: string | null;
  total_points: number;
  match_points: number;
  competition_points: number;
  correct_predictions_count: number;
  exact_score_count: number;
  group_stage_points: number;
  knockout_points: number;
  display_rank?: number;
};

export type UserPredictionWithProfile = {
  user_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_winner: KnockoutWinnerPick | null;
  nickname: string | null;
  email: string;
  score: number | null;
};
