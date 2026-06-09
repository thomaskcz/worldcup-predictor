"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { CompetitionPredictionsJson, Team } from "@/types/database";

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
      setStatusMessage("The prediction deadline has passed. Your predictions are read-only.");
      return;
    }

    if (hasValidationErrors) {
      setStatusMessage("Please fix duplicate selections before submitting.");
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
        throw new Error(result.error || "Failed to save predictions.");
      }

      setStatusMessage("Predictions saved successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      setStatusMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-base text-zinc-700 dark:text-zinc-300">
          There are no teams available yet. Please check back later once the competition teams are loaded.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid gap-4 lg:grid-cols-2">
        {groupNames.map((group) => {
          const groupOptions = groupTeams[group] ?? [];
          const selection = predictions.groups[group] ?? { first: "", second: "" };
          const duplicate = selection.first && selection.second && selection.first === selection.second;

          return (
            <div key={group} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Group {group}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Pick the top two teams from this group.</p>

              <div className="mt-4 space-y-4">
                {(["first", "second"] as const).map((position) => {
                  const currentValue = selection[position];
                  const otherValue = selection[position === "first" ? "second" : "first"];

                  return (
                    <label key={`${group}-${position}`} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {position === "first" ? "Winner" : "Runner-up"}
                      <select
                        value={currentValue}
                        disabled={deadlinePassed}
                        onChange={(event) => handleGroupChange(group, position, event.target.value)}
                        className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-800"
                      >
                        <option value="">Select a team</option>
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
                <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">Winner and runner-up cannot be the same team.</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Semi-finalists</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Choose four teams that will reach the semi-finals.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {predictions.semi_finalists.map((value, index) => {
            const duplicate = predictions.semi_finalists.filter(Boolean).filter((teamId) => teamId === value).length > 1;
            return (
              <label key={`semi-${index}`} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Semi-finalist {index + 1}
                <select
                  value={value}
                  disabled={deadlinePassed}
                  onChange={(event) => handleSemiFinalChange(index, event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-800"
                >
                  <option value="">Select a team</option>
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
                {duplicate && <span className="mt-1 text-sm text-rose-600 dark:text-rose-400">Duplicate semi-finalists are not allowed.</span>}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Finalists</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Choose the two teams that will make the final.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {predictions.finalists.map((value, index) => {
            const duplicate = predictions.finalists.filter(Boolean).filter((teamId) => teamId === value).length > 1;
            return (
              <label key={`final-${index}`} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Finalist {index + 1}
                <select
                  value={value}
                  disabled={deadlinePassed}
                  onChange={(event) => handleFinalChange(index, event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-800"
                >
                  <option value="">Select a team</option>
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
                {duplicate && <span className="mt-1 text-sm text-rose-600 dark:text-rose-400">Duplicate finalists are not allowed.</span>}
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        <p>
          Predictions are editable until the first scheduled match starts.
          {firstMatchStartTime ? ` Deadline: ${new Date(firstMatchStartTime).toLocaleString()}.` : ""}
        </p>
      </div>

      {statusMessage && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {statusMessage}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          type="submit"
          disabled={deadlinePassed || submitting || hasValidationErrors}
          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          {deadlinePassed ? "Deadline passed" : submitting ? "Saving..." : "Save Predictions"}
        </button>
      </div>
    </form>
  );
}
