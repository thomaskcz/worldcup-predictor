import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchFinishedFixtures,
  fetchFixturesByIds,
  getFootballApiConfig,
} from "@/lib/api/footballApi";
import {
  extractFinalScore,
  isFixtureFinished,
  mapFixtureToScheduleRow,
} from "@/lib/sync/mapFixture";
import type { MatchStage } from "@/types/database";
import type { ApiFootballFixture } from "@/types/football";

export type SyncResultsResult = {
  pendingInDatabase: number;
  apiFinishedFetched: number;
  updated: number;
  skipped: number;
};

type PendingMatchRow = {
  id: string;
  external_id: string;
  finished: boolean;
};

function buildResultUpdate(fixture: ApiFootballFixture) {
  const finalScore = extractFinalScore(fixture);

  if (!finalScore) {
    return null;
  }

  const schedule = mapFixtureToScheduleRow(fixture);

  return {
    external_id: schedule.external_id,
    home_team: schedule.home_team,
    away_team: schedule.away_team,
    start_time: schedule.start_time,
    stage: schedule.stage as MatchStage,
    home_score: finalScore.home,
    away_score: finalScore.away,
    finished: true,
  };
}

export async function syncMatchResults(
  supabase: SupabaseClient
): Promise<SyncResultsResult> {
  const config = getFootballApiConfig();

  const { data: pendingMatches, error: pendingError } = await supabase
    .from("matches")
    .select("id, external_id, finished")
    .eq("finished", false)
    .not("external_id", "is", null);

  if (pendingError) {
    throw new Error(pendingError.message);
  }

  const pending = (pendingMatches ?? []) as PendingMatchRow[];
  const pendingExternalIds = pending.map((match) => match.external_id);

  const fixturesById = new Map<string, ApiFootballFixture>();

  if (pendingExternalIds.length > 0) {
    const pendingFixtures = await fetchFixturesByIds(pendingExternalIds);

    for (const fixture of pendingFixtures) {
      fixturesById.set(String(fixture.fixture.id), fixture);
    }
  }

  const finishedFixtures = await fetchFinishedFixtures(config);

  for (const fixture of finishedFixtures) {
    fixturesById.set(String(fixture.fixture.id), fixture);
  }

  let updated = 0;
  let skipped = 0;

  for (const match of pending) {
    const fixture = fixturesById.get(match.external_id);

    if (!fixture || !isFixtureFinished(fixture.fixture.status.short)) {
      skipped += 1;
      continue;
    }

    const updatePayload = buildResultUpdate(fixture);

    if (!updatePayload) {
      skipped += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        home_score: updatePayload.home_score,
        away_score: updatePayload.away_score,
        finished: true,
        home_team: updatePayload.home_team,
        away_team: updatePayload.away_team,
        start_time: updatePayload.start_time,
        stage: updatePayload.stage,
      })
      .eq("id", match.id)
      .eq("finished", false);

    if (updateError) {
      throw new Error(updateError.message);
    }

    updated += 1;
  }

  return {
    pendingInDatabase: pending.length,
    apiFinishedFetched: finishedFixtures.length,
    updated,
    skipped,
  };
}
