import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllFixtures, getFootballApiConfig } from "@/lib/api/footballApi";
import { mapFixtureToScheduleRow } from "@/lib/sync/mapFixture";
import type { MatchStage } from "@/types/database";

export type SyncMatchesResult = {
  fetched: number;
  upserted: number;
  scheduleOnlyUpdates: number;
  skippedFinished: number;
};

type ExistingMatchRow = {
  external_id: string;
  finished: boolean;
};

export async function syncMatchesFromAPI(
  supabase: SupabaseClient
): Promise<SyncMatchesResult> {
  const config = getFootballApiConfig();
  const fixtures = await fetchAllFixtures(config);

  if (fixtures.length === 0) {
    return {
      fetched: 0,
      upserted: 0,
      scheduleOnlyUpdates: 0,
      skippedFinished: 0,
    };
  }

  const externalIds = fixtures.map((fixture) => String(fixture.fixture.id));

  const { data: existingMatches, error: existingError } = await supabase
    .from("matches")
    .select("external_id, finished")
    .in("external_id", externalIds);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const finishedExternalIds = new Set(
    ((existingMatches ?? []) as ExistingMatchRow[])
      .filter((match) => match.finished)
      .map((match) => match.external_id)
  );

  const upsertRows: Array<{
    external_id: string;
    home_team: string;
    away_team: string;
    start_time: string;
    stage: MatchStage;
    finished: boolean;
    home_score: null;
    away_score: null;
  }> = [];

  const scheduleOnlyRows: Array<{
    external_id: string;
    home_team: string;
    away_team: string;
    start_time: string;
    stage: MatchStage;
  }> = [];

  let skippedFinished = 0;

  for (const fixture of fixtures) {
    const row = mapFixtureToScheduleRow(fixture);

    if (finishedExternalIds.has(row.external_id)) {
      scheduleOnlyRows.push({
        external_id: row.external_id,
        home_team: row.home_team,
        away_team: row.away_team,
        start_time: row.start_time,
        stage: row.stage as MatchStage,
      });
      skippedFinished += 1;
      continue;
    }

    upsertRows.push({
      external_id: row.external_id,
      home_team: row.home_team,
      away_team: row.away_team,
      start_time: row.start_time,
      stage: row.stage as MatchStage,
      finished: false,
      home_score: null,
      away_score: null,
    });
  }

  let upserted = 0;

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("matches")
      .upsert(upsertRows, { onConflict: "external_id" });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    upserted = upsertRows.length;
  }

  let scheduleOnlyUpdates = 0;

  for (const row of scheduleOnlyRows) {
    const { error: updateError } = await supabase
      .from("matches")
      .update(row)
      .eq("external_id", row.external_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    scheduleOnlyUpdates += 1;
  }

  return {
    fetched: fixtures.length,
    upserted,
    scheduleOnlyUpdates,
    skippedFinished,
  };
}
