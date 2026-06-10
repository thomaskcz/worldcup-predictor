"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Match, Team } from "@/types/database";

export function MatchManagement() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [stage, setStage] = useState("group");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const stages = [
    "group",
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ];

  useEffect(() => {
    fetchMatches();
    fetchTeams();
  }, []);

  async function handleCreateMatch() {
    const start_time = new Date(`${date}T${time}:00`).toISOString();
    const { error } = await supabase.from("matches").insert({
      home_team: homeTeam,
      away_team: awayTeam,
      stage,
      start_time,
    });
    if (error) {
      console.error("Error creating match:", error);
    } else {
      fetchMatches();
    }
  }

  async function handleDeleteMatch(id: string) {
    if (!confirm("Are you sure?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) {
      console.error("Error deleting match:", error);
    } else {
      fetchMatches();
    }
  }

  async function fetchTeams() {
    const { data } = await supabase.from("teams").select("*");
    setTeams(data || []);
  }

  async function fetchMatches() {
    setLoading(true);
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching matches:", error);
    } else {
      setMatches(data || []);
    }
    setLoading(false);
  }

  if (loading) return <div>Loading matches...</div>;

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded">
        <h3 className="font-semibold mb-2">Create Match</h3>
        <div className="flex gap-2">
          <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className="border p-1">
            <option value="">Select Team 1</option>
            {teams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className="border p-1">
            <option value="">Select Team 2</option>
            {teams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="border p-1">
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-1" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border p-1" />
          <button onClick={handleCreateMatch} className="bg-blue-500 text-white px-2 py-1 rounded">Create</button>
        </div>
      </div>
      <h2 className="text-xl font-semibold">Match Management</h2>
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Team 1</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Team 2</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Stage</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Date/Time</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Status</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {matches.map((match) => (
            <tr key={match.id}>
              <td className="px-3 py-2 text-sm">{match.home_team}</td>
              <td className="px-3 py-2 text-sm">{match.away_team}</td>
              <td className="px-3 py-2 text-sm">{match.stage}</td>
              <td className="px-3 py-2 text-sm">{new Date(match.start_time).toLocaleString()}</td>
              <td className="px-3 py-2 text-sm">{match.finished ? "Finished" : "Scheduled"}</td>
              <td className="px-3 py-2 text-sm">
                <button onClick={() => handleDeleteMatch(match.id)} className="text-red-500">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
