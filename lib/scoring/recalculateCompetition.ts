import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateUserScore, type ScoreBreakdown } from "@/lib/scoring/simpleScoring";
import type { CompetitionResult, Team } from "@/types/database";

type LeaderboardRowInput = {
  user_id: string;
  total_points: number;
  group_points: number;
  knockout_points: number;
  breakdown_json: ScoreBreakdown;
  previous_rank?: number | null;
  current_rank?: number | null;
  rank_delta?: number | null;
  updated_at?: string;
};

export type CompetitionScoringResult = {
  usersProcessed: number;
  scoresUpdated: number;
  ranksUpdated: number;
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
        ranksUpdated: 0,
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
        ranksUpdated: 0,
        processedMatches,
      };
    }

    // Build team lookup map
    const teamMap = new Map(teams.map((t) => [t.id, t as Team]));

    // Fetch old leaderboard to get previous ranks before updating
    const { data: oldLeaderboard, error: oldLeaderboardError } = await supabase
      .from("competition_leaderboard")
      .select("user_id, previous_rank, current_rank");

    if (oldLeaderboardError) {
      throw new Error(`Failed to fetch old leaderboard: ${oldLeaderboardError.message}`);
    }

    // Create a map of user_id to previous_rank for quick lookup
    const oldRankMap = new Map(
      (oldLeaderboard ?? []).map((row) => [
        row.user_id,
        row.current_rank ?? row.previous_rank,
      ]),
    );

    // Calculate scores for each user
    const leaderboardRows: LeaderboardRowInput[] = [];
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
      });
    }

    // Only update ranks if at least one match was processed
    if (processedMatches > 0) {
      // Sort by total_points DESC, then by user_id ASC for deterministic ranking
      leaderboardRows.sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        return a.user_id.localeCompare(b.user_id);
      });

      // Assign ranks and compute deltas
      leaderboardRows.forEach((row, index) => {
        const currentRank = index + 1;
        const previousRank = oldRankMap.get(row.user_id) ?? null;
        const rankDelta = previousRank !== null ? previousRank - currentRank : null;

        row.previous_rank = previousRank;
        row.current_rank = currentRank;
        row.rank_delta = rankDelta;
      });
    } else {
      // No matches processed, keep existing ranks
      leaderboardRows.forEach((row) => {
        const existingRank = oldRankMap.get(row.user_id) ?? null;
        row.previous_rank = existingRank;
        row.current_rank = existingRank;
        row.rank_delta = null;
      });
    }

    // Add updated_at timestamp to all rows
    leaderboardRows.forEach((row) => {
      row.updated_at = now;
    });

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
      ranksUpdated: processedMatches > 0 ? leaderboardRows.length : 0,
      processedMatches,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      usersProcessed: 0,
      scoresUpdated: 0,
      ranksUpdated: 0,
      processedMatches,
      error: message,
    };
  }
}
