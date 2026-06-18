"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  formatMatchDateTime,
  formatMatchStage,
  formatMatchStatus,
  getMatchStatus,
  isKnockoutStage,
  isPredictionOpen,
} from "@/lib/matches";
import { ScoreBreakdown } from "@/components/matches/ScoreBreakdown";
import { OthersPredictions } from "@/components/matches/OthersPredictions";
import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import type {
  KnockoutWinnerPick,
  Match,
  Prediction,
  UserScore,
} from "@/types/database";

type MatchCardProps = {
  match: Match;
  prediction: Prediction | null;
  userScore: UserScore | null;
  userId: string;
  onPredictionSaved: (prediction: Prediction) => void;
};

export function MatchCard({
  match,
  prediction,
  userScore,
  userId,
  onPredictionSaved,
}: MatchCardProps) {
  const [homeScore, setHomeScore] = useState(() =>
    prediction ? String(prediction.predicted_home_score) : "0"
  );
  const [awayScore, setAwayScore] = useState(() =>
    prediction ? String(prediction.predicted_away_score) : "0"
  );
  const [predictedWinner, setPredictedWinner] = useState<
    KnockoutWinnerPick | ""
  >(() => prediction?.predicted_winner ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  const status = getMatchStatus(match);
  const canPredict = isPredictionOpen(match);
  const isKnockout = isKnockoutStage(match.stage);
  const isDrawPrediction =
    isKnockout && Number(homeScore) === Number(awayScore);

  const savePrediction = useCallback(async () => {
    if (isSavingRef.current) return;

    const parsedHome = Number(homeScore);
    const parsedAway = Number(awayScore);

    if (
      Number.isNaN(parsedHome) ||
      Number.isNaN(parsedAway) ||
      parsedHome < 0 ||
      parsedAway < 0
    ) {
      return;
    }

    if (isDrawPrediction && !predictedWinner) {
      return;
    }

    isSavingRef.current = true;
    setSaving(true);

    const payload = {
      user_id: userId,
      match_id: match.id,
      predicted_home_score: parsedHome,
      predicted_away_score: parsedAway,
      predicted_winner: isDrawPrediction ? predictedWinner : null,
    };

    const { data, error: upsertError } = await supabase
      .from("predictions")
      .upsert(payload, { onConflict: "user_id,match_id" })
      .select()
      .single();

    setSaving(false);
    isSavingRef.current = false;

    if (upsertError) {
      setToast({ message: "Erreur lors de l'enregistrement", variant: "error" });
      return;
    }

    if (data) {
      onPredictionSaved(data as Prediction);
      const message = prediction ? "Pronostic mis à jour" : "Pronostic enregistré";
      setToast({ message, variant: "success" });
    }
  }, [homeScore, awayScore, predictedWinner, isDrawPrediction, userId, match.id, prediction, onPredictionSaved]);

  useEffect(() => {
    if (!canPredict) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      savePrediction();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [homeScore, awayScore, predictedWinner, canPredict, savePrediction]);

  const cardVariant = prediction ? "success" : "default";

  return (
    <Card variant={cardVariant} className={prediction ? "border-emerald-300 dark:border-emerald-700" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {match.home_team} vs {match.away_team}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {formatMatchDateTime(match.start_time)} ·{" "}
            {formatMatchStage(match.stage)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === "finished"
                ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                : status === "live"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            }`}
          >
            {formatMatchStatus(status)}
          </span>
          {prediction && (
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              ✓ Pronostic
            </span>
          )}
          {prediction && prediction.predicted_winner && (
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {prediction.predicted_winner === "home" ? match.home_team : match.away_team} qualifié
            </span>
          )}
        </div>
      </div>

      {match.finished &&
        match.home_score !== null &&
        match.away_score !== null && (
          <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              ⚽ Résultat : {match.home_score} – {match.away_score}
              {match.winner && (
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                  ({match.winner === "home" ? match.home_team : match.away_team} qualifié)
                </span>
              )}
            </p>
            {prediction && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Votre pronostic : {prediction.predicted_home_score} – {prediction.predicted_away_score}
                {prediction.predicted_winner && (
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    ({prediction.predicted_winner === "home" ? match.home_team : match.away_team} qualifié)
                  </span>
                )}
              </p>
            )}
          </div>
        )}

      {match.finished && userScore && (
        <div className="mt-4">
          <ScoreBreakdown
            userScore={userScore}
            match={match}
            prediction={prediction}
          />
        </div>
      )}

      {status !== "upcoming" && (
        <div className="mt-4">
          <OthersPredictions match={match} currentUserId={userId} />
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {match.home_team}
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={(event) => setHomeScore(event.target.value)}
              disabled={!canPredict}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900"
            />
          </label>

          <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {match.away_team}
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={(event) => setAwayScore(event.target.value)}
              disabled={!canPredict}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900"
            />
          </label>
        </div>

        {saving && canPredict && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-emerald-600 rounded-full animate-spin dark:border-zinc-600 dark:border-t-emerald-500"></div>
            Enregistrement...
          </div>
        )}

        {isDrawPrediction && canPredict && (
          <fieldset className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 dark:border-amber-800 dark:from-amber-950/30 dark:to-zinc-900">
            <legend className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
              <span>⚠️</span>
              Score égal - Vainqueur en cas d&apos;égalité
            </legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                <input
                  type="radio"
                  name={`winner-${match.id}`}
                  value="home"
                  checked={predictedWinner === "home"}
                  onChange={() => setPredictedWinner("home")}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold">{match.home_team}</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                <input
                  type="radio"
                  name={`winner-${match.id}`}
                  value="away"
                  checked={predictedWinner === "away"}
                  onChange={() => setPredictedWinner("away")}
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold">{match.away_team}</span>
              </label>
            </div>
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              En phase à élimination directe, vous devez sélectionner l&apos;équipe qui se qualifie en cas d&apos;égalité.
            </p>
          </fieldset>
        )}

        {!canPredict && (
          <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            🔒 Les pronostics sont clos pour ce match.
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </Card>
  );
}
