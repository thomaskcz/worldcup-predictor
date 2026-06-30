"use client";

import { useState, useEffect, useMemo } from "react";
import React from "react";
import type { Team } from "@/types/database";
import { Card } from "@/components/ui/Card";

type VisibilitySettings = {
  show_group_predictions: boolean;
  show_semi_predictions: boolean;
  show_final_predictions: boolean;
};

type CompetitionPredictionWithUser = {
  user_id: string;
  nickname: string | null;
  email: string;
  predictions_json: {
    groups: Record<string, { first: string; second: string }>;
    semi_finalists: string[];
    finalists: string[];
  };
  group_points: number | null;
  knockout_points: number | null;
  total_points: number | null;
  breakdown_json: {
    groups: Record<string, {
      details: {
        firstPoints: number;
        secondPoints: number;
      };
    }>;
    semiFinalists: {
      details: {
        teamPoints: Record<string, number>;
      };
    };
    finalists: {
      details: {
        teamPoints: Record<string, number>;
      };
    };
  } | null;
};

type CompetitionComparisonViewProps = {
  teams: Team[];
  currentUserId: string;
  groupNames: string[];
  competitionResults: Array<{
    id: string;
    stage: string;
    group_name: string | null;
    team_id: string;
    position: number | null;
  }>;
  teamsMap: Map<string, Team>;
};

function PointsBadge({ points, maxPoints = 36 }: { points: number | null; maxPoints?: number }) {
  if (points === null) {
    return <span className="text-zinc-400 text-sm">—</span>;
  }

  const getBadgeColor = (pts: number) => {
    const ratio = pts / maxPoints;
    if (ratio === 0) return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    if (ratio < 0.25) return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    if (ratio < 0.5) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    if (ratio < 0.75) return "bg-lime-100 text-lime-700 dark:bg-lime-950/30 dark:text-lime-300 border-lime-200 dark:border-lime-800";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  };

  const getPointsLabel = (pts: number) => {
    return pts === 1 ? "1 pt" : `${pts} pts`;
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getBadgeColor(points)}`}
    >
      {getPointsLabel(points)}
    </span>
  );
}

function TeamPointsBadge({ points }: { points: number | null }) {
  if (points === null) {
    return <span className="text-zinc-400 text-xs w-12 text-right">—</span>;
  }

  const getBadgeColor = (pts: number) => {
    if (pts === 0) return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    if (pts === 1) return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getBadgeColor(points)} w-12 justify-center`}
    >
      {points} pts
    </span>
  );
}

function formatTeamOptionLabel(team: Team) {
  return `${team.name}${team.fifa_code ? ` (${team.fifa_code})` : ""}`;
}

