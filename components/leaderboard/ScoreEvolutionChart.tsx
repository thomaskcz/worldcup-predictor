"use client";

import { useState, useMemo, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Label,
} from "recharts";
import type { RankEvolutionRow } from "@/types/database";

interface ScoreEvolutionChartProps {
  data: RankEvolutionRow[];
}

export function ScoreEvolutionChart({ data }: ScoreEvolutionChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [startMatchIndex, setStartMatchIndex] = useState<number>(0);
  const [endMatchIndex, setEndMatchIndex] = useState<number>(-1); // -1 means last match
  const chartRef = useRef<HTMLDivElement>(null);

  // Memoize data transformation
  const { userMap, allTimestamps, fullChartData, users, colors } = useMemo(() => {
    // Group by user and create series
    const userMap = new Map<string, RankEvolutionRow[]>();

    data.forEach((row) => {
      const key = row.user_id;
      if (!userMap.has(key)) {
        userMap.set(key, []);
      }
      userMap.get(key)!.push(row);
    });

    // Get all unique timestamps sorted
    const allTimestamps = Array.from(
      new Set(data.map((d) => d.start_time)),
    ).sort();

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

    return { userMap, allTimestamps, fullChartData, users, colors };
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

  // Get the latest rank for the hovered line
  const getHoveredLineLatestRank = () => {
    if (!hoveredLine) return null;
    const userRows = userMap.get(
      users.find((u) => u.nickname === hoveredLine)?.userId || ""
    );
    if (!userRows || userRows.length === 0) return null;
    const latest = userRows[userRows.length - 1];
    return {
      nickname: hoveredLine,
      rank: latest.rank,
      date: new Date(latest.start_time).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  };

  const hoveredLineInfo = getHoveredLineLatestRank();

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
        <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {payload[0].payload.timestamp}
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: #{entry.value}
          </p>
        ))}
      </div>
    );
  };

  // Custom label component for user names at end of lines
  const CustomLineLabel = (props: any) => {
    const { x, y, value, color } = props;
    return (
      <text
        x={x}
        y={y}
        fill={color}
        fontSize={12}
        fontWeight={500}
        textAnchor="start"
        dominantBaseline="middle"
        style={{
          filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.3))",
        }}
      >
        {value}
      </text>
    );
  };

  // Get available match options
  const matchOptions = allTimestamps.map((timestamp, index) => ({
    index,
    label: new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));

  return (
    <div className="relative w-full">
      {/* Floating tooltip - positioned absolutely to avoid layout shift */}
      {hoveredLineInfo && (
        <div className="absolute left-0 top-0 z-10 m-4 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {hoveredLineInfo.nickname}
          </p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            #{hoveredLineInfo.rank}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dernier match: {hoveredLineInfo.date}
          </p>
        </div>
      )}

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
        ref={chartRef}
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
              domain={[1, "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            {users.map((user, index) => {
              const isHovered = hoveredLine === user.nickname;
              const isDimmed = hoveredLine && !isHovered;

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
                  <Label
                    position="right"
                    content={<CustomLineLabel value={user.nickname} color={colors[index % colors.length]} />}
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
