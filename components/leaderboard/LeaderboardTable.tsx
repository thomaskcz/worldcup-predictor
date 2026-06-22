import { getDisplayName } from "@/lib/displayName";
import type { LeaderboardDetailedRow } from "@/types/database";
import { RankEvolutionBadge } from "./RankEvolutionBadge";

type LeaderboardTableProps = {
  rows: LeaderboardDetailedRow[];
};

function getRankClassName(rank: number): string {
  if (rank === 1) {
    return "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border-l-4 border-l-amber-400";
  }

  if (rank === 2) {
    return "bg-gradient-to-r from-zinc-100 to-slate-100 dark:from-zinc-800/60 dark:to-slate-800/50 border-l-4 border-l-zinc-400";
  }

  if (rank === 3) {
    return "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border-l-4 border-l-orange-400";
  }

  return "";
}

function getRankBadge(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

export function LeaderboardTable({ rows }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Aucun score pour le moment. Terminez les matchs et recalculez les scores pour remplir le classement.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
          <tr>
            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Rang
            </th>
            <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Utilisateur
            </th>
            <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total
            </th>
            <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Score matchs
            </th>
            <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Score qualifiés
            </th>
            <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Score finalistes
            </th>
            <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Bons Pronos
            </th>
            <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Scores Exacts
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row, index) => {
            const rank = index + 1;
            const rankBadge = getRankBadge(rank);

            return (
              <tr
                key={row.user_id}
                className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${getRankClassName(rank)}`}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{rankBadge}</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      #{rank}
                    </span>
                    <RankEvolutionBadge rankDelta={row.rank_delta} />
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {getDisplayName(row)}
                </td>
                <td className="px-5 py-4 text-right text-sm font-black text-emerald-600 dark:text-emerald-400 text-lg">
                  {row.total_points}
                </td>
                <td className="px-5 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {row.match_points}
                </td>
                <td className="px-5 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {row.group_stage_points}
                </td>
                <td className="px-5 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {row.knockout_points}
                </td>
                <td className="px-5 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {row.correct_predictions_count}
                </td>
                <td className="px-5 py-4 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {row.exact_score_count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
