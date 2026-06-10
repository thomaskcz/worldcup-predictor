"use client";

import { useState } from "react";
import type { UserScore, Match, Prediction } from "@/types/database";
import type { ScoreBreakdown } from "@/types/rules";

type InferredBreakdown = {
  correctOutcome: boolean;
  exactScore: boolean;
};

type ScoreBreakdownProps = {
  userScore: UserScore;
  match: Match;
  prediction: Prediction | null;
};

export function ScoreBreakdown({
  userScore,
  match,
  prediction,
}: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  const breakdown = userScore.breakdown_json as ScoreBreakdown | null;
  const hasBreakdown = breakdown !== null;

  // Infer minimal explanation if breakdown_json is not available
  const inferredBreakdown = !hasBreakdown && prediction && match.home_score !== null && match.away_score !== null
    ? inferBreakdown(match, prediction)
    : null;

  if (!breakdown && !inferredBreakdown) {
    return null;
  }

  const totalScore = userScore.score;

  return (
    <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {totalScore > 0 ? `+${totalScore}` : `${totalScore}`} pt{totalScore !== 1 ? "s" : ""}
          </span>
          {totalScore > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">🎯</span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {expanded ? "Masquer les détails" : "Voir les détails"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 text-sm">
          {hasBreakdown ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  {breakdown.correct_outcome ? (
                    <span className="flex items-center gap-1">
                      👍 Résultat correct (1N2)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      ❌ Résultat incorrect
                    </span>
                  )}
                </span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  +{breakdown.base}
                </span>
              </div>

              {breakdown.home_exact_bonus > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      🎯 Score exact équipe domicile
                    </span>
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    +{breakdown.home_exact_bonus}
                  </span>
                </div>
              )}

              {breakdown.away_exact_bonus > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      🎯 Score exact équipe extérieur
                    </span>
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    +{breakdown.away_exact_bonus}
                  </span>
                </div>
              )}

              {breakdown.qualified_bonus > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      🏆 Qualifié correct
                    </span>
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    +{breakdown.qualified_bonus}
                  </span>
                </div>
              )}

              {breakdown.skipped_reason && (
                <div className="flex items-center justify-between">
                  <span className="text-amber-600 dark:text-amber-400">
                    ⚠️ {breakdown.skipped_reason}
                  </span>
                </div>
              )}
            </>
          ) : (
            // Fallback display when breakdown_json is not available
            inferredBreakdown && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {inferredBreakdown.correctOutcome ? (
                      <span className="flex items-center gap-1">
                        👍 Résultat correct (1N2)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        ❌ Résultat incorrect
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {inferredBreakdown.correctOutcome ? "Points accordés" : "0 pt"}
                  </span>
                </div>

                {inferredBreakdown.exactScore && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        🎯 Score exact
                      </span>
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      Bonus
                    </span>
                  </div>
                )}

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    ⚠️ Détails limités : Le décompte détaillé des points n'est pas disponible pour ce match.
                  </p>
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to infer minimal breakdown when breakdown_json is not available
function inferBreakdown(match: Match, prediction: Prediction): InferredBreakdown {
  const homeScore = match.home_score!;
  const awayScore = match.away_score!;
  const predictedHome = prediction.predicted_home_score;
  const predictedAway = prediction.predicted_away_score;

  const actualOutcome = getOutcome(homeScore, awayScore);
  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const correctOutcome = actualOutcome === predictedOutcome;
  const exactScore = homeScore === predictedHome && awayScore === predictedAway;

  return {
    correctOutcome,
    exactScore,
  };
}

function getOutcome(homeScore: number, awayScore: number): "home" | "draw" | "away" {
  if (homeScore > awayScore) {
    return "home";
  }
  if (awayScore > homeScore) {
    return "away";
  }
  return "draw";
}
