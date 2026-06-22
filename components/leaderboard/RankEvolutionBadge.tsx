type RankEvolutionBadgeProps = {
  previousRank: number | null;
  currentRank: number | null;
};

export function RankEvolutionBadge({ previousRank, currentRank }: RankEvolutionBadgeProps) {
  // New user - no previous rank
  if (previousRank === null || currentRank === null) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 dark:text-zinc-500"
        title="New entry"
      >
        ⚪ NEW
      </span>
    );
  }

  const delta = previousRank - currentRank;

  // No change
  if (delta === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 dark:text-zinc-500"
        title="No change in ranking"
      >
        ⚪ • 0
      </span>
    );
  }

  // Rank improved (delta > 0 means went up in ranking)
  if (delta > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
        title={`+${delta} positions gained`}
      >
        <span className="text-emerald-500">▲</span> +{delta}
      </span>
    );
  }

  // Rank decreased (delta < 0 means went down in ranking)
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"
      title={`${delta} positions lost`}
    >
      <span className="text-red-500">▼</span> {delta}
    </span>
  );
}
