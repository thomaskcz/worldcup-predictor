import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompetitionPredictionsJson } from "@/types/database";

const isValidPredictionPayload = (payload: unknown): payload is { predictions_json: CompetitionPredictionsJson } => {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const data = payload as { predictions_json?: unknown };
  if (typeof data.predictions_json !== "object" || data.predictions_json === null) {
    return false;
  }

  const predictions = data.predictions_json as Record<string, unknown>;
  if (!Array.isArray(predictions.semi_finalists) || !Array.isArray(predictions.finalists)) {
    return false;
  }

  if (typeof predictions.groups !== "object" || predictions.groups === null) {
    return false;
  }

  return true;
};

const validateUniqueValues = (values: string[]) => {
  const presentValues = values.filter(Boolean);
  return new Set(presentValues).size === presentValues.length;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!isValidPredictionPayload(body)) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const predictionsJson = body.predictions_json as CompetitionPredictionsJson;

  const groupSelections = Object.values(predictionsJson.groups);
  const groupIds = groupSelections.flatMap((group) => [group.first, group.second]).filter(Boolean);
  const semiIds = predictionsJson.semi_finalists.filter(Boolean);
  const finalIds = predictionsJson.finalists.filter(Boolean);

  if (!groupSelections.every((group) => group.first !== group.second)) {
    return NextResponse.json({ error: "Winner and runner-up cannot be the same team in a group." }, { status: 400 });
  }

  if (!validateUniqueValues(semiIds)) {
    return NextResponse.json({ error: "Duplicate semi-finalists are not allowed." }, { status: 400 });
  }

  if (!validateUniqueValues(finalIds)) {
    return NextResponse.json({ error: "Duplicate finalists are not allowed." }, { status: 400 });
  }

  const selectedTeamIds = Array.from(new Set([...groupIds, ...semiIds, ...finalIds]));

  if (selectedTeamIds.length > 0) {
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id")
      .in("id", selectedTeamIds);

    if (teamsError) {
      return NextResponse.json({ error: "Unable to validate team selections." }, { status: 500 });
    }

    if (!teams || teams.length !== selectedTeamIds.length) {
      return NextResponse.json({ error: "One or more selected teams are invalid." }, { status: 400 });
    }
  }

  const { error: upsertError } = await supabase.from("competition_predictions").upsert(
    {
      user_id: user.id,
      predictions_json: predictionsJson,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
