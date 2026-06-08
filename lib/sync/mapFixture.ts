import type { MatchStage } from "@/types/database";
import type { ApiFootballFixture, MatchScheduleRow } from "@/types/football";

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

export function isFixtureFinished(statusShort: string): boolean {
  return FINISHED_STATUSES.has(statusShort);
}

export function mapRoundToStage(round: string): MatchStage {
  const normalized = round.toLowerCase();

  if (
    normalized.includes("group") ||
    normalized.includes("regular season") ||
    normalized.includes("league stage")
  ) {
    return "group";
  }

  if (
    normalized.includes("round of 16") ||
    normalized.includes("1/8") ||
    normalized.includes("8th finals")
  ) {
    return "round_of_16";
  }

  if (
    normalized.includes("quarter") ||
    normalized.includes("1/4") ||
    normalized.includes("4th finals")
  ) {
    return "quarter_final";
  }

  if (normalized.includes("3rd place") || normalized.includes("third place")) {
    return "third_place";
  }

  if (normalized.includes("semi") || normalized.includes("1/2")) {
    return "semi_final";
  }

  if (normalized.includes("final")) {
    return "final";
  }

  return "group";
}

export function extractFinalScore(
  fixture: ApiFootballFixture
): { home: number; away: number } | null {
  if (!isFixtureFinished(fixture.fixture.status.short)) {
    return null;
  }

  const home =
    fixture.goals.home ?? fixture.score.fulltime.home ?? null;
  const away =
    fixture.goals.away ?? fixture.score.fulltime.away ?? null;

  if (home === null || away === null) {
    return null;
  }

  return { home, away };
}

export function mapFixtureToScheduleRow(
  fixture: ApiFootballFixture
): MatchScheduleRow {
  const finalScore = extractFinalScore(fixture);

  return {
    external_id: String(fixture.fixture.id),
    home_team: fixture.teams.home.name,
    away_team: fixture.teams.away.name,
    start_time: fixture.fixture.date,
    stage: mapRoundToStage(fixture.league.round),
    finished: finalScore !== null,
    home_score: finalScore?.home ?? null,
    away_score: finalScore?.away ?? null,
  };
}
