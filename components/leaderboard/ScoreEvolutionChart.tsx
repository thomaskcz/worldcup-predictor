"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import type { RankEvolutionRow } from "@/types/database";

interface ScoreEvolutionChartProps {
  data: RankEvolutionRow[];
}

// Custom label renderer to show label only at the last data point
interface CustomLabelProps {
  x?: number;
  y?: number;
  value?: any;
  index?: number;
  nickname?: string;
  color?: string;
  isHovered?: boolean;
  isDimmed?: boolean;
  payload?: any;
  dataLength?: number;
}

function CustomLabel({
  x,
  y,
  value,
  index,
  nickname,
  color,
  isHovered,
  isDimmed,
  payload,
  dataLength,
}: CustomLabelProps) {
  // Only show label at the last data point
  if (dataLength === undefined || index !== dataLength - 1) return null;

  return (
    <text
      x={x ? x + 10 : 0}
      y={y}
      fill={color}
      fontSize={12}
      fontWeight={500}
      textAnchor="start"
      dominantBaseline="middle"
      opacity={isDimmed === true ? 0.2 : 1}
      style={{
        filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.3))",
      }}
    >
      {nickname}
    </text>
  );
}

export function ScoreEvolutionChart({ data }: ScoreEvolutionChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [startMatchIndex, setStartMatchIndex] = useState<number>(0);
  const [endMatchIndex, setEndMatchIndex] = useState<number>(-1); // -1 means last match
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([1, 1]);

  // Memoize data transformation
  const { allTimestamps, fullChartData, users, colors, matchOptions } = useMemo(() => {
    // Group by user and create series
    const userMap = new Map<string, RankEvolutionRow[]>();

    data.forEach((row) => {
      const key = row.user_id;
      if (!userMap.has(key)) {
        userMap.set(key, []);
      }
      userMap.get(key)!.push(row);
    });

    // Get all unique timestamps sorted with match info
    const timestampMap = new Map<string, { home_team: string; away_team: string }>();
    data.forEach((row) => {
      if (!timestampMap.has(row.start_time)) {
        timestampMap.set(row.start_time, {
          home_team: row.home_team,
          away_team: row.away_team,
        });
      }
    });

    const allTimestamps = Array.from(timestampMap.keys()).sort();

    // Build match options for dropdowns
    const matchOptions = allTimestamps.map((timestamp, index) => ({
      index,
      timestamp,
      label: `${timestampMap.get(timestamp)!.home_team} vs ${timestampMap.get(timestamp)!.away_team}`,
    }));

    // Build chart data array with each timestamp as a point
    const fullChartData = allTimestamps.map((timestamp) => {
      const point: Record<string, string | number> = {
        timestamp: new Date(timestamp).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        }),
        rawTimestamp: timestamp,
      };

      userMap.forEach((userRows, userId) => {
        const userRow = userRows.find((r) => r.start_time === timestamp);
        const nickname = userRow?.nickname || userRow?.email.split("@")[0] || "Unknown";
        point[nickname] = userRow?.rank || 0;
      });

      return point;
    });

    // Get unique colors for each user
    const colors = [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#ff7300",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#8dd1e1",
      "#d084d0",
      "#ffb347",
    ];

    const users = Array.from(userMap.entries()).map(([userId, rows]) => ({
      userId,
      nickname: rows[0]?.nickname || rows[0]?.email.split("@")[0] || "Unknown",
    }));

    return { allTimestamps, fullChartData, users, colors, matchOptions };
  }, [data]);

  // Filter data based on match range
  const chartData = useMemo(() => {
    const startIndex = startMatchIndex;
    const endIndex = endMatchIndex === -1 ? fullChartData.length - 1 : endMatchIndex;

    if (startIndex === 0 && endIndex === fullChartData.length - 1) {
      return fullChartData;
    }

    return fullChartData.slice(startIndex, endIndex + 1);
  }, [fullChartData, startMatchIndex, endMatchIndex]);

  // Calculate Y-axis domain from chart data
  useEffect(() => {
    if (chartData.length === 0) return;

    let minRank = Infinity;
    let maxRank = -Infinity;

    chartData.forEach((point) => {
      users.forEach((user) => {
        const rank = point[user.nickname] as number;
        if (rank > 0) {
          minRank = Math.min(minRank, rank);
          maxRank = Math.max(maxRank, rank);
        }
      });
    });

    if (minRank === Infinity) minRank = 1;
    if (maxRank === -Infinity) maxRank = 1;

    setYAxisDomain([minRank, maxRank]);
  }, [chartData, users]);

  return (
    <div className="relative w-full">
      {/* Match range filters */}
      <div className="mb-4 flex gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Début:
          </label>
          <select
            value={startMatchIndex}
            onChange={(e) => setStartMatchIndex(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {matchOptions.map((option) => (
              <option key={option.index} value={option.index}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fin:
          </label>
          <select
            value={endMatchIndex}
            onChange={(e) => setEndMatchIndex(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <option value={-1}>Dernier match</option>
            {matchOptions.slice().reverse().map((option) => (
              <option key={option.index} value={option.index}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="relative"
        style={{ width: "100%", height: "500px" }}
      >
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              reversed={true}
              domain={[yAxisDomain[0], yAxisDomain[1]]}
            />
            {users.map((user, index) => {
              const isHovered = hoveredLine === user.nickname;
              const isDimmed = Boolean(hoveredLine && !isHovered);

              return (
                <Line
                  key={user.userId}
                  type="monotone"
                  dataKey={user.nickname}
                  stroke={colors[index % colors.length]}
                  strokeWidth={isHovered ? 3 : 2}
                  dot={false}
                  activeDot={false}
                  opacity={isDimmed ? 0.2 : 1}
                  onMouseEnter={() => setHoveredLine(user.nickname)}
                  onMouseLeave={() => setHoveredLine(null)}
                >
                  <LabelList
                    content={
                      <CustomLabel
                        nickname={user.nickname}
                        color={colors[index % colors.length]}
                        isHovered={isHovered}
                        isDimmed={isDimmed}
                        dataLength={chartData.length}
                      />
                    }
                  />
                </Line>
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
