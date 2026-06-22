import { NextResponse } from "next/server";
import { recalculateScores } from "@/lib/recalculateScores";
import { recalculateCompetitionScores } from "@/lib/scoring/recalculateCompetition";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createSupabaseAdminClient();

    // Recalculate match-based prediction scores
    const matchResult = await recalculateScores(adminClient);

    // Recalculate competition-based scores (groups, semis, finals)
    const competitionResult = await recalculateCompetitionScores(
      adminClient,
      matchResult.processedMatches,
    );

    // Return backward-compatible response that includes all results
    return NextResponse.json({
      ...matchResult,
      competition: competitionResult,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to recalculate scores.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
