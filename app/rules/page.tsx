import { PageContainer } from "@/components/PageContainer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import rulesConfig from "@/config/rules.json";
import type { CompetitionRulesJson } from "@/types/rules";

async function getRules(): Promise<CompetitionRulesJson> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("rules")
      .select("rules_json")
      .eq("is_active", true)
      .limit(1)
      .single();

    console.log("[RulesPage] Supabase rules response", { data, error });

    if (error || !data?.rules_json) {
      return rulesConfig as CompetitionRulesJson;
    }

    return data.rules_json as CompetitionRulesJson;
  } catch (err) {
    console.error("[RulesPage] failed to load rules from Supabase", err);
    return rulesConfig as CompetitionRulesJson;
  }
}

function renderRules(rules: CompetitionRulesJson) {
  return (
    <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        These rules are loaded from the active scoring rules in Supabase when available.
        If the database is unavailable, a static fallback is shown.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-4 text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
        {JSON.stringify(rules, null, 2)}
      </pre>
    </div>
  );
}

export default async function RulesPage() {
  const rules = await getRules();

  return (
    <>
      <PageContainer
        title="Rules"
        description="Competition rules are loaded from Supabase or a static fallback."
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-6">
        {renderRules(rules)}
      </div>
    </>
  );
}
