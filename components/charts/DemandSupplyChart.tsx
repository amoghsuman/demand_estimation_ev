"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { DataPoint } from "@/lib/types";
import {
  CHART_COPPER,
  CHART_MUTED,
  CHART_SIGNAL,
  CHART_INK,
  colorForSeverity,
  severityBadge,
} from "@/lib/chartColors";

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function cleanLocationName(name: string) {
  const idx = name.indexOf(", Pincode ");
  if (idx !== -1) return name.slice(0, idx);
  return name.length > 20 ? `${name.slice(0, 19)}…` : name;
}

interface Row {
  id: string;
  name: string;
  cleanName: string;
  city: string;
  evPct: number;
  chargersPct: number;
  evRaw: number;
  chargersRaw: number;
  needed: number;
  shortfall: number;
  gapScore: number;
  recommendedChargerType: string;
  category: string;
  point: DataPoint;
}

type SortOption = "gap" | "shortfall" | "evs";

export default function DemandSupplyChart({
  points,
  onSelectPoint,
}: {
  points: DataPoint[];
  onSelectPoint?: (point: DataPoint) => void;
}) {
  const [sortBy, setSortBy] = useState<SortOption>("gap");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedPoints = useMemo(() => {
    const list = [...points];
    if (sortBy === "gap") list.sort((a, b) => b.gapScore - a.gapScore);
    else if (sortBy === "shortfall") list.sort((a, b) => b.shortfall - a.shortfall);
    else if (sortBy === "evs") list.sort((a, b) => b.evRegistrations - a.evRegistrations);
    return list;
  }, [points, sortBy]);

  const maxEv = Math.max(...points.map((p) => p.evRegistrations), 1);
  const maxChargers = Math.max(...points.map((p) => p.existingChargers), 1);

  const data: Row[] = sortedPoints.map((p) => ({
    id: p.id,
    name: p.name,
    cleanName: cleanLocationName(p.name),
    city: p.city,
    evPct: (p.evRegistrations / maxEv) * 100,
    chargersPct: (p.existingChargers / maxChargers) * 100,
    evRaw: p.evRegistrations,
    chargersRaw: p.existingChargers,
    needed: p.chargersNeeded,
    shortfall: p.shortfall,
    gapScore: p.gapScore,
    recommendedChargerType: p.recommendedChargerType,
    category: p.category,
    point: p,
  }));

  const totalShortfall = sortedPoints.reduce((acc, p) => acc + p.shortfall, 0);
  const avgGap = Math.round(sortedPoints.reduce((acc, p) => acc + p.gapScore, 0) / (sortedPoints.length || 1));

  const height = data.length * 36 + 20;

  return (
    <div className="space-y-3">
      {/* Chart controls & quick insights */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <span className="font-bold text-slate-900">Sort by:</span>
          {(
            [
              { key: "gap", label: "Gap score" },
              { key: "shortfall", label: "Shortfall" },
              { key: "evs", label: "EV count" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`rounded-md px-2.5 py-0.5 text-xs font-semibold transition-all ${
                sortBy === opt.key
                  ? "bg-slate-900 text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-700 font-medium">
            Combined shortfall: <strong className="font-bold text-rose-700 font-mono">{totalShortfall}</strong>
          </span>
          <span className="text-slate-700 font-medium">
            Avg gap: <strong className="font-bold text-slate-950 font-mono">{avgGap}/99</strong>
          </span>
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 90, bottom: 4, left: 0 }}
            barCategoryGap={12}
            onMouseMove={(state: any) => {
              const activeId = state?.activePayload?.[0]?.payload?.id;
              if (activeId) setHoveredId(activeId);
            }}
            onMouseLeave={() => setHoveredId(null)}
          >
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="cleanName"
              width={108}
              tick={(props: any) => {
                const { x, y, payload } = props;
                const row = data.find((d) => d.cleanName === payload.value);
                const isHovered = hoveredId === row?.id;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-6}
                      y={-3}
                      textAnchor="end"
                      fill={isHovered ? CHART_INK : CHART_MUTED}
                      fontSize={11}
                      fontWeight={isHovered ? 600 : 500}
                      className="cursor-pointer transition-colors"
                      onClick={() => row && onSelectPoint?.(row.point)}
                    >
                      {payload.value}
                    </text>
                    <text
                      x={-6}
                      y={9}
                      textAnchor="end"
                      fill={CHART_MUTED}
                      fontSize={9}
                      opacity={0.8}
                    >
                      {row?.city}
                    </text>
                  </g>
                );
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row: Row = payload[0]?.payload;
                if (!row) return null;
                const badge = severityBadge(row.gapScore);
                const segs = row.point.segmentCounts;
                const segTotal = segs.twoWheeler + segs.threeWheeler + segs.fourWheeler + segs.fleet;

                return (
                  <div className="min-w-[240px] rounded-lg border border-line bg-panel p-3 shadow-xl text-xs font-sans">
                    <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                      <div>
                        <div className="font-display font-semibold text-sm text-ink">{row.name}</div>
                        <div className="text-[11px] text-muted">
                          {row.city} · {row.category}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted">Registered EVs:</span>
                        <span className="font-bold text-ink">{row.evRaw.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Existing Public Chargers:</span>
                        <span className="font-semibold text-signal">{row.chargersRaw}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Target Needed (Density):</span>
                        <span className="font-semibold text-ink">{row.needed}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-rose-700">Net Shortfall:</span>
                        <span className="text-rose-700 font-bold">-{row.shortfall} chargers</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-line/50">
                        <span className="text-muted">Gap Score:</span>
                        <span className="font-bold text-ink">{row.gapScore} / 99</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Daily Charging Sessions:</span>
                        <span className="font-medium text-ink">
                          {(row.point.estimatedDailyTransactions ?? 0).toLocaleString("en-IN")} txns/day
                        </span>
                      </div>

                      {/* Precise Segment Breakdown */}
                      <div className="pt-1.5 border-t border-line/50 text-[11px] space-y-1">
                        <span className="text-muted">Local Fleet Composition:</span>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                          <span>
                            2W: <strong className="text-ink">{segs.twoWheeler.toLocaleString("en-IN")}</strong> ({Math.round((segs.twoWheeler / segTotal) * 100)}%)
                          </span>
                          <span>
                            3W: <strong className="text-ink">{segs.threeWheeler.toLocaleString("en-IN")}</strong> ({Math.round((segs.threeWheeler / segTotal) * 100)}%)
                          </span>
                          <span>
                            4W: <strong className="text-ink">{segs.fourWheeler.toLocaleString("en-IN")}</strong> ({Math.round((segs.fourWheeler / segTotal) * 100)}%)
                          </span>
                          <span>
                            Fleet: <strong className="text-ink">{segs.fleet.toLocaleString("en-IN")}</strong> ({Math.round((segs.fleet / segTotal) * 100)}%)
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-muted pt-1 border-t border-line/50">
                        Recommended: <strong className="text-ink font-semibold">{row.recommendedChargerType}</strong>
                      </div>
                    </div>

                    {onSelectPoint && (
                      <div className="mt-2.5 pt-1.5 border-t border-line/60 text-[10px] text-copperSoft font-medium">
                        Click row to inspect on map & detail panel →
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* EV Registration Bar (scaled relative to max EV) */}
            <Bar
              dataKey="evPct"
              radius={[0, 4, 4, 0]}
              barSize={8}
              isAnimationActive={true}
              animationDuration={500}
              onClick={(entry: any) => onSelectPoint?.(entry.point)}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={`ev-${entry.id}`}
                  fill={CHART_COPPER}
                  opacity={hoveredId === null || hoveredId === entry.id ? 1 : 0.45}
                />
              ))}
            </Bar>

            {/* Existing Chargers Bar (scaled relative to max chargers) */}
            <Bar
              dataKey="chargersPct"
              radius={[0, 4, 4, 0]}
              barSize={8}
              isAnimationActive={true}
              animationDuration={500}
              onClick={(entry: any) => onSelectPoint?.(entry.point)}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={`chg-${entry.id}`}
                  fill={CHART_SIGNAL}
                  opacity={hoveredId === null || hoveredId === entry.id ? 1 : 0.45}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Right-aligned shortfall & gap chips overlay */}
        <div
          className="pointer-events-none absolute top-[4px] right-0 bottom-[4px] flex flex-col justify-around w-[84px]"
          style={{ height: height - 8 }}
        >
          {data.map((row) => {
            const isHovered = hoveredId === row.id;
            return (
              <div
                key={`badge-${row.id}`}
                className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded transition-all ${
                  isHovered ? "bg-panel shadow-xs" : ""
                }`}
              >
                <span className="font-semibold text-rose-700">
                  -{row.shortfall}
                </span>
                <span
                  className="rounded px-1 text-[10px] font-bold text-white"
                  style={{ backgroundColor: colorForSeverity(row.gapScore) }}
                >
                  {row.gapScore}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & explanatory subtext */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-2 text-[11px] text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COPPER }} />
            EV registrations (relative)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_SIGNAL }} />
            Existing chargers (relative)
          </span>
        </div>
        <span className="text-[10px] text-muted">
          Right tags: <span className="font-semibold text-rose-700">Shortfall</span> ·{" "}
          <span className="font-semibold text-ink">Gap score</span>
        </span>
      </div>
    </div>
  );
}