// Component for a single group section
function GroupSection({
  groupName,
  officialResults,
  currentUserPrediction,
  otherPredictions,
  currentUserId,
  teamsMap,
}: {
  groupName: string;
  officialResults: { first: Team | null; second: Team | null };
  currentUserPrediction: CompetitionPredictionWithUser | null;
  otherPredictions: CompetitionPredictionWithUser[];
  currentUserId: string;
  teamsMap: Map<string, Team>;
}) {
  const [expanded, setExpanded] = useState(false);

  const getTeamName = (teamId: string) => {
    const team = teamsMap.get(teamId);
    return team ? team.name : teamId;
  };

  const selection = currentUserPrediction?.predictions_json.groups[groupName] || { first: "", second: "" };
  const groupBreakdown = currentUserPrediction?.breakdown_json?.groups?.[groupName];
  const firstPoints = groupBreakdown?.details?.firstPoints ?? null;
  const secondPoints = groupBreakdown?.details?.secondPoints ?? null;

  return (
    <Card>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
        <span>🏆</span>
        Groupe {groupName}
      </h3>

      {/* Official Results */}
      <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Résultats officiels</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">1er :</span>{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {officialResults.first ? officialResults.first.name : "—"}
            </span>
          </div>
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">2e :</span>{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {officialResults.second ? officialResults.second.name : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Current User Prediction */}
      {currentUserPrediction && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Votre prono</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-700 dark:text-zinc-300">
                {selection.first ? getTeamName(selection.first) : "—"}
              </span>
              {selection.first && <TeamPointsBadge points={firstPoints} />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-700 dark:text-zinc-300">
                {selection.second ? getTeamName(selection.second) : "—"}
              </span>
              {selection.second && <TeamPointsBadge points={secondPoints} />}
            </div>
          </div>
        </div>
      )}

      {/* Toggle button for other predictions */}
      {otherPredictions.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
        >
          {expanded ? "▶ Masquer les autres pronostics" : `▶ Pronostics des autres joueurs (${otherPredictions.length})`}
        </button>
      )}

      {/* Other predictions (accordion) */}
      {expanded && otherPredictions.length > 0 && (
        <div className="mt-3 space-y-2">
          {otherPredictions.map((prediction) => {
            const selection = prediction.predictions_json.groups[groupName] || { first: "", second: "" };
            if (!selection.first && !selection.second) return null;

            const groupBreakdown = prediction.breakdown_json?.groups?.[groupName];
            const firstPoints = groupBreakdown?.details?.firstPoints ?? null;
            const secondPoints = groupBreakdown?.details?.secondPoints ?? null;

            return (
              <div
                key={prediction.user_id}
                className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                  {prediction.nickname || prediction.email}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {selection.first ? getTeamName(selection.first) : "—"}
                    </span>
                    {selection.first && <TeamPointsBadge points={firstPoints} />}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {selection.second ? getTeamName(selection.second) : "—"}
                    </span>
                    {selection.second && <TeamPointsBadge points={secondPoints} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Component for semi-finalists section
function SemiFinalistsSection({
  officialResults,
  currentUserPrediction,
  otherPredictions,
  teamsMap,
}: {
  officialResults: Team[];
  currentUserPrediction: CompetitionPredictionWithUser | null;
  otherPredictions: CompetitionPredictionWithUser[];
  teamsMap: Map<string, Team>;
}) {
  const [expanded, setExpanded] = useState(false);

  const getTeamName = (teamId: string) => {
    const team = teamsMap.get(teamId);
    return team ? team.name : teamId;
  };

  const semiFinalists = currentUserPrediction?.predictions_json.semi_finalists || [];
  const semiTeamPoints = currentUserPrediction?.breakdown_json?.semiFinalists?.details?.teamPoints ?? {};

  return (
    <Card>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
        <span>🏅</span>
        Demi-finalistes
      </h3>

      {/* Official Results */}
      <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Résultats officiels</p>
        <div className="flex flex-wrap gap-2 text-sm">
          {officialResults.map((team) => (
            <span key={team.id} className="font-medium text-zinc-900 dark:text-zinc-50">
              {team.name}
            </span>
          ))}
          {officialResults.length === 0 && <span className="text-zinc-400">—</span>}
        </div>
      </div>

      {/* Current User Prediction */}
      {currentUserPrediction && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Votre prono</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {semiFinalists
              .filter(Boolean)
              .map((teamId) => (
                <div key={teamId} className="flex items-center gap-1">
                  <span className="text-zinc-700 dark:text-zinc-300">{getTeamName(teamId)}</span>
                  <TeamPointsBadge points={semiTeamPoints[teamId] ?? null} />
                </div>
              ))}
            {semiFinalists.filter(Boolean).length === 0 && <span className="text-zinc-400">—</span>}
          </div>
        </div>
      )}

      {/* Toggle button for other predictions */}
      {otherPredictions.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
        >
          {expanded ? "▶ Masquer les autres pronostics" : `▶ Pronostics des autres joueurs (${otherPredictions.length})`}
        </button>
      )}

      {/* Other predictions (accordion) */}
      {expanded && otherPredictions.length > 0 && (
        <div className="mt-3 space-y-2">
          {otherPredictions.map((prediction) => {
            const semiFinalists = prediction.predictions_json.semi_finalists || [];
            if (semiFinalists.length === 0 || semiFinalists.every((id) => !id)) return null;

            const semiTeamPoints = prediction.breakdown_json?.semiFinalists?.details?.teamPoints ?? {};

            return (
              <div
                key={prediction.user_id}
                className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                  {prediction.nickname || prediction.email}
                </p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {semiFinalists
                    .filter(Boolean)
                    .map((teamId) => (
                      <div key={teamId} className="flex items-center gap-1">
                        <span className="text-zinc-700 dark:text-zinc-300">{getTeamName(teamId)}</span>
                        <TeamPointsBadge points={semiTeamPoints[teamId] ?? null} />
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Component for finalists section
function FinalistsSection({
  officialResults,
  currentUserPrediction,
  otherPredictions,
  teamsMap,
}: {
  officialResults: Team[];
  currentUserPrediction: CompetitionPredictionWithUser | null;
  otherPredictions: CompetitionPredictionWithUser[];
  teamsMap: Map<string, Team>;
}) {
  const [expanded, setExpanded] = useState(false);

  const getTeamName = (teamId: string) => {
    const team = teamsMap.get(teamId);
    return team ? team.name : teamId;
  };

  const finalists = currentUserPrediction?.predictions_json.finalists || [];
  const finalTeamPoints = currentUserPrediction?.breakdown_json?.finalists?.details?.teamPoints ?? {};

  return (
    <Card>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
        <span>🎖️</span>
        Finalistes
      </h3>

      {/* Official Results */}
      <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Résultats officiels</p>
        <div className="flex flex-wrap gap-2 text-sm">
          {officialResults.map((team) => (
            <span key={team.id} className="font-medium text-zinc-900 dark:text-zinc-50">
              {team.name}
            </span>
          ))}
          {officialResults.length === 0 && <span className="text-zinc-400">—</span>}
        </div>
      </div>

      {/* Current User Prediction */}
      {currentUserPrediction && (
        <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Votre prono</p>
          <div className="flex flex-wrap gap-2 text-sm">
            {finalists
              .filter(Boolean)
              .map((teamId) => (
                <div key={teamId} className="flex items-center gap-1">
                  <span className="text-zinc-700 dark:text-zinc-300">{getTeamName(teamId)}</span>
                  <TeamPointsBadge points={finalTeamPoints[teamId] ?? null} />
                </div>
              ))}
            {finalists.filter(Boolean).length === 0 && <span className="text-zinc-400">—</span>}
          </div>
        </div>
      )}

      {/* Toggle button for other predictions */}
      {otherPredictions.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
        >
          {expanded ? "▶ Masquer les autres pronostics" : `▶ Pronostics des autres joueurs (${otherPredictions.length})`}
        </button>
      )}

      {/* Other predictions (accordion) */}
      {expanded && otherPredictions.length > 0 && (
        <div className="mt-3 space-y-2">
          {otherPredictions.map((prediction) => {
            const finalists = prediction.predictions_json.finalists || [];
            if (finalists.length === 0 || finalists.every((id) => !id)) return null;

            const finalTeamPoints = prediction.breakdown_json?.finalists?.details?.teamPoints ?? {};

            return (
              <div
                key={prediction.user_id}
                className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                  {prediction.nickname || prediction.email}
                </p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {finalists
                    .filter(Boolean)
                    .map((teamId) => (
                      <div key={teamId} className="flex items-center gap-1">
                        <span className="text-zinc-700 dark:text-zinc-300">{getTeamName(teamId)}</span>
                        <TeamPointsBadge points={finalTeamPoints[teamId] ?? null} />
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function CompetitionComparisonView({ teams, currentUserId, groupNames, competitionResults, teamsMap }: CompetitionComparisonViewProps) {
  const [data, setData] = useState<{
    visibility: VisibilitySettings;
    predictions: CompetitionPredictionWithUser[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupTeams = useMemo(() => {
    return teams.reduce<Record<string, Team[]>>((acc, team) => {
      const group = team.group_name ?? "Ungrouped";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(team);
      return acc;
    }, {});
  }, [teams]);

  // Helper to get official results for a group
  const getGroupResults = (groupName: string) => {
    const groupResults = competitionResults.filter(r => r.stage === "groups" && r.group_name === groupName);
    const first = groupResults.find(r => r.position === 1);
    const second = groupResults.find(r => r.position === 2);
    return {
      first: first ? teamsMap.get(first.team_id) ?? null : null,
      second: second ? teamsMap.get(second.team_id) ?? null : null,
    };
  };

  // Helper to get official semi-finalists
  const getSemiFinalists = () => {
    const semiResults = competitionResults.filter(r => r.stage === "semi_final");
    return semiResults.map(r => teamsMap.get(r.team_id)).filter((t): t is Team => t !== null);
  };

  // Helper to get official finalists
  const getFinalists = () => {
    const finalResults = competitionResults.filter(r => r.stage === "final");
    return finalResults.map(r => teamsMap.get(r.team_id)).filter((t): t is Team => t !== null);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/competition-predictions/others");
        if (!response.ok) {
          throw new Error("Failed to fetch predictions");
        }
        const result = await response.json();

        setData({
          visibility: result.visibility,
          predictions: result.predictions,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId]);

  const getTeamName = (teamId: string) => {
    const team = teamsMap.get(teamId);
    return team ? team.name : teamId;
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Chargement des prévisions...
          </p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="warning">
        <div className="text-center py-8">
          <p className="text-sm text-rose-600 dark:text-rose-400">
            Erreur : {error}
          </p>
        </div>
      </Card>
    );
  }

  if (!data || !data.visibility) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Chargement des paramètres de visibilité...
          </p>
        </div>
      </Card>
    );
  }

  const { visibility, predictions } = data;

  const anyVisibilityEnabled =
    visibility.show_group_predictions ||
    visibility.show_semi_predictions ||
    visibility.show_final_predictions;

  if (!anyVisibilityEnabled || predictions.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Les pronostics des autres joueurs ne sont pas encore visibles.
          </p>
        </div>
      </Card>
    );
  }

  // Separate current user from others
  const currentUserPrediction = predictions.find(p => p.user_id === currentUserId) || null;
  const otherPredictions = predictions.filter(p => p.user_id !== currentUserId);

  return (
    <div className="space-y-6">
      {/* Group Stage Predictions */}
      {visibility.show_group_predictions && (
        <div className="grid gap-5 lg:grid-cols-2">
          {groupNames.map((group) => {
            const officialResults = getGroupResults(group);
            const groupOtherPredictions = otherPredictions.filter(p => {
              const selection = p.predictions_json.groups[group];
              return selection && (selection.first || selection.second);
            });

            return (
              <GroupSection
                key={group}
                groupName={group}
                officialResults={officialResults}
                currentUserPrediction={currentUserPrediction}
                otherPredictions={groupOtherPredictions}
                currentUserId={currentUserId}
                teamsMap={teamsMap}
              />
            );
          })}
        </div>
      )}

      {/* Semi-Finalists Predictions */}
      {visibility.show_semi_predictions && (
        <SemiFinalistsSection
          officialResults={getSemiFinalists()}
          currentUserPrediction={currentUserPrediction}
          otherPredictions={otherPredictions.filter(p => {
            const semiFinalists = p.predictions_json.semi_finalists || [];
            return semiFinalists.length > 0 && semiFinalists.some(Boolean);
          })}
          teamsMap={teamsMap}
        />
      )}

      {/* Finalists Predictions */}
      {visibility.show_final_predictions && (
        <FinalistsSection
          officialResults={getFinalists()}
          currentUserPrediction={currentUserPrediction}
          otherPredictions={otherPredictions.filter(p => {
            const finalists = p.predictions_json.finalists || [];
            return finalists.length > 0 && finalists.some(Boolean);
          })}
          teamsMap={teamsMap}
        />
      )}
    </div>
  );
}
