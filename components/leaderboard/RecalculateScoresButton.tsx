"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export function RecalculateScoresButton() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading || !user || !user.is_admin) {
    return null;
  }

  async function handleRecalculate() {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/recalculate-scores", {
      method: "POST",
    });

    const payload = (await response.json()) as {
      error?: string;
      processedMatches?: number;
      skippedMatches?: number;
      upsertedScores?: number;
    };

    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? "Échec du recalcul des scores.");
      return;
    }

    setMessage(
      `${payload.upsertedScores ?? 0} scores mis à jour sur ${payload.processedMatches ?? 0} matchs (${payload.skippedMatches ?? 0} ignorés).`
    );
    router.refresh();
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleRecalculate}
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        {submitting ? "Recalcul en cours..." : "Recalculer les scores"}
      </button>

      {message && (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
