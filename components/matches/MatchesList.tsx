"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { MatchCard } from "@/components/matches/MatchCard";
import { supabase } from "@/lib/supabaseClient";
import type { Match, Prediction } from "@/types/database";

export function MatchesList() {
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictionsByMatchId, setPredictionsByMatchId] = useState<
    Record<string, Prediction>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const [matchesResult, predictionsResult] = await Promise.all([
        supabase
          .from("matches")
          .select(
            "id, home_team, away_team, home_score, away_score, start_time, stage, finished"
          )
          .order("start_time", { ascending: true }),
        supabase
          .from("predictions")
          .select(
            "id, user_id, match_id, predicted_home_score, predicted_away_score, predicted_winner, created_at"
          )
          .eq("user_id", user.id),
      ]);

      console.log("[MatchesList] Supabase response", {
        matchesResult,
        predictionsResult,
      });

      if (cancelled) {
        return;
      }

      if (matchesResult.error) {
        setError(matchesResult.error.message);
        setLoading(false);
        return;
      }

      if (predictionsResult.error) {
        setError(predictionsResult.error.message);
        setLoading(false);
        return;
      }

      setMatches((matchesResult.data ?? []) as Match[]);

      const predictionsMap: Record<string, Prediction> = {};
      for (const prediction of (predictionsResult.data ?? []) as Prediction[]) {
        predictionsMap[prediction.match_id] = prediction;
      }
      setPredictionsByMatchId(predictionsMap);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  function handlePredictionSaved(prediction: Prediction) {
    setPredictionsByMatchId((current) => ({
      ...current,
      [prediction.match_id]: prediction,
    }));
  }

  if (authLoading) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">Loading session...</p>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-700 dark:text-zinc-300">
          Please log in to predict matches.
        </p>
        <Link
          href="/auth"
          className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Go to login
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">Loading matches...</p>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
      >
        {error}
      </p>
    );
  }

  if (matches.length === 0) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        No matches scheduled yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <MatchCard
          key={`${match.id}-${predictionsByMatchId[match.id]?.id ?? "new"}`}
          match={match}
          prediction={predictionsByMatchId[match.id] ?? null}
          userId={user.id}
          onPredictionSaved={handlePredictionSaved}
        />
      ))}
    </div>
  );
}
