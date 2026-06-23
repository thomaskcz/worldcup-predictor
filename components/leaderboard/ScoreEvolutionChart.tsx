"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Brush,
} from "recharts";
import type { ScoreEvolutionRow } from "@/types/database";

interface ScoreEvolutionChartProps {
  data: ScoreEvolutionRow[];
}

export function ScoreEvolutionChart({ data }: ScoreEvolutionChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  // Transform data into chart format
  // Group by user and create series
  const userMap = new Map<string, ScoreEvolutionRow[]>();

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
  const chartData = allTimestamps.map((timestamp) => {
    const point: Record<string, string | number> = {
      timestamp: new Date(timestamp).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };

    userMap.forEach((userRows, userId) => {
      const userRow = userRows.find((r) => r.start_time === timestamp);
      const nickname = userRow?.nickname || userRow?.email.split("@")[0] || "Unknown";
      point[nickname] = userRow?.cumulative_score || 0;
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

  // Get the latest score for the hovered line
  const getHoveredLineLatestScore = () => {
    if (!hoveredLine) return null;
    const userRows = userMap.get(
      users.find((u) => u.nickname === hoveredLine)?.userId || ""
    );
    if (!userRows || userRows.length === 0) return null;
    const latest = userRows[userRows.length - 1];
    return {
      nickname: hoveredLine,
      score: latest.cumulative_score,
      date: new Date(latest.start_time).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
    };
  };

  const hoveredLineInfo = getHoveredLineLatestScore();

  return (
    <div
      className="relative w-full"
      onMouseLeave={() => setHoveredLine(null)}
    >
      {/* Fixed info box in top-left */}
      {hoveredLineInfo && (
        <div className="absolute left-0 top-0 z-10 m-4 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {hoveredLineInfo.nickname}
          </p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {hoveredLineInfo.score} pts
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dernier match: {hoveredLineInfo.date}
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={550}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Brush
            dataKey="timestamp"
            height={30}
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.1}
            travellerWidth={10}
          />
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
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
