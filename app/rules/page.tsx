import { PageContainer } from "@/components/PageContainer";
import type { RulesConfig } from "@/types/rules";
import rulesConfigRaw from "@/config/rules.json";

const rulesConfig = rulesConfigRaw as RulesConfig;

const stageTitles: Record<string, string> = {
  group_stage: "Phase de groupes",
  round_of_32: "Seizièmes de finale",
  round_of_16: "Huitièmes de finale",
  quarter_finals: "Quarts de finale",
  semi_finals_and_third_place: "Demi-finales et match pour la 3ème place",
  final: "Finale",
};

const ruleLabels: Record<string, string> = {
  correct_1N2: "Bon résultat (1, N ou 2)",
  exact_score_per_team_if_correct_1N2: "Score exact pour chaque équipe (bon résultat)",
  incorrect_1N2: "Mauvais résultat",
  exact_score_per_team_if_wrong_1N2: "Score exact pour chaque équipe (mauvais résultat)",
  correct_qualified_bonus: "Bonus qualification correcte",
  first_place_correct: "Première place du groupe correcte",
  second_place_correct: "Deuxième place du groupe correcte",
  qualified_wrong_position: "Équipe qualifiée mais pas à la bonne place",
  semi_finalists_per_team: "Points par demi-finaliste correct",
  one_team_correct: "Un finaliste correct",
  two_teams_correct: "Les deux finalistes corrects",
};

function shouldDisplayRule(value: unknown): boolean {
  return typeof value === "number" && value !== 0;
}

function formatSectionTitle(title: string): string {
  return stageTitles[title] || title;
}

function formatRuleLabel(key: string): string {
  return ruleLabels[key] || key.replace(/_/g, " ");
}

function renderPreTournamentRules() {
  const preRules = rulesConfig.rules.pre_tournament_predictions;

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Prévisions pré-tournoi
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        À faire avant le début du tournoi.
      </p>

      <div className="space-y-4">
        {preRules.group_stage && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Phase de groupes
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(preRules.group_stage).map(
                ([key, value]) =>
                  shouldDisplayRule(value) && (
                    <div
                      key={key}
                      className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-950"
                    >
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {formatRuleLabel(key)}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                        {value} pts
                      </p>
                    </div>
                  )
              )}
            </div>
          </div>
        )}

        {preRules.knockout_forecast && (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Prévisions KO
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-950">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Points par demi-finaliste correct
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {preRules.knockout_forecast.semi_finalists_per_team} pts
                </p>
              </div>

              {preRules.knockout_forecast.final && (
                <>
                  <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-950">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Un finaliste correct
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      {preRules.knockout_forecast.final.one_team_correct} pts
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-950">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Les deux finalistes corrects
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      {preRules.knockout_forecast.final.two_teams_correct} pts
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function renderMatchPredictionRules() {
  const matchRules = rulesConfig.rules.match_predictions;

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Points de pronostics de match
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        À faire avant le début du match. Les règles varient selon la phase.
      </p>

      <div className="space-y-4">
        {Object.entries(matchRules.stages).map(([stage, stageRules]) => {
            const hasValidRules = Object.entries(stageRules).some(
              ([, value]) => shouldDisplayRule(value)
            );

            if (!hasValidRules) return null;

            return (
              <div
                key={stage}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatSectionTitle(stage)}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(stageRules).map(
                    ([ruleKey, ruleValue]) =>
                      shouldDisplayRule(ruleValue) && (
                        <div
                          key={ruleKey}
                          className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-950"
                        >
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {formatRuleLabel(ruleKey)}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                            {ruleValue} pts
                          </p>
                        </div>
                      )
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

function renderSpecialRules() {
  const specialRules = rulesConfig.rules.special_rules;

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Règles spéciales
      </h3>
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-3">
          {Object.entries(specialRules).map(([key, rule]) => (
            <p key={key} className="text-sm text-zinc-700 dark:text-zinc-300">
              • {rule}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function RulesPage() {
  return (
    <>
      <PageContainer
        title="Règles"
        description="Les règles de la compétition de pronostics."
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-6">
        <div className="space-y-8">
          {renderPreTournamentRules()}
          {renderMatchPredictionRules()}
          {renderSpecialRules()}
        </div>
      </div>
    </>
  );
}
