import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { RecalculateScoresButton } from "@/components/leaderboard/RecalculateScoresButton";
import { PageContainer } from "@/components/PageContainer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LeaderboardDetailedRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("leaderboard_detailed_view")
    .select("*");

  console.log("[LeaderboardPage] Supabase leaderboard_detailed_view response", {
    data,
    error,
  });

  const rows = ((data ?? []) as LeaderboardDetailedRow[]).sort((left, right) => {
    if (right.total_points !== left.total_points) {
      return right.total_points - left.total_points;
    } else if (right.exact_score_count !== left.exact_score_count) {
      return right.exact_score_count - left.exact_score_count;
    }

    return left.email.localeCompare(right.email);
  });

  return (
    <PageContainer
      title="Classement"
      description="Le classement est basé sur les scores calculés des pronostics de match."
      showFootballAccent
    >
      <div className="mb-6">
        <RecalculateScoresButton />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 text-sm text-rose-700 dark:border-rose-800 dark:from-rose-950/30 dark:to-zinc-900 dark:text-rose-300"
        >
          {error.message}
        </div>
      ) : (
        <LeaderboardTable rows={rows} />
      )}
    </PageContainer>
  );
}
