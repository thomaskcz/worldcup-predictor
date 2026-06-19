import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Fetch visibility settings (authenticated users can read)
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: settings, error: settingsError } = await supabase
    .from("competition_visibility_settings")
    .select("id, show_group_predictions, show_semi_predictions, show_final_predictions")
    .single();

  if (settingsError) {
    console.error("Error fetching visibility settings:", settingsError);
    return NextResponse.json({ error: "Failed to fetch visibility settings" }, { status: 500 });
  }

  return NextResponse.json(settings);
}

// PUT - Update visibility settings (admin only)
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("users_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const body = await request.json();

  const { show_group_predictions, show_semi_predictions, show_final_predictions } = body;

  if (
    typeof show_group_predictions !== "boolean" ||
    typeof show_semi_predictions !== "boolean" ||
    typeof show_final_predictions !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Use service role client to bypass RLS for admin operations
  const adminClient = createSupabaseAdminClient();

  const { data: settings, error: updateError } = await adminClient
    .from("competition_visibility_settings")
    .update({
      show_group_predictions,
      show_semi_predictions,
      show_final_predictions,
      updated_at: new Date().toISOString(),
    })
    .select("id, show_group_predictions, show_semi_predictions, show_final_predictions")
    .single();

  if (updateError) {
    console.error("Error updating visibility settings:", updateError);
    return NextResponse.json({ error: "Failed to update visibility settings" }, { status: 500 });
  }

  return NextResponse.json(settings);
}
