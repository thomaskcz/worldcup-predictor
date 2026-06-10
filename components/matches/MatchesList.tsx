"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { MatchCard } from "@/components/matches/MatchCard";
import { supabase } from "@/lib/supabaseClient";
import type { Match, Prediction, UserScore } from "@/types/database";

type Tab = "upcoming" | "live" | "finished";

export function MatchesList() {
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictionsByMatchId, setPredictionsByMatchId] = useState<
    Record<string, Prediction>
  >({});
  const [userScoresByMatchId, setUserScoresByMatchId] = useState<
    Record<string, UserScore>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const filteredMatches = matches.filter((match) => {
    const isFinished = match.finished;
    const hasStarted = new Date(match.start_time) <= new Date();

    if (activeTab === "upcoming") {
      return !isFinished && !hasStarted;
    }
    if (activeTab === "live") {
      return !isFinished && hasStarted;
    }
    return isFinished;
  });

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      const [matchesResult, predictionsResult, userScoresResult] = await Promise.all([
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
        supabase
          .from("user_scores")
          .select(
            "id, user_id, match_id, score, stage, breakdown_json, computed_at"
          )
          .eq("user_id", user.id),
      ]);

      console.log("[MatchesList] Supabase response", {
        matchesResult,
        predictionsResult,
        userScoresResult,
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

      if (userScoresResult.error) {
        setError(userScoresResult.error.message);
        setLoading(false);
        return;
      }

      setMatches((matchesResult.data ?? []) as Match[]);

      const predictionsMap: Record<string, Prediction> = {};
      for (const prediction of (predictionsResult.data ?? []) as Prediction[]) {
        predictionsMap[prediction.match_id] = prediction;
      }
      setPredictionsByMatchId(predictionsMap);

      const userScoresMap: Record<string, UserScore> = {};
      for (const userScore of (userScoresResult.data ?? []) as UserScore[]) {
        userScoresMap[userScore.match_id] = userScore;
      }
      setUserScoresByMatchId(userScoresMap);

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
      <p className="text-zinc-600 dark:text-zinc-400">Chargement de la session...</p>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-700 dark:text-zinc-300">
          Veuillez vous connecter pour pronostiquer les matchs.
        </p>
        <Link
          href="/auth"
          className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Aller à la connexion
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">Chargement des matchs...</p>
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
        Aucun match programmé pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: "upcoming", label: "À pronostiquer" },
          { id: "live", label: "En cours / en attente" },
          { id: "finished", label: "Terminés" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredMatches.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          Aucun match dans cette catégorie.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <MatchCard
              key={`${match.id}-${predictionsByMatchId[match.id]?.id ?? "new"}`}
              match={match}
              prediction={predictionsByMatchId[match.id] ?? null}
              userScore={userScoresByMatchId[match.id] ?? null}
              userId={user.id}
              onPredictionSaved={handlePredictionSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
