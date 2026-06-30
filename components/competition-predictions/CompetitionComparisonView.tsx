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

export function CompetitionComparisonView({ teams, currentUserId, groupNames }: CompetitionComparisonViewProps) {
  const [data, setData] = useState<{
    visibility: VisibilitySettings;
    predictions: CompetitionPredictionWithUser[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamsMap = new Map(teams.map((team) => [team.id, team]));

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
  }, []);

  const getTeamName = (teamId: string) => {
    const team = teamsMap.get(teamId);
    return team ? team.name : teamId;
  };

  const displayName = (user: CompetitionPredictionWithUser) => {
    return user.nickname || user.email;
  };

  const isCurrentUser = (userId: string) => {
    return userId === currentUserId;
  };

  // Sort helpers
  const sortByGroupPoints = (predictions: CompetitionPredictionWithUser[]) => {
    return [...predictions].sort((a, b) => {
      // Current user always first
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;

      // Sort by group points descending if available
      if (a.group_points !== null && b.group_points !== null) {
        if (b.group_points !== a.group_points) {
          return b.group_points - a.group_points;
        }
      }

      // Then by nickname/email
      const displayNameA = a.nickname || a.email;
      const displayNameB = b.nickname || b.email;
      return displayNameA.localeCompare(displayNameB);
    });
  };

  const sortByKnockoutPoints = (predictions: CompetitionPredictionWithUser[]) => {
    return [...predictions].sort((a, b) => {
      // Current user always first
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;

      // Sort by knockout points descending if available
      if (a.knockout_points !== null && b.knockout_points !== null) {
        if (b.knockout_points !== a.knockout_points) {
          return b.knockout_points - a.knockout_points;
        }
      }

      // Then by nickname/email
      const displayNameA = a.nickname || a.email;
      const displayNameB = b.nickname || b.email;
      return displayNameA.localeCompare(displayNameB);
    });
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

  return (
    <div className="space-y-6">
      {/* Group Stage Predictions */}
      {visibility.show_group_predictions && (
        <div className="grid gap-5 lg:grid-cols-2">
          {groupNames.map((group) => {
            const sortedPredictions = sortByGroupPoints(predictions);
            const groupOptions = groupTeams[group] ?? [];

            return (
              <Card key={group}>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <span>🏆</span>
                  Groupe {group}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Prévisions des joueurs
                </p>

                {/* Desktop Table */}
                <div className="mt-4 hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Joueur</th>
                        <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">1er</th>
                        <th className="text-right py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50 w-16">Points</th>
                        <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">2e</th>
                        <th className="text-right py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50 w-16">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPredictions.map((prediction) => {
                        const selection = prediction.predictions_json.groups[group] || { first: "", second: "" };
                        if (!selection.first && !selection.second) return null;

                        const groupBreakdown = prediction.breakdown_json?.groups?.[group];
                        const firstPoints = groupBreakdown?.details?.firstPoints ?? null;
                        const secondPoints = groupBreakdown?.details?.secondPoints ?? null;

                        return (
                          <tr
                            key={prediction.user_id}
                            className={`border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                              isCurrentUser(prediction.user_id)
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                                : ""
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              {isCurrentUser(prediction.user_id) ? (
                                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                  Vous
                                </span>
                              ) : (
                                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {displayName(prediction)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                              {selection.first ? getTeamName(selection.first) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {selection.first ? <TeamPointsBadge points={firstPoints} /> : <span className="text-zinc-400 text-xs">—</span>}
                            </td>
                            <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                              {selection.second ? getTeamName(selection.second) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {selection.second ? <TeamPointsBadge points={secondPoints} /> : <span className="text-zinc-400 text-xs">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="mt-4 space-y-3 sm:hidden">
                  {sortedPredictions.map((prediction) => {
                    const selection = prediction.predictions_json.groups[group] || { first: "", second: "" };
                    if (!selection.first && !selection.second) return null;

                    const groupBreakdown = prediction.breakdown_json?.groups?.[group];
                    const firstPoints = groupBreakdown?.details?.firstPoints ?? null;
                    const secondPoints = groupBreakdown?.details?.secondPoints ?? null;

                    return (
                      <Card
                        key={prediction.user_id}
                        className={`${
                          isCurrentUser(prediction.user_id)
                            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : ""
                        }`}
                      >
                        <div className="mb-2">
                          {isCurrentUser(prediction.user_id) ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              Vous
                            </span>
                          ) : (
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">
                              {displayName(prediction)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                            <span className="font-medium">1er :</span>
                            <div className="flex items-center gap-2">
                              {selection.first ? getTeamName(selection.first) : "—"}
                              {selection.first && <TeamPointsBadge points={firstPoints} />}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                            <span className="font-medium">2e :</span>
                            <div className="flex items-center gap-2">
                              {selection.second ? getTeamName(selection.second) : "—"}
                              {selection.second && <TeamPointsBadge points={secondPoints} />}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Semi-Finalists Predictions */}
      {visibility.show_semi_predictions && (
        <Card>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <span>🏅</span>
              Demi-finalistes
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Sélections des joueurs
            </p>
          </div>

          {/* Desktop Table */}
          <div className="mt-4 hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Joueur</th>
                  <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Équipe 1</th>
                  <th className="text-right py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50 w-16">Points</th>
                  <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Équipe 2</th>
                  <th className="text-right py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50 w-16">Points</th>
                  <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Équipe 3</th>
                  <th className="text-right py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50 w-16">Points</th>
                  <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Équipe 4</th>
                  <th className="text-right py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50 w-16">Points</th>
                </tr>
              </thead>
              <tbody>
                {sortByKnockoutPoints(predictions).map((prediction) => {
                  const semiFinalists = prediction.predictions_json.semi_finalists || [];
                  if (semiFinalists.length === 0 || semiFinalists.every((id) => !id)) return null;

                  const semiTeamPoints = prediction.breakdown_json?.semiFinalists?.details?.teamPoints ?? {};

                  return (
                    <tr
                      key={prediction.user_id}
                      className={`border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                        isCurrentUser(prediction.user_id)
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        {isCurrentUser(prediction.user_id) ? (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            Vous
                          </span>
                        ) : (
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {displayName(prediction)}
                          </span>
                        )}
                      </td>
                      {[0, 1, 2, 3].map((index) => {
                        const teamId = semiFinalists[index];
                        return (
                          <React.Fragment key={index}>
                            <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                              {teamId ? getTeamName(teamId) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {teamId ? <TeamPointsBadge points={semiTeamPoints[teamId] ?? null} /> : <span className="text-zinc-400 text-xs">—</span>}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mt-4 space-y-3 sm:hidden">
            {sortByKnockoutPoints(predictions).map((prediction) => {
              const semiFinalists = prediction.predictions_json.semi_finalists || [];
              if (semiFinalists.length === 0 || semiFinalists.every((id) => !id)) return null;

              const semiTeamPoints = prediction.breakdown_json?.semiFinalists?.details?.teamPoints ?? {};

              return (
                <Card
                  key={prediction.user_id}
                  className={`${
                    isCurrentUser(prediction.user_id)
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : ""
                  }`}
                >
                  <div className="mb-2">
                    {isCurrentUser(prediction.user_id) ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        Vous
                      </span>
                    ) : (
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {displayName(prediction)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="text-zinc-600 dark:text-zinc-400 mb-1">Sélections :</p>
                    <div className="flex flex-wrap gap-2 text-zinc-700 dark:text-zinc-300">
                      {semiFinalists
                        .filter(Boolean)
                        .map((teamId) => (
                          <div key={teamId} className="flex items-center gap-1">
                            {getTeamName(teamId)}
                            <TeamPointsBadge points={semiTeamPoints[teamId] ?? null} />
                          </div>
                        ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* Finalists Predictions */}
      {visibility.show_final_predictions && (
        <Card>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <span>🎖️</span>
              Finalistes
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Sélections des joueurs
            </p>
          </div>

          {/* Desktop Table */}
          <div className="mt-4 hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Joueur</th>
                  <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Équipe 1</th>
                  <th className="text-right py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50 w-16">Points</th>
                  <th className="text-left py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50">Équipe 2</th>
                  <th className="text-right py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-50 w-16">Points</th>
                </tr>
              </thead>
              <tbody>
                {sortByKnockoutPoints(predictions).map((prediction) => {
                  const finalists = prediction.predictions_json.finalists || [];
                  if (finalists.length === 0 || finalists.every((id) => !id)) return null;

                  const finalTeamPoints = prediction.breakdown_json?.finalists?.details?.teamPoints ?? {};

                  return (
                    <tr
                      key={prediction.user_id}
                      className={`border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                        isCurrentUser(prediction.user_id)
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        {isCurrentUser(prediction.user_id) ? (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            Vous
                          </span>
                        ) : (
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {displayName(prediction)}
                          </span>
                        )}
                      </td>
                      {[0, 1].map((index) => {
                        const teamId = finalists[index];
                        return (
                          <React.Fragment key={index}>
                            <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300">
                              {teamId ? getTeamName(teamId) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {teamId ? <TeamPointsBadge points={finalTeamPoints[teamId] ?? null} /> : <span className="text-zinc-400 text-xs">—</span>}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mt-4 space-y-3 sm:hidden">
            {sortByKnockoutPoints(predictions).map((prediction) => {
              const finalists = prediction.predictions_json.finalists || [];
              if (finalists.length === 0 || finalists.every((id) => !id)) return null;

              const finalTeamPoints = prediction.breakdown_json?.finalists?.details?.teamPoints ?? {};

              return (
                <Card
                  key={prediction.user_id}
                  className={`${
                    isCurrentUser(prediction.user_id)
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : ""
                  }`}
                >
                  <div className="mb-2">
                    {isCurrentUser(prediction.user_id) ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        Vous
                      </span>
                    ) : (
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {displayName(prediction)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="text-zinc-600 dark:text-zinc-400 mb-1">Sélections :</p>
                    <div className="flex flex-wrap gap-2 text-zinc-700 dark:text-zinc-300">
                      {finalists
                        .filter(Boolean)
                        .map((teamId) => (
                          <div key={teamId} className="flex items-center gap-1">
                            {getTeamName(teamId)}
                            <TeamPointsBadge points={finalTeamPoints[teamId] ?? null} />
                          </div>
                        ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
