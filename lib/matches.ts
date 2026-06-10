import type { Match, MatchStage } from "@/types/database";

export function isKnockoutStage(stage: MatchStage): boolean {
  return stage !== "group";
}

export function isPredictionOpen(match: Match): boolean {
  return !match.finished && new Date(match.start_time) > new Date();
}

export type MatchStatus = "upcoming" | "live" | "finished";

export function getMatchStatus(match: Match): MatchStatus {
  if (match.finished) {
    return "finished";
  }

  if (new Date(match.start_time) <= new Date()) {
    return "live";
  }

  return "upcoming";
}

const STAGE_LABELS: Record<MatchStage, string> = {
  group: "Phase de groupes",
  round_of_32: "Seizièmes de finale",
  round_of_16: "Huitièmes de finale",
  quarter_final: "Quarts de finale",
  semi_final: "Demi-finales",
  third_place: "Match pour la 3ème place",
  final: "Finale",
};

export function formatMatchStage(stage: MatchStage): string {
  return STAGE_LABELS[stage];
}

export function formatMatchDateTime(startTime: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(startTime));
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  upcoming: "À venir",
  live: "En direct",
  finished: "Terminé",
};

export function formatMatchStatus(status: MatchStatus): string {
  return STATUS_LABELS[status];
}
