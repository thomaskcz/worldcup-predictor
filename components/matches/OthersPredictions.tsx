"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Match, UserPredictionWithProfile } from "@/types/database";

type OthersPredictionsProps = {
  match: Match;
  currentUserId: string;
};

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

    // First, fetch predictions for this match
    const { data: predictionsData, error: predictionsError } = await supabase
      .from("predictions")
      .select("user_id, predicted_home_score, predicted_away_score, predicted_winner")
      .eq("match_id", match.id);

    if (predictionsError) {
      setLoading(false);
      setError(predictionsError.message);
      return;
    }

    console.log("Predictions data:", predictionsData);

    if (!predictionsData || predictionsData.length === 0) {
      setLoading(false);
      setPredictions([]);
      setFetched(true);
      return;
    }

    // Then, fetch user profiles for all users who made predictions
    const userIds = predictionsData.map((p) => p.user_id);
    console.log("User IDs:", userIds);

    const { data: profilesData, error: profilesError } = await supabase
      .from("users_profiles")
      .select("id, nickname, email")
      .in("id", userIds);

    setLoading(false);

    console.log("Profiles data:", profilesData);

    if (profilesError) {
      setError(profilesError.message);
      return;
    }

    // Create a map of user profiles for easy lookup
    const profilesMap = new Map(
      (profilesData || []).map((profile) => [profile.id, profile])
    );
    console.log("Profiles map:", profilesMap);

    // Transform the data to match our type
    const transformedData: UserPredictionWithProfile[] =
      predictionsData.map((item) => {
        const profile = profilesMap.get(item.user_id);
        return {
          user_id: item.user_id,
          predicted_home_score: item.predicted_home_score,
          predicted_away_score: item.predicted_away_score,
          predicted_winner: item.predicted_winner as "home" | "away" | null,
          nickname: profile?.nickname || null,
          email: profile?.email || "",
        };
      });

    console.log("Transformed data:", transformedData);

    // Sort: current user first, then by nickname/email
    const sortedData = transformedData.sort((a, b) => {
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;

      const displayNameA = a.nickname || a.email;
      const displayNameB = b.nickname || b.email;
      return displayNameA.localeCompare(displayNameB);
    });

    console.log("Sorted data:", sortedData);
    console.log("Current user ID:", currentUserId);

    setPredictions(sortedData);
    setFetched(true);
  }, [match.id, currentUserId]);

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
        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {expanded ? "▶ Masquer les pronostics" : "▶ Pronostics des autres joueurs"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 text-sm">
          {loading && (
            <div className="text-zinc-600 dark:text-zinc-400">
              Chargement des pronostics...
            </div>
          )}

          {error && (
            <div className="text-rose-600 dark:text-rose-400">
              Erreur : {error}
            </div>
          )}

          {!loading && !error && predictions.length === 0 && (
            <div className="text-zinc-600 dark:text-zinc-400">
              Aucun pronostic pour ce match.
            </div>
          )}

          {!loading && !error && predictions.length > 0 && (
            <div className="space-y-1.5">
              {predictions.map((prediction) => (
                <div
                  key={prediction.user_id}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-2">
                    {isCurrentUser(prediction.user_id) && (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        Vous
                      </span>
                    )}
                    {!isCurrentUser(prediction.user_id) && (
                      <span className="text-zinc-900 dark:text-zinc-50">
                        {displayName(prediction)}
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {prediction.predicted_home_score} - {prediction.predicted_away_score}
                    {prediction.predicted_winner && (
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                        ({prediction.predicted_winner === "home" ? match.home_team : match.away_team} qualifié)
                      </span>
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
