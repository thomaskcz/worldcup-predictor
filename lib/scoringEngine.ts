import type { KnockoutWinnerPick, Match, MatchStage, Prediction } from "@/types/database";
import type {
  CompetitionRulesJson,
  GroupStageRules,
  KnockoutStageRules,
  ScoreBreakdown,
} from "@/types/rules";

type Outcome = "home" | "draw" | "away";

export function getOutcome(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) {
    return "home";
  }

  if (awayScore > homeScore) {
    return "away";
  }

  return "draw";
}

export function getQualifier(
  homeScore: number,
  awayScore: number
): KnockoutWinnerPick | null {
  if (homeScore > awayScore) {
    return "home";
  }

  if (awayScore > homeScore) {
    return "away";
  }

  return null;
}

function getPredictedQualifier(
  prediction: Prediction,
  stage: MatchStage
): KnockoutWinnerPick | null {
  if (prediction.predicted_home_score > prediction.predicted_away_score) {
    return "home";
  }

  if (prediction.predicted_away_score > prediction.predicted_home_score) {
    return "away";
  }

  if (stage === "group") {
    return null;
  }

  return prediction.predicted_winner;
}

function getRulesKeyForStage(stage: MatchStage): keyof CompetitionRulesJson["rules"]["match_predictions"] {
  switch (stage) {
    case "group":
      return "group_stage";
    case "round_of_32":
      return "round_of_32";
    case "round_of_16":
      return "round_of_16";
    case "quarter_final":
      return "quarter_finals";
    case "semi_final":
    case "third_place":
      return "semi_finals_and_third_place";
    case "final":
      return "final";
  }
}

function emptyBreakdown(
  outcome: Outcome,
  predictedOutcome: Outcome,
  skippedReason?: string
): ScoreBreakdown {
  return {
    base: 0,
    home_exact_bonus: 0,
    away_exact_bonus: 0,
    qualified_bonus: 0,
    outcome,
    predicted_outcome: predictedOutcome,
    correct_outcome: false,
    skipped_reason: skippedReason,
  };
}

function scoreGroupStage(
  match: Match,
  prediction: Prediction,
  rules: GroupStageRules
): { score: number; breakdown: ScoreBreakdown } {
  const homeScore = match.home_score!;
  const awayScore = match.away_score!;
  const outcome = getOutcome(homeScore, awayScore);
  const predictedOutcome = getOutcome(
    prediction.predicted_home_score,
    prediction.predicted_away_score
  );

  const homeExact = homeScore === prediction.predicted_home_score;
  const awayExact = awayScore === prediction.predicted_away_score;
  const correctOutcome = outcome === predictedOutcome;

  if (correctOutcome) {
    const breakdown: ScoreBreakdown = {
      base: rules.correct_1N2,
      home_exact_bonus: homeExact
        ? rules.exact_score_per_team_if_correct_1N2
        : 0,
      away_exact_bonus: awayExact
        ? rules.exact_score_per_team_if_correct_1N2
        : 0,
      qualified_bonus: 0,
      outcome,
      predicted_outcome: predictedOutcome,
      correct_outcome: true,
    };

    return {
      score:
        breakdown.base +
        breakdown.home_exact_bonus +
        breakdown.away_exact_bonus,
      breakdown,
    };
  }

  const breakdown: ScoreBreakdown = {
    base: rules.incorrect_1N2,
    home_exact_bonus: homeExact
      ? rules.exact_score_per_team_if_wrong_1N2
      : 0,
    away_exact_bonus: awayExact ? rules.exact_score_per_team_if_wrong_1N2 : 0,
    qualified_bonus: 0,
    outcome,
    predicted_outcome: predictedOutcome,
    correct_outcome: false,
  };

  return {
    score:
      breakdown.base + breakdown.home_exact_bonus + breakdown.away_exact_bonus,
    breakdown,
  };
}

