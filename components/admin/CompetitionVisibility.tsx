"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";

type VisibilitySettings = {
  id: string;
  show_group_predictions: boolean;
  show_semi_predictions: boolean;
  show_final_predictions: boolean;
};

export function CompetitionVisibility() {
  const [settings, setSettings] = useState<VisibilitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/competition-visibility");
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field: keyof VisibilitySettings) => {
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedSettings = {
        ...settings,
        [field]: !settings[field],
      };

      const response = await fetch("/api/admin/competition-visibility", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      const data = await response.json();
      setSettings(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-zinc-600 dark:text-zinc-400">Chargement des paramètres...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="warning">
        <div className="text-center py-8">
          <p className="text-rose-600 dark:text-rose-400">Erreur : {error}</p>
          <button
            onClick={fetchSettings}
            className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
          >
            Réessayer
          </button>
        </div>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card variant="warning">
        <div className="text-center py-8">
          <p className="text-zinc-600 dark:text-zinc-400">Aucun paramètre trouvé.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span>👁️</span>
            Visibilité des prévisions de compétition
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Contrôlez si les utilisateurs peuvent voir les prévisions de compétition des autres joueurs.
          </p>
        </div>

        {success && (
          <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            ✓ Paramètres mis à jour avec succès
          </div>
        )}

        <div className="space-y-4">
          {/* Group Stage Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">Prévisions de groupe</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {settings.show_group_predictions
                  ? "Les utilisateurs peuvent voir les prévisions de groupe des autres"
                  : "Les prévisions de groupe sont masquées"}
              </p>
            </div>
            <button
              onClick={() => handleToggle("show_group_predictions")}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.show_group_predictions
                  ? "bg-emerald-500"
                  : "bg-zinc-300 dark:bg-zinc-600"
              } ${saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.show_group_predictions ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Semi-Final Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">Demi-finalistes</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {settings.show_semi_predictions
                  ? "Les utilisateurs peuvent voir les demi-finalistes des autres"
                  : "Les demi-finalistes sont masqués"}
              </p>
            </div>
            <button
              onClick={() => handleToggle("show_semi_predictions")}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.show_semi_predictions
                  ? "bg-emerald-500"
                  : "bg-zinc-300 dark:bg-zinc-600"
              } ${saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.show_semi_predictions ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Final Toggle */}
          <div className="flex items-center justify-between py-3">
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">Finalistes</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {settings.show_final_predictions
                  ? "Les utilisateurs peuvent voir les finalistes des autres"
                  : "Les finalistes sont masqués"}
              </p>
            </div>
            <button
              onClick={() => handleToggle("show_final_predictions")}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.show_final_predictions
                  ? "bg-emerald-500"
                  : "bg-zinc-300 dark:bg-zinc-600"
              } ${saving ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.show_final_predictions ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
