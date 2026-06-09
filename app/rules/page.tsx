import { PageContainer } from "@/components/PageContainer";
import rulesConfig from "@/config/rules.json";

function formatSectionTitle(title: string) {
  return title
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderRuleValue(value: unknown) {
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return JSON.stringify(value, null, 2);
}

function renderRules() {
  return (
    <div className="space-y-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="space-y-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Les règles sont affichées à partir de la configuration locale de l&apos;application.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {rulesConfig.competition}
          </h2>
        </div>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Prévisions pré-tournoi
          </h3>
          <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            {Object.entries(rulesConfig.rules.pre_tournament_predictions).map(
              ([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatSectionTitle(key)}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {renderRuleValue(value)}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Points de pronostics de match
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Les règles suivantes s&apos;appliquent selon les différentes phases de la coupe du monde.
          </p>

          {Object.entries(rulesConfig.rules.match_predictions.stages).map(
            ([stage, stageRules]) => (
              <div
                key={stage}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {formatSectionTitle(stage)}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(stageRules as Record<string, unknown>).map(
                    ([ruleKey, ruleValue]) => (
                      <div key={ruleKey} className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-950">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {formatSectionTitle(ruleKey)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                          {renderRuleValue(ruleValue)}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Règles spéciales
          </h3>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            {Object.entries(rulesConfig.rules.special_rules).map(
              ([specialKey, specialValue]) => (
                <div key={specialKey} className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatSectionTitle(specialKey)}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {renderRuleValue(specialValue)}
                  </p>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function RulesPage() {
  return (
    <>
      <PageContainer
        title="Règles"
        description="Les règles de la compétition sont affichées à partir du fichier de configuration statique."
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-6">
        {renderRules()}
      </div>
    </>
  );
}
