"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ScoreEvolutionRow } from "@/types/database";

interface ScoreEvolutionChartProps {
  data: ScoreEvolutionRow[];
}

export function ScoreEvolutionChart({ data }: ScoreEvolutionChartProps) {
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

  return (
    <div className="w-full">
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
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {users.map((user, index) => (
            <Line
              key={user.userId}
              type="monotone"
              dataKey={user.nickname}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
