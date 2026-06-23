"use client";

import { useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { ScoreEvolutionRow } from "@/types/database";

interface ScoreEvolutionChartProps {
  data: ScoreEvolutionRow[];
}

export function ScoreEvolutionChart({ data }: ScoreEvolutionChartProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

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
      point[nickname] = userRow?.cumulative_score || 0;
    });

    return point;
  });

  // Filter data based on zoom range
  const chartData = zoomRange
    ? fullChartData.filter(
        (d) => Number(d.rawTimestamp) >= zoomRange.start && Number(d.rawTimestamp) <= zoomRange.end
      )
    : fullChartData;

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

  // Handle drag-to-zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDragEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragEnd({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !dragEnd) return;

    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate the data range based on the drag area
    const chartWidth = rect.width;
    const startX = Math.min(dragStart.x, dragEnd.x);
    const endX = Math.max(dragStart.x, dragEnd.x);

    // If drag is too small, just reset zoom
    if (endX - startX < 20) {
      setZoomRange(null);
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // Map x coordinates to data indices
    const startIndex = Math.floor((startX / chartWidth) * fullChartData.length);
    const endIndex = Math.ceil((endX / chartWidth) * fullChartData.length);

    // Get the actual timestamps
    const startTimestamp = fullChartData[Math.max(0, startIndex)]?.rawTimestamp;
    const endTimestamp = fullChartData[Math.min(fullChartData.length - 1, endIndex)]?.rawTimestamp;

    if (startTimestamp && endTimestamp) {
      setZoomRange({ start: Number(startTimestamp), end: Number(endTimestamp) });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const resetZoom = () => {
    setZoomRange(null);
  };

  return (
    <div
      className="relative w-full"
      onMouseLeave={() => {
        setHoveredLine(null);
        if (isDragging) {
          setIsDragging(false);
          setDragStart(null);
          setDragEnd(null);
        }
      }}
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

      {/* Reset zoom button */}
      {zoomRange && (
        <button
          onClick={resetZoom}
          className="absolute right-0 top-0 z-10 m-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Réinitialiser le zoom
        </button>
      )}

      {/* Zoom hint */}
      {!zoomRange && (
        <div className="absolute right-0 top-0 z-10 m-4 rounded-lg border border-zinc-200 bg-white/90 p-2 text-xs text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-400">
          <p>🖱️ Drag: zoom sur zone</p>
        </div>
      )}

      <div
        ref={chartRef}
        className="relative"
        style={{ width: "100%", height: "500px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Selection rectangle overlay */}
        {isDragging && dragStart && dragEnd && (
          <div
            className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/20"
            style={{
              left: Math.min(dragStart.x, dragEnd.x),
              top: Math.min(dragStart.y, dragEnd.y),
              width: Math.abs(dragEnd.x - dragStart.x),
              height: Math.abs(dragEnd.y - dragStart.y),
            }}
          />
        )}

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
    </div>
  );
}
