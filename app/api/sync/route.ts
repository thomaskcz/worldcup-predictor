import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncMatchesFromAPI } from "@/lib/sync/syncMatches";
import { syncMatchResults } from "@/lib/sync/syncResults";
import { verifySyncRequest } from "@/lib/sync/verifySyncRequest";

type SyncJob = "matches" | "results" | "all";

function getJob(request: Request): SyncJob {
  const url = new URL(request.url);
  const job = url.searchParams.get("job");

  if (job === "matches" || job === "results" || job === "all") {
    return job;
  }

  return "all";
}

async function handleSync(request: Request) {
  if (!verifySyncRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = getJob(request);

  try {
    const supabase = createSupabaseAdminClient();
    const response: Record<string, unknown> = { job };

    if (job === "matches" || job === "all") {
      response.matches = await syncMatchesFromAPI(supabase);
    }

    if (job === "results" || job === "all") {
      response.results = await syncMatchResults(supabase);
    }

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Football sync failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
