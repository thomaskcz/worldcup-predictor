import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET - Fetch all competition predictions with user profiles and scores
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch visibility settings
  const { data: visibilitySettings, error: visibilityError } = await supabase
    .from("competition_visibility_settings")
    .select("show_group_predictions, show_semi_predictions, show_final_predictions")
    .single();

  if (visibilityError || !visibilitySettings) {
    console.error("Error fetching visibility settings:", visibilityError);
    return NextResponse.json({ error: "Failed to fetch visibility settings" }, { status: 500 });
  }

  // Fetch all competition predictions with user data using the view
  const { data: predictions, error: predictionsError } = await supabase
    .from("competition_predictions_with_users")
    .select("*")
    .order("total_points", { ascending: false, nullsFirst: false });

  if (predictionsError) {
    console.error("Error fetching competition predictions:", predictionsError);
    return NextResponse.json({ error: "Failed to fetch predictions" }, { status: 500 });
  }

  // Return predictions along with visibility settings
  // The frontend will use visibility settings to decide what to display
  return NextResponse.json({
    visibility: visibilitySettings,
    predictions: predictions || [],
    currentUserId: user.id,
  });
}
