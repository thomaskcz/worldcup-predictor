"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Match, Team } from "@/types/database";

export function MatchManagement() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState("");
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
    if (!confirm("Êtes-vous sûr ?")) return;
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

  async function handleRecalculateScores() {
    setRecalculating(true);
    setRecalcMessage("");

    try {
      const response = await fetch("/api/recalculate-scores", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to recalculate scores");
      }

      setRecalcMessage(
        `Succès ! ${data.processedMatches} matchs traités, ${data.upsertedScores} scores mis à jour.`
      );
    } catch (error) {
      setRecalcMessage(
        `Erreur : ${error instanceof Error ? error.message : "Erreur inconnue"}`
      );
    } finally {
      setRecalculating(false);
    }
  }

  if (loading) return <div>Chargement des matchs...</div>;

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded">
        <h3 className="font-semibold mb-2">Créer un match</h3>
        <div className="flex gap-2">
          <select value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} className="border p-1">
            <option value="">Sélectionner l'équipe 1</option>
            {teams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} className="border p-1">
            <option value="">Sélectionner l'équipe 2</option>
            {teams.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="border p-1">
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-1" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border p-1" />
          <button onClick={handleCreateMatch} className="bg-blue-500 text-white px-2 py-1 rounded">Créer</button>
        </div>
      </div>

      <div className="p-4 border rounded bg-zinc-50 dark:bg-zinc-900">
        <h3 className="font-semibold mb-2">Recalculer les scores</h3>
        <button
          onClick={handleRecalculateScores}
          disabled={recalculating}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
        >
          {recalculating ? "Recalcul en cours..." : "Recalculer tous les scores"}
        </button>
        {recalcMessage && (
          <div className={`mt-2 p-2 rounded text-sm ${
            recalcMessage.startsWith("Erreur")
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
          }`}>
            {recalcMessage}
          </div>
        )}
      </div>

      <h2 className="text-xl font-semibold">Gestion des matchs</h2>
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Équipe 1</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Équipe 2</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Phase</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Date/Heure</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">Statut</th>
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
              <td className="px-3 py-2 text-sm">{match.finished ? "Terminé" : "Programmé"}</td>
              <td className="px-3 py-2 text-sm">
                <button onClick={() => handleDeleteMatch(match.id)} className="text-red-500">Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
