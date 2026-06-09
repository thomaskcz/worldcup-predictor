import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DebugPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: userData }, matchesResult, predictionsResult, rulesResult, userScoresResult] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.from("matches").select("*", { count: "exact", head: true }),
      supabase.from("predictions").select("*", { count: "exact", head: true }),
      supabase.from("rules").select("*", { count: "exact", head: true }),
      supabase.from("user_scores").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Debug Dashboard
      </h1>
      <div className="mt-6 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Supabase connection</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            User session: {userData?.user ? "present" : "none"}
          </p>
          {userData?.user && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as {userData.user.email} ({userData.user.id})
            </p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Table counts</h3>
          <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Matches: {matchesResult.count ?? 0}</li>
            <li>Predictions: {predictionsResult.count ?? 0}</li>
            <li>Rules rows: {rulesResult.count ?? 0}</li>
            <li>User scores: {userScoresResult.count ?? 0}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
