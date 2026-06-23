type RankEvolutionBadgeProps = {
  previousRank: number | null;
  currentRank: number | null;
};

export function RankEvolutionBadge({ previousRank, currentRank }: RankEvolutionBadgeProps) {
  // New user - no previous rank
  if (previousRank === null || currentRank === null) {
    return (
      <span
        className="inline-flex items-center justify-center text-xs font-medium text-zinc-300 dark:text-zinc-600"
        title="New entry"
      >
        –
      </span>
    );
  }

  const delta = previousRank - currentRank;

  // No change
  if (delta === 0) {
    return (
      <span
        className="inline-flex items-center justify-center text-xs font-medium text-zinc-400 dark:text-zinc-600"
        title="No change in ranking"
      >
        •
      </span>
    );
  }

  // Rank improved (delta > 0 means went up in ranking)
  if (delta > 0) {
    return (
      <span
        className="inline-flex items-center justify-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
        title={`+${delta} positions gained`}
      >
        <span className="text-emerald-500">▲</span>{delta}
      </span>
    );
  }

  // Rank decreased (delta < 0 means went down in ranking)
  return (
    <span
      className="inline-flex items-center justify-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400"
      title={`${Math.abs(delta)} positions lost`}
    >
      <span className="text-red-500">▼</span>{Math.abs(delta)}
    </span>
  );
}
