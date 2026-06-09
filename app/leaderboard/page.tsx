import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { RecalculateScoresButton } from "@/components/leaderboard/RecalculateScoresButton";
import { PageContainer } from "@/components/PageContainer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LeaderboardRow } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("leaderboard_view")
    .select("user_id, email, nickname, total_score");

  console.log("[LeaderboardPage] Supabase leaderboard_view response", {
    data,
    error,
  });

  const rows = ((data ?? []) as LeaderboardRow[]).sort((left, right) => {
    if (right.total_score !== left.total_score) {
      return right.total_score - left.total_score;
    }

    return left.email.localeCompare(right.email);
  });

  return (
    <>
      <PageContainer
        title="Leaderboard"
        description="Rankings are based on computed match prediction scores."
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-6">
        <RecalculateScoresButton />

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {error.message}
          </p>
        ) : (
          <LeaderboardTable rows={rows} />
        )}
      </div>
    </>
  );
}
