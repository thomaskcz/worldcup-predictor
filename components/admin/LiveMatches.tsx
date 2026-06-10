"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Match } from "@/types/database";

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

  async function updateScore(match: Match, home_score: number, away_score: number, finished: boolean) {
    const { error } = await supabase
      .from("matches")
      .update({ home_score, away_score, finished })
      .eq("id", match.id);
    if (error) {
      console.error("Error updating score:", error);
    } else {
      fetchLiveMatches();
    }
  }

  if (loading) return <div>Loading live matches...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Live Matches</h2>
      {matches.length === 0 && <p>No live matches.</p>}
      <div className="grid gap-4">
        {matches.map((match) => (
          <LiveMatchRow key={match.id} match={match} onUpdate={updateScore} />
        ))}
      </div>
    </div>
  );
}

function LiveMatchRow({ match, onUpdate }: { match: Match, onUpdate: (m: Match, hs: number, as: number, f: boolean) => void }) {
  const [home_score, setHomeScore] = useState(match.home_score ?? 0);
  const [away_score, setAwayScore] = useState(match.away_score ?? 0);
  const [finished, setFinished] = useState(match.finished);

  return (
    <div className="p-4 border rounded shadow flex gap-2 items-center">
      <p className="flex-1">{match.home_team} vs {match.away_team}</p>
      <input type="number" value={home_score} onChange={(e) => setHomeScore(parseInt(e.target.value))} className="w-16 border p-1" />
      <input type="number" value={away_score} onChange={(e) => setAwayScore(parseInt(e.target.value))} className="w-16 border p-1" />
      <label>
        <input type="checkbox" checked={finished} onChange={(e) => setFinished(e.target.checked)} />
        Finished
      </label>
      <button onClick={() => onUpdate(match, home_score, away_score, finished)} className="bg-blue-500 text-white px-2 py-1 rounded">Update</button>
    </div>
  );
}
