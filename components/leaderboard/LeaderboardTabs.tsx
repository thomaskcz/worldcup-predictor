"use client";

import { useState, useEffect } from "react";
import { LeaderboardTable } from "./LeaderboardTable";
import { ScoreEvolutionChart } from "./ScoreEvolutionChart";
import { supabase } from "@/lib/supabaseClient";
import type { LeaderboardDetailedRow } from "@/types/database";
import type { RankEvolutionRow } from "@/types/database";

type LeaderboardTabsProps = {
  initialRows: LeaderboardDetailedRow[];
};

export function LeaderboardTabs({ initialRows }: LeaderboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "evolution">(
    "leaderboard",
  );
  const [chartData, setChartData] = useState<RankEvolutionRow[] | null>(null);
  const [chartLoaded, setChartLoaded] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "evolution" && !chartLoaded) {
      fetchChartData();
    }
  }, [activeTab, chartLoaded]);

  const fetchChartData = async () => {
    setChartLoading(true);
    setChartError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Vous devez être connecté pour voir l'évolution des scores.");
      }

      const response = await fetch("/api/leaderboard-evolution", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch chart data");
      }

      setChartData(result.data);
      setChartLoaded(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch chart data";
      setChartError(message);
      console.error("[LeaderboardTabs] Error fetching chart data:", error);
    } finally {
      setChartLoading(false);
    }
  };

  return (
    <div>
      {/* Tab Switcher */}
      <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "leaderboard"
              ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Classement
        </button>
        <button
          onClick={() => setActiveTab("evolution")}
          className={`px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "evolution"
              ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Évolution
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "leaderboard" && <LeaderboardTable rows={initialRows} />}

      {activeTab === "evolution" && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {chartLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-500 dark:border-zinc-700 dark:border-t-emerald-400" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Chargement du graphique...
                </p>
              </div>
            </div>
          )}

          {chartError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
            >
              {chartError}
            </div>
          )}

          {!chartLoading && !chartError && chartData && chartData.length > 0 && (
            <ScoreEvolutionChart data={chartData} />
          )}

          {!chartLoading && !chartError && (!chartData || chartData.length === 0) && (
            <div className="py-20 text-center">
              <p className="text-lg text-zinc-600 dark:text-zinc-400">
                Aucune donnée d'évolution disponible pour le moment.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
