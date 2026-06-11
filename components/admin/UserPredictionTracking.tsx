"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserTrackingData {
  user_id: string;
  nickname: string | null;
  email: string;
  has_competition_predictions: boolean;
  continuous_predictions_count: number;
  last_continuous_home_team: string | null;
  last_continuous_away_team: string | null;
  last_continuous_start_time: string | null;
  total_predictions: number;
}

export function UserPredictionTracking() {
  const [users, setUsers] = useState<UserTrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch total number of matches for progress calculation
    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("id", { count: "exact" });

    if (!matchesError && matchesData) {
      setTotalMatches(matchesData.length);
    }

    // Fetch user prediction tracking data from the view
    const { data, error } = await supabase
      .from("user_prediction_tracking")
      .select("*");

    if (error) {
      console.error("Error fetching user prediction tracking:", error);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  }

  function getStatusBadge(hasCompetitionPredictions: boolean, continuousCount: number, total: number) {
    if (!hasCompetitionPredictions) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Pronostics compétition manquants
        </span>
      );
    }

    if (continuousCount === total) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          À jour
        </span>
      );
    }

    if (continuousCount < 4) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          En retard
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        En cours
      </span>
    );
  }

  function getProgressColor(continuousCount: number, total: number) {
    const percentage = total > 0 ? (continuousCount / total) * 100 : 0;
    if (percentage >= 80) return "bg-emerald-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  }

  function formatDateTime(dateString: string | null) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) return <div>Chargement des données de suivi...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Suivi des prédictions des utilisateurs</h2>
        <button
          onClick={fetchData}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          Rafraîchir
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Prédictions de compétition
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Progression matchs
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Dernier match continu
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Total prédictions
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">
                      {user.nickname || user.email}
                    </div>
                    {user.nickname && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {user.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.has_competition_predictions ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        Complété
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Non complété
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {user.continuous_predictions_count} / {totalMatches}
                      </span>
                      <div className="w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(
                            user.continuous_predictions_count,
                            totalMatches
                          )}`}
                          style={{
                            width: `${totalMatches > 0 ? (user.continuous_predictions_count / totalMatches) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.last_continuous_home_team && user.last_continuous_away_team ? (
                      <div>
                        <div className="font-medium">
                          {user.last_continuous_home_team} vs {user.last_continuous_away_team}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDateTime(user.last_continuous_start_time)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {user.total_predictions}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getStatusBadge(
                      user.has_competition_predictions,
                      user.continuous_predictions_count,
                      totalMatches
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
