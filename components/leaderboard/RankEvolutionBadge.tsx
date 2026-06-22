type RankEvolutionBadgeProps = {
  rankDelta: number | null;
};

export function RankEvolutionBadge({ rankDelta }: RankEvolutionBadgeProps) {
  if (rankDelta === null) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400"
        title="No change in ranking"
      >
        ➖ -
      </span>
    );
  }

  if (rankDelta > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"
        title={`+${rankDelta} places gained`}
      >
        🟢 ↑ {rankDelta}
      </span>
    );
  }

  if (rankDelta < 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400"
        title={`${rankDelta} places lost`}
      >
        🔴 ↓ {rankDelta}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400"
      title="No change in ranking"
    >
      ➖ -
    </span>
  );
}
