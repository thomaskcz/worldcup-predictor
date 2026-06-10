"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Match, KnockoutWinnerPick } from "@/types/database";

export function LiveMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveMatches();
  }, []);

  async function fetchLiveMatches() {
    setLoading(true);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .lte("start_time", now)
      .eq("finished", false)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching live matches:", error);
    } else {
      setMatches(data || []);
    }
    setLoading(false);
  }

  async function updateScore(
    match: Match,
    home_score: number,
    away_score: number,
    winner: KnockoutWinnerPick | null,
    finished: boolean
  ) {
    const updateData: any = { home_score, away_score, finished };
    if (winner) {
      updateData.winner = winner;
    }

    const { error } = await supabase
      .from("matches")
      .update(updateData)
      .eq("id", match.id);
    if (error) {
      console.error("Error updating score:", error);
    } else {
      fetchLiveMatches();
    }
  }

  if (loading) return <div>Chargement des matchs en direct...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Matchs en direct</h2>
      {matches.length === 0 && <p>Aucun match en direct.</p>}
      <div className="grid gap-4">
        {matches.map((match) => (
          <LiveMatchRow key={match.id} match={match} onUpdate={updateScore} />
        ))}
      </div>
    </div>
  );
}

function isKnockoutStage(stage: string) {
  return [
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ].includes(stage);
}

function LiveMatchRow({
  match,
  onUpdate,
}: {
  match: Match;
  onUpdate: (
    m: Match,
    hs: number,
    as: number,
    w: KnockoutWinnerPick | null,
    f: boolean
  ) => void;
}) {
  const [home_score, setHomeScore] = useState(match.home_score ?? 0);
  const [away_score, setAwayScore] = useState(match.away_score ?? 0);
  const [winner, setWinner] = useState<KnockoutWinnerPick | null>(match.winner || null);
  const [finished, setFinished] = useState(match.finished);

  return (
    <div className="p-4 border rounded shadow flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 font-medium">{match.home_team} vs {match.away_team}</p>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{match.stage}</span>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="number"
          value={home_score}
          onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
          className="w-16 border p-1"
          placeholder="Home"
        />
        <span>-</span>
        <input
          type="number"
          value={away_score}
          onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
          className="w-16 border p-1"
          placeholder="Away"
        />
        {isKnockoutStage(match.stage) && home_score === away_score && (
          <select
            value={winner || ""}
            onChange={(e) => setWinner((e.target.value as KnockoutWinnerPick) || null)}
            className="border p-1 text-sm"
          >
            <option value="">Sélectionner vainqueur</option>
            <option value="home">{match.home_team}</option>
            <option value="away">{match.away_team}</option>
          </select>
        )}
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={finished}
            onChange={(e) => setFinished(e.target.checked)}
          />
          Terminé
        </label>
        <button
          onClick={() => onUpdate(match, home_score, away_score, winner, finished)}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}
