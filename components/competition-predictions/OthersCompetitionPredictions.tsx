"use client";

import { useState, useCallback, useEffect } from "react";
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
  breakdown_json: Record<string, unknown> | null;
};

type OthersCompetitionPredictionsProps = {
  teams: Team[];
  currentUserId: string;
};

function PointsBadge({ points, maxPoints = 36 }: { points: number | null; maxPoints?: number }) {
  if (points === null) {
    return null;
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

export function OthersCompetitionPredictions({ teams, currentUserId }: OthersCompetitionPredictionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<{
    visibility: VisibilitySettings;
    predictions: CompetitionPredictionWithUser[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamsMap = new Map(teams.map((team) => [team.id, team]));

  // Load visibility settings immediately when component mounts
  useEffect(() => {
    const fetchVisibilitySettings = async () => {
      try {
        const response = await fetch("/api/admin/competition-visibility");
        if (response.ok) {
          const settings = await response.json();
          setData((prev) => ({
            visibility: settings,
            predictions: prev?.predictions || [],
          }));
        }
      } catch (err) {
        console.error("Error fetching visibility settings:", err);
      }
    };

    fetchVisibilitySettings();
  }, []);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/competition-predictions/others");
      if (!response.ok) {
        throw new Error("Failed to fetch predictions");
      }
      const result = await response.json();

      // Sort predictions:
      // 1. Current user first
      // 2. By points descending (when available)
      // 3. By nickname/email ascending
      const sortedPredictions = result.predictions.sort((a: CompetitionPredictionWithUser, b: CompetitionPredictionWithUser) => {
        // Current user always first
        if (a.user_id === currentUserId) return -1;
        if (b.user_id === currentUserId) return 1;

        // For groups, sort by group_points descending
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

      setData({
        visibility: result.visibility,
        predictions: sortedPredictions,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    // Always fetch predictions when expanding to get fresh data
    if (newExpanded) {
      fetchPredictions();
    }
  };

  const displayName = (user: CompetitionPredictionWithUser) => {
    return user.nickname || user.email;
  };

  const isCurrentUser = (userId: string) => {
    return userId === currentUserId;
  };

  const getTeamName = (teamId: string) => {
    const team = teamsMap.get(teamId);
    return team ? team.name : teamId;
  };

  const visibility = data?.visibility;
  const predictions = data?.predictions || [];

  // Check if any visibility is enabled
  const anyVisibilityEnabled =
    visibility?.show_group_predictions ||
    visibility?.show_semi_predictions ||
    visibility?.show_final_predictions;

  // If we don't have visibility data yet, still show the button
  if (!visibility) {
    return (
      <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <button
          onClick={handleToggle}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
        >
          {expanded ? "▶ Masquer les pronostics" : "▶ Pronostics des autres joueurs"}
        </button>

        {expanded && (
          <div className="mt-3">
            <Card>
              <div className="text-center py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Chargement des paramètres de visibilité...
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (!anyVisibilityEnabled) {
    return (
      <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
        <button
          onClick={handleToggle}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
        >
          {expanded ? "▶ Masquer les pronostics" : "▶ Pronostics des autres joueurs"}
        </button>

        {expanded && (
          <div className="mt-3">
            <Card>
              <div className="text-center py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Les pronostics des autres joueurs ne sont pas encore visibles.
                </p>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4">
      <button
        onClick={handleToggle}
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
      >
        {expanded ? "▶ Masquer les pronostics" : "▶ Pronostics des autres joueurs"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-6">
          {loading && (
            <Card>
              <div className="text-center py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Chargement des pronostics...
                </p>
              </div>
            </Card>
          )}

          {error && (
            <Card variant="warning">
              <div className="text-center py-4">
                <p className="text-sm text-rose-600 dark:text-rose-400">
                  Erreur : {error}
                </p>
              </div>
            </Card>
          )}

          {!loading && !error && predictions.length === 0 && (
            <Card>
              <div className="text-center py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Aucun pronostic de compétition pour le moment.
                </p>
              </div>
            </Card>
          )}

          {!loading && !error && predictions.length > 0 && (
            <>
              {/* Group Stage Predictions */}
              {visibility.show_group_predictions && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <span>🏆</span>
                    Prévisions de groupe
                  </h3>
                  {predictions.map((prediction) => {
                    const groups = prediction.predictions_json.groups || {};
                    const groupEntries = Object.entries(groups);

                    if (groupEntries.length === 0) return null;

                    return (
                      <Card
                        key={prediction.user_id}
                        className={`${
                          isCurrentUser(prediction.user_id)
                            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {isCurrentUser(prediction.user_id) && (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                Vous
                              </span>
                            )}
                            {!isCurrentUser(prediction.user_id) && (
                              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                {displayName(prediction)}
                              </span>
                            )}
                          </div>
                          {prediction.group_points !== null && (
                            <PointsBadge points={prediction.group_points} maxPoints={36} />
                          )}
                        </div>

                        <div className="space-y-3">
                          {groupEntries
                            .sort(([groupA], [groupB]) => groupA.localeCompare(groupB))
                            .map(([group, selection]) => {
                              if (!selection.first && !selection.second) return null;

                              return (
                                <div key={group} className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-3">
                                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                                    Groupe {group}
                                  </h4>
                                  <div className="text-sm space-y-1">
                                    {selection.first && (
                                      <div className="text-zinc-700 dark:text-zinc-300">
                                        <span className="font-medium">1.</span> {getTeamName(selection.first)}
                                      </div>
                                    )}
                                    {selection.second && (
                                      <div className="text-zinc-700 dark:text-zinc-300">
                                        <span className="font-medium">2.</span> {getTeamName(selection.second)}
                                      </div>
                                    )}
                                  </div>
                                </div>
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
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <span>🏅</span>
                    Demi-finalistes
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {predictions.map((prediction) => {
                      const semiFinalists = prediction.predictions_json.semi_finalists || [];

                      if (semiFinalists.length === 0 || semiFinalists.every((id) => !id)) return null;

                      return (
                        <Card
                          key={`semi-${prediction.user_id}`}
                          className={`${
                            isCurrentUser(prediction.user_id)
                              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isCurrentUser(prediction.user_id) && (
                                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                  Vous
                                </span>
                              )}
                              {!isCurrentUser(prediction.user_id) && (
                                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {displayName(prediction)}
                                </span>
                              )}
                            </div>
                            {prediction.knockout_points !== null && (
                              <PointsBadge points={prediction.knockout_points} maxPoints={20} />
                            )}
                          </div>

                          <div className="text-sm">
                            <p className="text-zinc-600 dark:text-zinc-400 mb-2">Semi-finalistes :</p>
                            <ul className="space-y-1">
                              {semiFinalists
                                .filter(Boolean)
                                .map((teamId, index) => (
                                  <li key={index} className="text-zinc-700 dark:text-zinc-300">
                                    • {getTeamName(teamId)}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Finalists Predictions */}
              {visibility.show_final_predictions && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <span>🎖️</span>
                    Finalistes
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {predictions.map((prediction) => {
                      const finalists = prediction.predictions_json.finalists || [];

                      if (finalists.length === 0 || finalists.every((id) => !id)) return null;

                      return (
                        <Card
                          key={`final-${prediction.user_id}`}
                          className={`${
                            isCurrentUser(prediction.user_id)
                              ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                              : ""
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isCurrentUser(prediction.user_id) && (
                                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                  Vous
                                </span>
                              )}
                              {!isCurrentUser(prediction.user_id) && (
                                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {displayName(prediction)}
                                </span>
                              )}
                            </div>
                            {prediction.knockout_points !== null && (
                              <PointsBadge points={prediction.knockout_points} maxPoints={20} />
                            )}
                          </div>

                          <div className="text-sm">
                            <p className="text-zinc-600 dark:text-zinc-400 mb-2">Finalistes :</p>
                            <ul className="space-y-1">
                              {finalists
                                .filter(Boolean)
                                .map((teamId, index) => (
                                  <li key={index} className="text-zinc-700 dark:text-zinc-300">
                                    • {getTeamName(teamId)}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
