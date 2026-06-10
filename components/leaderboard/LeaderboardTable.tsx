import { getDisplayName } from "@/lib/displayName";

type LeaderboardRow = {
  user_id: string;
  email: string;
  nickname: string | null;
  total_score: number;
};

type LeaderboardTableProps = {
  rows: LeaderboardRow[];
};

function getRankClassName(rank: number): string {
  if (rank === 1) {
    return "bg-amber-50 dark:bg-amber-950/40";
  }

  if (rank === 2) {
    return "bg-zinc-100 dark:bg-zinc-800/60";
  }

  if (rank === 3) {
    return "bg-orange-50 dark:bg-orange-950/30";
  }

  return "";
}

export function LeaderboardTable({ rows }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Aucun score pour le moment. Terminez les matchs et recalculez les scores pour remplir le classement.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-950">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Rang
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Utilisateur
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Score total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row, index) => {
            const rank = index + 1;

            return (
              <tr
                key={row.user_id}
                className={getRankClassName(rank)}
              >
                <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {rank}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                  {getDisplayName(row)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {row.total_score}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
