import type {
  ApiFootballFixture,
  ApiFootballResponse,
} from "@/types/football";

const API_BASE_URL = "https://v3.football.api-sports.io";

type FootballApiConfig = {
  leagueId: number;
  season: number;
};

type FetchFixturesParams = {
  leagueId?: number;
  season?: number;
  page?: number;
  status?: string;
  ids?: string[];
};

function getApiKey(): string {
  const apiKey = process.env.FOOTBALL_API_KEY;

  if (!apiKey) {
    throw new Error("Missing FOOTBALL_API_KEY environment variable.");
  }

  return apiKey;
}

export function getFootballApiConfig(): FootballApiConfig {
  const leagueId = Number(process.env.FOOTBALL_API_LEAGUE_ID ?? "1");
  const season = Number(process.env.FOOTBALL_API_SEASON ?? "2026");

  if (Number.isNaN(leagueId) || Number.isNaN(season)) {
    throw new Error(
      "Invalid FOOTBALL_API_LEAGUE_ID or FOOTBALL_API_SEASON configuration."
    );
  }

  return { leagueId, season };
}

async function fetchFootballApi<T>(
  path: string,
  params: Record<string, string | number | undefined>
): Promise<ApiFootballResponse<T>> {
  const url = new URL(`${API_BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": getApiKey(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Football API request failed (${response.status} ${response.statusText}).`
    );
  }

  const payload = (await response.json()) as ApiFootballResponse<T>;

  if (
    payload.errors &&
    ((Array.isArray(payload.errors) && payload.errors.length > 0) ||
      (!Array.isArray(payload.errors) &&
        Object.keys(payload.errors as object).length > 0))
  ) {
    throw new Error(`Football API error: ${JSON.stringify(payload.errors)}`);
  }

  return payload;
}

async function fetchFixturesPage(
  params: FetchFixturesParams
): Promise<ApiFootballResponse<ApiFootballFixture>> {
  if (params.ids && params.ids.length > 0) {
    return fetchFootballApi<ApiFootballFixture>("/fixtures", {
      ids: params.ids.join("-"),
    });
  }

  return fetchFootballApi<ApiFootballFixture>("/fixtures", {
    league: params.leagueId,
    season: params.season,
    page: params.page,
    status: params.status,
  });
}

export async function fetchAllFixtures(
  config: FootballApiConfig = getFootballApiConfig()
): Promise<ApiFootballFixture[]> {
  const fixtures: ApiFootballFixture[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await fetchFixturesPage({
      leagueId: config.leagueId,
      season: config.season,
      page,
    });

    fixtures.push(...payload.response);
    totalPages = payload.paging?.total ?? 1;
    page += 1;
  }

  return fixtures;
}

export async function fetchFinishedFixtures(
  config: FootballApiConfig = getFootballApiConfig()
): Promise<ApiFootballFixture[]> {
  const fixtures: ApiFootballFixture[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await fetchFixturesPage({
      leagueId: config.leagueId,
      season: config.season,
      page,
      status: "FT-AET-PEN-AWD-WO",
    });

    fixtures.push(...payload.response);
    totalPages = payload.paging?.total ?? 1;
    page += 1;
  }

  return fixtures;
}

export async function fetchFixturesByIds(
  ids: string[]
): Promise<ApiFootballFixture[]> {
  if (ids.length === 0) {
    return [];
  }

  const fixtures: ApiFootballFixture[] = [];
  const chunkSize = 20;

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const payload = await fetchFixturesPage({ ids: chunk });
    fixtures.push(...payload.response);
  }

  return fixtures;
}
