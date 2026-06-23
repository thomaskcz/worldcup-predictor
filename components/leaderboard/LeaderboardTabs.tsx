"use client";

import { LeaderboardTable } from "./LeaderboardTable";
import type { LeaderboardDetailedRow } from "@/types/database";

type LeaderboardTabsProps = {
  initialRows: LeaderboardDetailedRow[];
};

export function LeaderboardTabs({ initialRows }: LeaderboardTabsProps) {
  return (
    <div>
      <LeaderboardTable rows={initialRows} />
    </div>
  );
}
