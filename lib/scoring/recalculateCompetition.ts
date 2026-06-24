import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateUserScore, type ScoreBreakdown } from "@/lib/scoring/simpleScoring";
import type { CompetitionResult, Team } from "@/types/database";

type LeaderboardRowInput = {
  user_id: string;
  total_points: number;
  group_points: number;
  knockout_points: number;
  breakdown_json: ScoreBreakdown;
};

export type CompetitionScoringResult = {
  usersProcessed: number;
  scoresUpdated: number;
  processedMatches: number;
  error?: string;
};

/**
 * Recalculates competition leaderboard scores based on official results
 * Fetches all predictions and results, computes scores, and updates the leaderboard table
 * Safe to run multiple times (idempotent via upsert)
 */
export async function recalculateCompetitionScores(
  supabase: SupabaseClient,
  processedMatches: number = 0,
): Promise<CompetitionScoringResult> {
  try {
    // Fetch all competition results
    const { data: results, error: resultsError } = await supabase
      .from("competition_results")
      .select("id, stage, group_name, team_id, position, updated_at");

    if (resultsError) {
      throw new Error(`Failed to fetch competition results: ${resultsError.message}`);
    }

    if (!results || results.length === 0) {
      return {
        usersProcessed: 0,
        scoresUpdated: 0,
        processedMatches: 0,
        error: "No competition results found",
      };
    }

    // Fetch all teams
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, fifa_code, group_name, flag_url, created_at");

    if (teamsError) {
      throw new Error(`Failed to fetch teams: ${teamsError.message}`);
    }

    if (!teams || teams.length === 0) {
      throw new Error("No teams found");
    }

    // Fetch all competition predictions using pagination to avoid Supabase's 1000 row limit
    const allPredictions: Array<{ user_id: string; predictions_json: unknown }> = [];
    const batchSize = 1000;
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: predictionsBatch, error: predictionsError } = await supabase
        .from("competition_predictions")
        .select("user_id, predictions_json")
        .range(from, from + batchSize - 1);

      if (predictionsError) {
        throw new Error(`Failed to fetch predictions: ${predictionsError.message}`);
      }

      if (predictionsBatch && predictionsBatch.length > 0) {
        allPredictions.push(...predictionsBatch);
        from += batchSize;
        hasMore = predictionsBatch.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    if (allPredictions.length === 0) {
      return {
        usersProcessed: 0,
        scoresUpdated: 0,
        processedMatches,
      };
    }

    // Build team lookup map
    const teamMap = new Map(teams.map((t) => [t.id, t as Team]));

    // Calculate scores for each user
    const leaderboardRows: LeaderboardRowInput[] = [];
    const now = new Date().toISOString();

    for (const prediction of allPredictions) {
      const userScore = calculateUserScore(
        prediction.predictions_json as { groups: Record<string, { first: string; second: string }>; semi_finalists: string[]; finalists: string[] },
        results as CompetitionResult[],
        teamMap,
      );

      leaderboardRows.push({
        user_id: prediction.user_id,
        total_points: userScore.totalPoints,
        group_points: userScore.groupPoints,
        knockout_points: userScore.knockoutPoints,
        breakdown_json: userScore.breakdown,
      });
    }

    // Upsert competition scores
    const { error: upsertError, count } = await supabase.from("competition_leaderboard").upsert(leaderboardRows, {
      onConflict: "user_id",
      count: "exact",
    });

    if (upsertError) {
      throw new Error(`Failed to upsert leaderboard: ${upsertError.message}`);
    }

    return {
      usersProcessed: allPredictions.length,
      scoresUpdated: leaderboardRows.length,
      processedMatches,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      usersProcessed: 0,
      scoresUpdated: 0,
      processedMatches,
      error: message,
    };
  }
}
