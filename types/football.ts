export type ApiFootballPaging = {
  current: number;
  total: number;
};

export type ApiFootballResponse<T> = {
  errors: Record<string, string> | string[] | unknown;
  paging?: ApiFootballPaging;
  response: T[];
};

export type ApiFootballFixtureStatus = {
  long: string;
  short: string;
  elapsed: number | null;
};

export type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: ApiFootballFixtureStatus;
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string;
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
};

export type MatchScheduleRow = {
  external_id: string;
  home_team: string;
  away_team: string;
  start_time: string;
  stage: string;
  finished: boolean;
  home_score: number | null;
  away_score: number | null;
};
