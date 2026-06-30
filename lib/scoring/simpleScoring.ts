import type { CompetitionPredictionsJson, CompetitionResult, Team } from "@/types/database";

export type ScoreBreakdown = {
  groups: Record<
    string,
    {
      points: number;
      details: {
        predictedFirst: string | null;
        predictedSecond: string | null;
        actualFirst: string | null;
        actualSecond: string | null;
        firstPoints: number;
        secondPoints: number;
      };
    }
  >;
  semiFinalists: {
    points: number;
    details: {
      predicted: string[];
      actual: string[];
      correct: string[];
      teamPoints: Record<string, number>;
    };
  };
  finalists: {
    points: number;
    details: {
      predicted: string[];
      actual: string[];
      correct: string[];
      teamPoints: Record<string, number>;
    };
  };
};

export type UserScore = {
  userId: string;
  totalPoints: number;
  groupPoints: number;
  knockoutPoints: number;
  breakdown: ScoreBreakdown;
};

/**
 * Pure function to calculate user score based on predictions and official results
 * No side effects - just computation
 */
export function calculateUserScore(
  predictions: CompetitionPredictionsJson,
  results: CompetitionResult[],
  teams: Map<string, Team>,
): UserScore {
  const breakdown: ScoreBreakdown = {
    groups: {},
    semiFinalists: {
      points: 0,
      details: {
        predicted: [],
        actual: [],
        correct: [],
        teamPoints: {},
      },
    },
    finalists: {
      points: 0,
      details: {
        predicted: [],
        actual: [],
        correct: [],
        teamPoints: {},
      },
    },
  };

  let groupPoints = 0;
  let knockoutPoints = 0;

  // ===== GROUP STAGE =====
  const groupResults = results.filter((r) => r.stage === "groups");

  for (const [groupName, prediction] of Object.entries(predictions.groups)) {
    const groupResultsForGroup = groupResults.filter((r) => r.group_name === groupName);
    const first = groupResultsForGroup.find((r) => r.position === 1);
    const second = groupResultsForGroup.find((r) => r.position === 2);

    let groupScore = 0;
    let firstPoints = 0;
    let secondPoints = 0;
    const actualFirst = first ? teams.get(first.team_id)?.name ?? null : null;
    const actualSecond = second ? teams.get(second.team_id)?.name ?? null : null;
    const predictedFirst = prediction.first ? (teams.get(prediction.first)?.name ?? null) : null;
    const predictedSecond = prediction.second ? (teams.get(prediction.second)?.name ?? null) : null;

    // Check first place
    if (prediction.first && first?.position === 1 && prediction.first === first.team_id) {
      firstPoints = 3;
      groupScore += 3;
    } else if (prediction.first) {
      // Check if team is in top 2 (qualified but wrong position)
      const isQualified = groupResultsForGroup.some((r) => r.position !== null && r.position <= 2 && r.team_id === prediction.first);
      if (isQualified) {
        firstPoints = 1;
        groupScore += 1;
      }
    }

    // Check second place
    if (prediction.second && second?.position === 2 && prediction.second === second.team_id) {
      secondPoints = 2;
      groupScore += 2;
    } else if (prediction.second) {
      // Check if team is in top 2 (qualified but wrong position)
      const isQualified = groupResultsForGroup.some((r) => r.position !== null && r.position <= 2 && r.team_id === prediction.second);
      if (isQualified) {
        secondPoints = 1;
        groupScore += 1;
      }
    }

    groupPoints += groupScore;
    breakdown.groups[groupName] = {
      points: groupScore,
      details: {
        predictedFirst,
        predictedSecond,
        actualFirst,
        actualSecond,
        firstPoints,
        secondPoints,
      },
    };
  }

  // ===== SEMI-FINALISTS =====
  const semiResults = results.filter((r) => r.stage === "semi_final");
  const semiTeamIds = semiResults.map((r) => r.team_id);

  let semiScore = 0;
  const correctSemis: string[] = [];
  const semiTeamPoints: Record<string, number> = {};

  for (const predictedTeamId of predictions.semi_finalists) {
    if (predictedTeamId && semiTeamIds.includes(predictedTeamId)) {
      semiScore += 5;
      correctSemis.push(teams.get(predictedTeamId)?.name ?? predictedTeamId);
      semiTeamPoints[predictedTeamId] = 5;
    } else if (predictedTeamId) {
      semiTeamPoints[predictedTeamId] = 0;
    }
  }

  knockoutPoints += semiScore;
  breakdown.semiFinalists.points = semiScore;
  breakdown.semiFinalists.details.predicted = predictions.semi_finalists
    .filter(Boolean)
    .map((id) => teams.get(id)?.name ?? id);
  breakdown.semiFinalists.details.actual = semiTeamIds.map((id) => teams.get(id)?.name ?? id);
  breakdown.semiFinalists.details.correct = correctSemis;
  breakdown.semiFinalists.details.teamPoints = semiTeamPoints;

  // ===== FINALISTS =====
  const finalResults = results.filter((r) => r.stage === "final");
  const finalTeamIds = finalResults.map((r) => r.team_id);

  let finalScore = 0;
  const correctFinals: string[] = [];
  const finalTeamPoints: Record<string, number> = {};

  for (const predictedTeamId of predictions.finalists) {
    if (predictedTeamId && finalTeamIds.includes(predictedTeamId)) {
      correctFinals.push(teams.get(predictedTeamId)?.name ?? predictedTeamId);
      finalTeamPoints[predictedTeamId] = 10; // Individual team score for display
    } else if (predictedTeamId) {
      finalTeamPoints[predictedTeamId] = 0;
    }
  }

  // Calculate total score based on number of correct teams
  if (correctFinals.length === 1) {
    finalScore = 10;
  } else if (correctFinals.length === 2) {
    finalScore = 25;
  }

  knockoutPoints += finalScore;
  breakdown.finalists.points = finalScore;
  breakdown.finalists.details.predicted = predictions.finalists
    .filter(Boolean)
    .map((id) => teams.get(id)?.name ?? id);
  breakdown.finalists.details.actual = finalTeamIds.map((id) => teams.get(id)?.name ?? id);
  breakdown.finalists.details.correct = correctFinals;
  breakdown.finalists.details.teamPoints = finalTeamPoints;

  return {
    userId: "temp", // Will be set by caller
    totalPoints: groupPoints + knockoutPoints,
    groupPoints,
    knockoutPoints,
    breakdown,
  };
}
