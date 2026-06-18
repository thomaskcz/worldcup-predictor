"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Match, UserPredictionWithProfile } from "@/types/database";

type OthersPredictionsProps = {
  match: Match;
  currentUserId: string;
};

function PointsBadge({ points }: { points: number }) {
  const getBadgeColor = (pts: number) => {
    if (pts === 0) return "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    if (pts >= 1 && pts <= 2) return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    if (pts >= 3 && pts <= 5) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
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

export function OthersPredictions({
  match,
  currentUserId,
}: OthersPredictionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [predictions, setPredictions] = useState<UserPredictionWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch predictions with user profiles and scores in a single query using a join
    const { data: predictionsData, error: predictionsError } = await supabase
      .from("predictions")
      .select(`
        user_id,
        predicted_home_score,
        predicted_away_score,
        predicted_winner,
        users_profiles!inner (
          id,
          nickname,
          email
        ),
        user_scores (
          score
        )
      `)
      .eq("match_id", match.id);

    if (predictionsError) {
      setLoading(false);
      setError(predictionsError.message);
      return;
    }

    if (!predictionsData || predictionsData.length === 0) {
      setLoading(false);
      setPredictions([]);
      setFetched(true);
      return;
    }

    // Transform the data to match our type
    const transformedData: UserPredictionWithProfile[] =
      predictionsData.map((item: any) => {
        const profile = item.users_profiles;
        const score = item.user_scores && item.user_scores.length > 0 ? item.user_scores[0].score : null;
        return {
          user_id: item.user_id,
          predicted_home_score: item.predicted_home_score,
          predicted_away_score: item.predicted_away_score,
          predicted_winner: item.predicted_winner as "home" | "away" | null,
          nickname: profile?.nickname || null,
          email: profile?.email || "",
          score,
        };
      });

    // Sort: current user first, then by points (descending) for finished matches, then by nickname/email
    const sortedData = transformedData.sort((a, b) => {
      // Current user always first
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;

      // For finished matches, sort by points descending
      if (match.finished) {
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }

      // Then by nickname/email
      const displayNameA = a.nickname || a.email;
      const displayNameB = b.nickname || b.email;
      return displayNameA.localeCompare(displayNameB);
    });

    setPredictions(sortedData);
    setFetched(true);
    setLoading(false);
  }, [match.id, match.finished, currentUserId]);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    if (newExpanded && !fetched) {
      fetchPredictions();
    }
  };

  const displayName = (user: UserPredictionWithProfile) => {
    return user.nickname || user.email;
  };

  const isCurrentUser = (userId: string) => {
    return userId === currentUserId;
  };

  return (
    <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
      <button
        onClick={handleToggle}
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
      >
        {expanded ? "▶ Masquer les pronostics" : "▶ Pronostics des autres joueurs"}
      </button>

      {expanded && (
        <div className="mt-3 text-sm">
          {loading && (
            <div className="text-zinc-600 dark:text-zinc-400 py-2">
              Chargement des pronostics...
            </div>
          )}

          {error && (
            <div className="text-rose-600 dark:text-rose-400 py-2">
              Erreur : {error}
            </div>
          )}

          {!loading && !error && predictions.length === 0 && (
            <div className="text-zinc-600 dark:text-zinc-400 py-2">
              Aucun pronostic pour ce match.
            </div>
          )}

          {!loading && !error && predictions.length > 0 && (
            <div className="space-y-2">
              {predictions.map((prediction) => (
                <div
                  key={prediction.user_id}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg border transition-all ${
                    isCurrentUser(prediction.user_id)
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
                      : "bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isCurrentUser(prediction.user_id) && (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                        Vous
                      </span>
                    )}
                    {!isCurrentUser(prediction.user_id) && (
                      <span className="font-medium text-zinc-900 dark:text-zinc-50 whitespace-nowrap truncate">
                        {displayName(prediction)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {prediction.predicted_home_score} - {prediction.predicted_away_score}
                      {prediction.predicted_winner && (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                          ({prediction.predicted_winner === "home" ? match.home_team : match.away_team})
                        </span>
                      )}
                    </div>
                    {match.finished && prediction.score !== null && (
                      <PointsBadge points={prediction.score} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
