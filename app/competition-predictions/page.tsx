import { redirect } from "next/navigation";
import { PageContainer } from "@/components/PageContainer";
import { CompetitionPredictionsForm } from "@/components/competition-predictions/CompetitionPredictionsForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompetitionPredictionsJson, Team } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function CompetitionPredictionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/settings");
  }

  const [{ data: teams, error: teamsError }, { data: firstMatchData }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, fifa_code, group_name, flag_url, created_at")
      .order("group_name", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("matches")
      .select("start_time")
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (teamsError) {
    throw new Error("Unable to load teams for competition predictions.");
  }

  const predictionResponse = await supabase
    .from("competition_predictions")
    .select("predictions_json")
    .eq("user_id", user.id)
    .maybeSingle();

  const initialPredictions = (predictionResponse.data as
    | { predictions_json: CompetitionPredictionsJson }
    | null
    | undefined)?.predictions_json ?? null;

  const firstMatchStartTime = firstMatchData?.start_time ?? null;
  const deadlinePassed = firstMatchStartTime
    ? new Date().toISOString() >= new Date(firstMatchStartTime).toISOString()
    : false;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageContainer
        title="Competition Predictions"
        description="Submit your group winners, runners-up, semi-finalists, and finalists before the tournament begins."
      />
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
        <CompetitionPredictionsForm
          teams={(teams as Team[]) ?? []}
          initialPredictions={initialPredictions}
          deadlinePassed={deadlinePassed}
          firstMatchStartTime={firstMatchStartTime}
        />
      </div>
    </main>
  );
}
