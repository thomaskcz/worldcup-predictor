import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase.rpc("get_score_evolution");

    if (error) {
      console.error("[LeaderboardEvolution] RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch evolution data.";
    console.error("[LeaderboardEvolution] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
