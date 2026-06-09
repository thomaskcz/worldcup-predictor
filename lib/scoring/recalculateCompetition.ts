import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateUserScore } from "@/lib/scoring/simpleScoring";
import type { CompetitionResult, Team } from "@/types/database";

export type CompetitionScoringResult = {
  usersProcessed: number;
  scoresUpdated: number;
  error?: string;
};

/**
 * Recalculates competition leaderboard scores based on official results
 * Fetches all predictions and results, computes scores, and updates the leaderboard table
 * Safe to run multiple times (idempotent via upsert)
 */
export async function recalculateCompetitionScores(
  supabase: SupabaseClient,
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

    // Fetch all competition predictions
    const { data: predictions, error: predictionsError } = await supabase
      .from("competition_predictions")
      .select("user_id, predictions_json");

    if (predictionsError) {
      throw new Error(`Failed to fetch predictions: ${predictionsError.message}`);
    }

    if (!predictions || predictions.length === 0) {
      return {
        usersProcessed: predictions?.length ?? 0,
        scoresUpdated: 0,
      };
    }

    // Build team lookup map
    const teamMap = new Map(teams.map((t) => [t.id, t as Team]));

    // Calculate scores for each user
    const leaderboardRows = [];
    const now = new Date().toISOString();

    for (const prediction of predictions as Array<{ user_id: string; predictions_json: unknown }>) {
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
        updated_at: now,
      });
    }

    // Upsert into competition_leaderboard table
    const { error: upsertError } = await supabase.from("competition_leaderboard").upsert(leaderboardRows, {
      onConflict: "user_id",
    });

    if (upsertError) {
      throw new Error(`Failed to upsert leaderboard: ${upsertError.message}`);
    }

    return {
      usersProcessed: predictions.length,
      scoresUpdated: leaderboardRows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      usersProcessed: 0,
      scoresUpdated: 0,
      error: message,
    };
  }
}
