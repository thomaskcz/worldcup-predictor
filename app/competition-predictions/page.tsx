import { redirect } from "next/navigation";
import { PageContainer } from "@/components/PageContainer";
import { CompetitionPredictionsForm } from "@/components/competition-predictions/CompetitionPredictionsForm";
import { CompetitionComparisonView } from "@/components/competition-predictions/CompetitionComparisonView";
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

  const [{ data: teams, error: teamsError }, { data: firstMatchData }, { data: visibilitySettings }] = await Promise.all([
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
    supabase
      .from("competition_visibility_settings")
      .select("show_group_predictions, show_semi_predictions, show_final_predictions")
      .single(),
  ]);

  if (teamsError) {
    throw new Error("Impossible de charger les équipes pour les prévisions de la compétition.");
  }

  // Fetch competition results
  const { data: competitionResults } = await supabase
    .from("competition_results")
    .select("id, stage, group_name, team_id, position");

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

  const anyVisibilityEnabled =
    visibilitySettings?.show_group_predictions ||
    visibilitySettings?.show_semi_predictions ||
    visibilitySettings?.show_final_predictions;

  const shouldShowComparison = deadlinePassed && anyVisibilityEnabled;

  const groupTeams = (teams as Team[]) ?? [];
  const groupNames = Array.from(new Set(groupTeams.map((team) => team.group_name ?? "Ungrouped"))).sort();
  const teamsMap = new Map(groupTeams.map((team) => [team.id, team]));

  return (
    <PageContainer
      title="Prévisions de la compétition"
      description={shouldShowComparison ? "Consultez les prévisions de tous les joueurs pour la compétition." : "Soumettez vos vainqueurs de groupe, deuxièmes, demi-finalistes et finalistes avant le début du tournoi."}
      showFootballAccent
    >
      {shouldShowComparison ? (
        <CompetitionComparisonView
          teams={groupTeams}
          currentUserId={user.id}
          groupNames={groupNames}
          competitionResults={competitionResults ?? []}
          teamsMap={teamsMap}
        />
      ) : (
        <CompetitionPredictionsForm
          teams={groupTeams}
          initialPredictions={initialPredictions}
          deadlinePassed={deadlinePassed}
          firstMatchStartTime={firstMatchStartTime}
        />
      )}
    </PageContainer>
  );
}