function scoreKnockoutStage(
  match: Match,
  prediction: Prediction,
  rules: KnockoutStageRules,
  specialRules: CompetitionRulesJson["rules"]["special_rules"]
): { score: number; breakdown: ScoreBreakdown } {
  const homeScore = match.home_score!;
  const awayScore = match.away_score!;
  const outcome = getOutcome(homeScore, awayScore);

  // In knockout, predicted outcome should be based on predicted qualifier if score is draw
  let predictedOutcome = getOutcome(
    prediction.predicted_home_score,
    prediction.predicted_away_score
  );

  const actualQualifier = getQualifier(homeScore, awayScore);
  const predictedQualifier = getPredictedQualifier(prediction, match.stage);

  // If prediction is a draw with a winner pick, use the winner as the predicted outcome
  if (predictedOutcome === "draw" && predictedQualifier) {
    predictedOutcome = predictedQualifier === "home" ? "home" : "away";
  }

  if (actualQualifier === null) {
    return {
      score: 0,
      breakdown: emptyBreakdown(
        outcome,
        predictedOutcome,
        "Knockout draw result requires a stored winner (unequal final score)."
      ),
    };
  }

  if (
    specialRules.knockout_draw_prediction_requires_winner &&
    predictedOutcome === "draw" &&
    !prediction.predicted_winner
  ) {
    return {
      score: 0,
      breakdown: emptyBreakdown(
        outcome,
        predictedOutcome,
        "Knockout draw prediction missing winner pick."
      ),
    };
  }

  if (predictedQualifier === null || predictedQualifier !== actualQualifier) {
    return {
      score: 0,
      breakdown: emptyBreakdown(outcome, predictedOutcome),
    };
  }

  const homeExact = homeScore === prediction.predicted_home_score;
  const awayExact = awayScore === prediction.predicted_away_score;

  // In knockout, we only give points for correct qualifier, not for "correct 1N2" based on scores
  // The base points (correct_1N2) should only be given if the score-based prediction was actually correct
  const scoreBasedOutcomeCorrect = outcome === getOutcome(
    prediction.predicted_home_score,
    prediction.predicted_away_score
  );

  // Use the appropriate exact score rule based on whether the score-based outcome was correct
  // If the wrong_1N2 rule doesn't exist (for backward compatibility), use the correct_1N2 rule
  const exactScoreRule = scoreBasedOutcomeCorrect
    ? rules.exact_score_per_team_if_correct_1N2
    : (rules.exact_score_per_team_if_wrong_1N2 || rules.exact_score_per_team_if_correct_1N2);

  const breakdown: ScoreBreakdown = {
    base: scoreBasedOutcomeCorrect ? rules.correct_1N2 : 0,
    home_exact_bonus: homeExact ? exactScoreRule : 0,
    away_exact_bonus: awayExact ? exactScoreRule : 0,
    qualified_bonus: rules.correct_qualified_bonus,
    outcome,
    predicted_outcome: predictedOutcome,
    correct_outcome: scoreBasedOutcomeCorrect,
  };

  return {
    score:
      breakdown.base +
      breakdown.home_exact_bonus +
      breakdown.away_exact_bonus +
      breakdown.qualified_bonus,
    breakdown,
  };
}

export function computePredictionScore(
  match: Match,
  prediction: Prediction,
  rulesJson: CompetitionRulesJson
): { score: number; breakdown: ScoreBreakdown } {
  if (!match.finished || match.home_score === null || match.away_score === null) {
    return {
      score: 0,
      breakdown: emptyBreakdown("draw", "draw", "Match is not finished."),
    };
  }

  const rulesKey = getRulesKeyForStage(match.stage);

  // Handle both old structure (with stages) and new structure (direct)
  const matchPredictions = rulesJson.rules.match_predictions as any;
  const stageRules = matchPredictions.stages
    ? matchPredictions.stages[rulesKey]
    : matchPredictions[rulesKey];

  if (!stageRules) {
    throw new Error(`No rules found for stage: ${match.stage}, rulesKey: ${rulesKey}`);
  }

  const specialRules = rulesJson.rules.special_rules as any;

  if (match.stage === "group") {
    return scoreGroupStage(
      match,
      prediction,
      stageRules as GroupStageRules
    );
  }

  return scoreKnockoutStage(
    match,
    prediction,
    stageRules as KnockoutStageRules,
    specialRules
  );
}
