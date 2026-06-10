"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { CompetitionPredictionsJson, Team } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type CompetitionPredictionsFormProps = {
  teams: Team[];
  initialPredictions: CompetitionPredictionsJson | null;
  deadlinePassed: boolean;
  firstMatchStartTime: string | null;
};

const buildDefaultPredictions = (groups: string[]) => {
  return {
    groups: groups.reduce<Record<string, { first: string; second: string }>>((acc, group) => {
      acc[group] = { first: "", second: "" };
      return acc;
    }, {}),
    semi_finalists: ["", "", "", ""],
    finalists: ["", ""],
  };
};

const isDuplicate = (arr: string[]) => {
  const filtered = arr.filter(Boolean);
  return new Set(filtered).size !== filtered.length;
};

const formatTeamOptionLabel = (team: Team) => `${team.name}${team.fifa_code ? ` (${team.fifa_code})` : ""}`;

export function CompetitionPredictionsForm({
  teams,
  initialPredictions,
  deadlinePassed,
  firstMatchStartTime,
}: CompetitionPredictionsFormProps) {
  const groupTeams = useMemo(() => {
    return teams.reduce<Record<string, Team[]>>((acc, team) => {
      const group = team.group_name ?? "Ungrouped";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(team);
      return acc;
    }, {});
  }, [teams]);

  const groupNames = useMemo(() => {
    return Object.keys(groupTeams).sort();
  }, [groupTeams]);

  const [predictions, setPredictions] = useState<CompetitionPredictionsJson>(
    initialPredictions ?? buildDefaultPredictions(groupNames),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const groupError = useMemo(() => {
    return groupNames.some((group) => {
      const selection = predictions.groups[group];
      return selection?.first && selection?.second && selection.first === selection.second;
    });
  }, [groupNames, predictions.groups]);

  const semiFinalsError = isDuplicate(predictions.semi_finalists);
  const finalsError = isDuplicate(predictions.finalists);

  const hasValidationErrors = groupError || semiFinalsError || finalsError;

  const allTeamOptions = useMemo(() => {
    return teams.map((team) => ({ value: team.id, label: formatTeamOptionLabel(team) }));
  }, [teams]);

  const handleGroupChange = (group: string, position: "first" | "second", value: string) => {
    setPredictions((current) => ({
      ...current,
      groups: {
        ...current.groups,
        [group]: {
          ...current.groups[group],
          [position]: value,
        },
      },
    }));
  };

  const handleSemiFinalChange = (index: number, value: string) => {
    setPredictions((current) => {
      const next = [...current.semi_finalists];
      next[index] = value;
      return { ...current, semi_finalists: next };
    });
  };

  const handleFinalChange = (index: number, value: string) => {
    setPredictions((current) => {
      const next = [...current.finalists];
      next[index] = value;
      return { ...current, finalists: next };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);

    if (deadlinePassed) {
      setStatusMessage("La date limite de prévision est passée. Vos prévisions sont en lecture seule.");
      return;
    }

    if (hasValidationErrors) {
      setStatusMessage("Veuillez corriger les sélections en double avant de soumettre.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/competition-predictions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ predictions_json: predictions }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Échec de l'enregistrement des prévisions.");
      }

      setStatusMessage("Prévisions enregistrées avec succès.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur inattendue s'est produite.";
      setStatusMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (teams.length === 0) {
    return (
      <Card>
        <div className="text-center">
          <p className="text-base text-zinc-700 dark:text-zinc-300">
            Aucune équipe disponible pour le moment. Veuillez revenir plus tard une fois les équipes de la compétition chargées.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        {groupNames.map((group) => {
          const groupOptions = groupTeams[group] ?? [];
          const selection = predictions.groups[group] ?? { first: "", second: "" };
          const duplicate = selection.first && selection.second && selection.first === selection.second;

          return (
            <Card key={group} className={duplicate ? "border-rose-300 dark:border-rose-700" : ""}>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span>🏆</span>
                Groupe {group}
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Choisissez les deux meilleures équipes de ce groupe.
              </p>

              <div className="mt-4 space-y-4">
                {(["first", "second"] as const).map((position) => {
                  const currentValue = selection[position];
                  const otherValue = selection[position === "first" ? "second" : "first"];

                  return (
                    <label key={`${group}-${position}`} className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {position === "first" ? "🥇 Vainqueur" : "🥈 Deuxième"}
                      <select
                        value={currentValue}
                        disabled={deadlinePassed}
                        onChange={(event) => handleGroupChange(group, position, event.target.value)}
                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-800"
                      >
                        <option value="">Sélectionner une équipe</option>
                        {groupOptions.map((team) => (
                          <option
                            key={team.id}
                            value={team.id}
                            disabled={otherValue === team.id}
                          >
                            {formatTeamOptionLabel(team)}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>

              {duplicate && (
                <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                  ⚠️ Le vainqueur et le deuxième ne peuvent pas être la même équipe.
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span>🏅</span>
            Demi-finalistes
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Choisissez quatre équipes qui atteindront les demi-finales.
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {predictions.semi_finalists.map((value, index) => {
            const duplicate = predictions.semi_finalists.filter(Boolean).filter((teamId) => teamId === value).length > 1;
            return (
              <label key={`semi-${index}`} className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Demi-finaliste {index + 1}
                <select
                  value={value}
                  disabled={deadlinePassed}
                  onChange={(event) => handleSemiFinalChange(index, event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-800"
                >
                  <option value="">Sélectionner une équipe</option>
                  {allTeamOptions.map((option) => {
                    const disabled = predictions.semi_finalists.some(
                      (selected, selectedIndex) => selectedIndex !== index && selected === option.value,
                    );
                    return (
                      <option key={option.value} value={option.value} disabled={disabled}>
                        {option.label}
                      </option>
                    );
                  })}
                </select>
                {duplicate && (
                  <div className="mt-2 rounded-xl bg-rose-50 px-3 py-1.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                    Les demi-finalistes en double ne sont pas autorisés.
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </Card>

      <Card>
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span>🎖️</span>
            Finalistes
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Choisissez les deux équipes qui atteindront la finale.
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {predictions.finalists.map((value, index) => {
            const duplicate = predictions.finalists.filter(Boolean).filter((teamId) => teamId === value).length > 1;
            return (
              <label key={`final-${index}`} className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Finaliste {index + 1}
                <select
                  value={value}
                  disabled={deadlinePassed}
                  onChange={(event) => handleFinalChange(index, event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-800"
                >
                  <option value="">Sélectionner une équipe</option>
                  {allTeamOptions.map((option) => {
                    const disabled = predictions.finalists.some(
                      (selected, selectedIndex) => selectedIndex !== index && selected === option.value,
                    );
                    return (
                      <option key={option.value} value={option.value} disabled={disabled}>
                        {option.label}
                      </option>
                    );
                  })}
                </select>
                {duplicate && (
                  <div className="mt-2 rounded-xl bg-rose-50 px-3 py-1.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                    Les finalistes en double ne sont pas autorisés.
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </Card>

      <Card variant="warning">
        <div className="flex items-start gap-3">
          <span className="text-xl">⏰</span>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Les prévisions sont modifiables jusqu'au début du premier match programmé.
            {firstMatchStartTime ? ` Date limite : ${new Date(firstMatchStartTime).toLocaleString()}.` : ""}
          </p>
        </div>
      </Card>

      {statusMessage && (
        <Card variant={statusMessage.includes("succès") ? "success" : "warning"}>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {statusMessage}
          </p>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4">
        <Button
          type="submit"
          variant="primary"
          disabled={deadlinePassed || submitting || hasValidationErrors}
          size="lg"
          className="flex-1 sm:flex-none"
        >
          {deadlinePassed ? "🔒 Date limite dépassée" : submitting ? "⏳ Enregistrement..." : "💾 Enregistrer les prévisions"}
        </Button>
      </div>
    </form>
  );
}
