import type { SupabaseClient } from "@supabase/supabase-js";
import { computePredictionScore } from "@/lib/scoringEngine";
import type { Match, Prediction } from "@/types/database";
import type { CompetitionRulesJson } from "@/types/rules";

type RecalculateResult = {
  processedMatches: number;
  skippedMatches: number;
  upsertedScores: number;
};

type MatchRow = Match & { updated_at: string };
type ScoreRow = { match_id: string; computed_at: string };

export async function recalculateScores(
  supabase: SupabaseClient
): Promise<RecalculateResult> {
  const { data: rulesRow, error: rulesError } = await supabase
    .from("rules")
    .select("rules_json")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rulesError) {
    throw new Error(rulesError.message);
  }

  if (!rulesRow?.rules_json) {
    throw new Error("No active scoring rules found.");
  }

  const rulesJson = rulesRow.rules_json as CompetitionRulesJson;

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(
      "id, home_team, away_team, home_score, away_score, start_time, stage, finished, updated_at"
    )
    .eq("finished", true);

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const finishedMatches = (matches ?? []) as MatchRow[];

  if (finishedMatches.length === 0) {
    return { processedMatches: 0, skippedMatches: 0, upsertedScores: 0 };
  }

  const matchIds = finishedMatches.map((match) => match.id);

  const { data: existingScores, error: scoresError } = await supabase
    .from("user_scores")
    .select("match_id, computed_at")
    .in("match_id", matchIds);

  if (scoresError) {
    throw new Error(scoresError.message);
  }

  const latestComputedByMatch = new Map<string, string>();
  for (const row of (existingScores ?? []) as ScoreRow[]) {
    const current = latestComputedByMatch.get(row.match_id);
    if (!current || new Date(row.computed_at) > new Date(current)) {
      latestComputedByMatch.set(row.match_id, row.computed_at);
    }
  }

  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select(
      "id, user_id, match_id, predicted_home_score, predicted_away_score, predicted_winner, created_at"
    )
    .in("match_id", matchIds);

  if (predictionsError) {
    throw new Error(predictionsError.message);
  }

  const predictionsByMatch = new Map<string, Prediction[]>();
  for (const prediction of (predictions ?? []) as Prediction[]) {
    const list = predictionsByMatch.get(prediction.match_id) ?? [];
    list.push(prediction);
    predictionsByMatch.set(prediction.match_id, list);
  }

  const rowsToUpsert: Array<{
    user_id: string;
    match_id: string;
    score: number;
    stage: string;
    breakdown_json: object;
    computed_at: string;
  }> = [];

  let processedMatches = 0;
  let skippedMatches = 0;
  const computedAt = new Date().toISOString();

  for (const match of finishedMatches) {
    const latestComputed = latestComputedByMatch.get(match.id);
    if (
      latestComputed &&
      new Date(latestComputed) >= new Date(match.updated_at)
    ) {
      skippedMatches += 1;
      continue;
    }

    processedMatches += 1;
    const matchPredictions = predictionsByMatch.get(match.id) ?? [];

    for (const prediction of matchPredictions) {
      const { score, breakdown } = computePredictionScore(
        match,
        prediction,
        rulesJson
      );

      rowsToUpsert.push({
        user_id: prediction.user_id,
        match_id: match.id,
        score,
        stage: match.stage,
        breakdown_json: breakdown,
        computed_at: computedAt,
      });
    }
  }

  if (rowsToUpsert.length === 0) {
    return { processedMatches, skippedMatches, upsertedScores: 0 };
  }

  const { error: upsertError } = await supabase.from("user_scores").upsert(
    rowsToUpsert,
    { onConflict: "user_id,match_id" }
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return {
    processedMatches,
    skippedMatches,
    upsertedScores: rowsToUpsert.length,
  };
}
