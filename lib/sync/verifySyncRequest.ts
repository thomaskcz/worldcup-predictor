export function verifySyncRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const syncSecret = process.env.SYNC_SECRET;
  const authorization = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  if (cronSecret && authorization === `Bearer ${cronSecret}`) {
    return true;
  }

  if (syncSecret && querySecret === syncSecret) {
    return true;
  }

  if (syncSecret && authorization === `Bearer ${syncSecret}`) {
    return true;
  }

  return false;
}
