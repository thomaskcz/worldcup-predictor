"use client";

import { useState } from "react";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const status = getMatchStatus(match);
  const canPredict = isPredictionOpen(match);
  const isKnockout = isKnockoutStage(match.stage);
  const isDrawPrediction =
    isKnockout && Number(homeScore) === Number(awayScore);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const parsedHome = Number(homeScore);
    const parsedAway = Number(awayScore);

    if (
      Number.isNaN(parsedHome) ||
      Number.isNaN(parsedAway) ||
      parsedHome < 0 ||
      parsedAway < 0
    ) {
      setError("Les scores doivent être des nombres non négatifs.");
      return;
    }

    if (isDrawPrediction && !predictedWinner) {
      setError("Sélectionnez un vainqueur pour les pronostics d'égalité en phase à élimination directe.");
      return;
    }

    setSubmitting(true);

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

    setSubmitting(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    if (data) {
      onPredictionSaved(data as Prediction);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  }

  return (
    <article
      className={`rounded-xl border bg-white p-5 shadow-sm dark:bg-zinc-900 ${
        prediction
          ? "border-emerald-300 dark:border-emerald-800"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {match.home_team} vs {match.away_team}
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {formatMatchDateTime(match.start_time)} ·{" "}
            {formatMatchStage(match.stage)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              status === "finished"
                ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                : status === "live"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
            }`}
          >
            {formatMatchStatus(status)}
          </span>
          {prediction && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Votre pronostic
            </span>
          )}
        </div>
      </div>

      {match.finished &&
        match.home_score !== null &&
        match.away_score !== null && (
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Résultat : {match.home_score} – {match.away_score}
          </p>
        )}

      {match.finished && userScore && (
        <ScoreBreakdown
          userScore={userScore}
          match={match}
          prediction={prediction}
        />
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {match.home_team}
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={(event) => setHomeScore(event.target.value)}
              disabled={!canPredict || submitting}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {match.away_team}
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={(event) => setAwayScore(event.target.value)}
              disabled={!canPredict || submitting}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:disabled:bg-zinc-900"
            />
          </label>
        </div>

        {isDrawPrediction && canPredict && (
          <fieldset>
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Vainqueur en cas d'égalité
            </legend>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="radio"
                  name={`winner-${match.id}`}
                  value="home"
                  checked={predictedWinner === "home"}
                  onChange={() => setPredictedWinner("home")}
                  disabled={submitting}
                />
                {match.home_team}
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="radio"
                  name={`winner-${match.id}`}
                  value="away"
                  checked={predictedWinner === "away"}
                  onChange={() => setPredictedWinner("away")}
                  disabled={submitting}
                />
                {match.away_team}
              </label>
            </div>
          </fieldset>
        )}

        {!canPredict && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Les pronostics sont clos pour ce match.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Pronostic enregistré.
          </p>
        )}

        {canPredict && (
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting
              ? "Enregistrement..."
              : prediction
                ? "Mettre à jour le pronostic"
                : "Enregistrer le pronostic"}
          </button>
        )}
      </form>
    </article>
  );
}
