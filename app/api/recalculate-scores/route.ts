import { NextResponse } from "next/server";
import { recalculateScores } from "@/lib/recalculateScores";
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
    const result = await recalculateScores(adminClient);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to recalculate scores.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
