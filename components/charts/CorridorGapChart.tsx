"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { DataPoint } from "@/lib/types";
import { CORRIDORS } from "@/lib/data";
import {
  CHART_MUTED,
  CHART_INK,
} from "@/lib/chartColors";

function cleanStopName(name: string) {
  return name.length > 20 ? `${name.slice(0, 19)}…` : name;
}

interface CorridorGapChartProps {
  points: DataPoint[];
  onSelectPoint?: (point: DataPoint) => void;
  onSelectCorridor?: (corridorId: string | null) => void;
}

export default function CorridorGapChart({
  points,
  onSelectPoint,
  onSelectCorridor,
}: CorridorGapChartProps) {
  const [selectedCorridor, setSelectedCorridor] = useState<string>("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Extract unique corridors
  const corridors = useMemo(() => {
    const set = new Set<string>();
    points.forEach((p) => {
      if (p.corridorName) set.add(p.corridorName);
    });
    return Array.from(set);
  }, [points]);

  // Filtered points
  const filteredPoints = useMemo(() => {
    let list = [...points];
    if (selectedCorridor !== "all") {
      list = list.filter((p) => p.corridorName === selectedCorridor);
    }
    // Sort by distance descending so greatest range gaps appear first
    return list.sort((a, b) => b.distanceToNearestChargerKm - a.distanceToNearestChargerKm);
  }, [points, selectedCorridor]);

  const criticalGapsCount = useMemo(
    () => points.filter((p) => p.distanceToNearestChargerKm > 50).length,
    [points]
  );

  const data = filteredPoints.map((p) => ({
    id: p.id,
    name: cleanStopName(p.name),
    fullName: p.name,
    corridorName: p.corridorName ?? "Highway Route",
    distance: p.distanceToNearestChargerKm,
    gapScore: p.gapScore,
    needScore: p.needScore ?? p.gapScore,
    dailyEvs: p.evRegistrations,
    dailyTxns: p.estimatedDailyTransactions ?? 0,
    evDensity: p.evDensity ?? "Medium",
    shortfall: p.shortfall,
    point: p,
  }));

  const height = Math.max(data.length * 34 + 20, 180);

  return (
    <div className="space-y-3">
      {/* Top Filter and Highway Spacing Alert */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <span className="font-bold text-slate-900">Corridor:</span>
          <select
            value={selectedCorridor}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCorridor(val);
              if (onSelectCorridor) {
                if (val === "all") {
                  onSelectCorridor(null);
                } else {
                  const match = CORRIDORS.find((c) => c.name === val);
                  onSelectCorridor(match ? match.id : null);
                }
              }
            }}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-950 focus:outline-none focus:ring-1 focus:ring-copper shadow-2xs cursor-pointer"
          >
            <option value="all">All highway corridors ({points.length} stops)</option>
            {corridors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-2.5 py-1 font-bold text-rose-950 border border-rose-300 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
            {criticalGapsCount} stops &gt;50 km dead-zone
          </span>
        </div>
      </div>

      {/* Bar Chart with 50km Reference Line */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 90, bottom: 4, left: 0 }}
            barCategoryGap={10}
            onMouseMove={(e: any) => {
              const activeId = e?.activePayload?.[0]?.payload?.id;
              if (activeId) setHoveredId(activeId);
            }}
            onMouseLeave={() => setHoveredId(null)}
          >
            <XAxis
              type="number"
              domain={[0, (dataMax: number) => Math.max(dataMax + 10, 80)]}
              hide
            />
            <YAxis
              type="category"
              dataKey="name"
              width={104}
              tick={(props: any) => {
                const { x, y, payload } = props;
                const row = data.find((d) => d.name === payload.value);
                const isHovered = hoveredId === row?.id;
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-6}
                      y={-2}
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
                      y={10}
                      textAnchor="end"
                      fill={CHART_MUTED}
                      fontSize={9}
                      opacity={0.75}
                    >
                      {row?.corridorName.split(" ")[0]}
                    </text>
                  </g>
                );
              }}
              axisLine={false}
              tickLine={false}
            />

            {/* MoP 50km corridor spacing guideline reference */}
            <ReferenceLine
              x={50}
              stroke="#B43424"
              strokeDasharray="3 3"
              strokeWidth={1.5}
            />

            <Tooltip
              wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload;
                if (!row) return null;
                const isCritical = row.distance > 50;
                const variance = row.distance - 50;

                return (
                  <div className="min-w-[240px] rounded-lg border border-line bg-panel p-3 text-xs shadow-xl font-sans">
                    <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                      <div>
                        <div className="font-display font-semibold text-sm text-ink">{row.fullName}</div>
                        <div className="text-[11px] text-muted">{row.corridorName}</div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                          isCritical
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {isCritical ? "Critical Dead-Zone" : "Compliant Spacing"}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex justify-between font-medium">
                        <span className="text-muted">Distance to Nearest Charger:</span>
                        <span className={`text-sm ${isCritical ? "text-rose-700 font-bold" : "text-signal font-semibold"}`}>
                          {row.distance} km
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">MoP 50km Guideline:</span>
                        <span className={isCritical ? "text-rose-700 font-semibold" : "text-signal font-medium"}>
                          {isCritical ? `+${variance} km over safe limit` : `${Math.abs(variance)} km buffer`}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-line/50">
                        <span className="text-muted">Est. Daily Transiting EVs:</span>
                        <span className="font-bold text-ink">{row.dailyEvs.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Est. Daily Transactions:</span>
                        <span className="font-medium text-ink">
                          {row.dailyTxns.toLocaleString("en-IN")} sessions/day
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">EV Traffic Density:</span>
                        <span className="font-semibold text-ink">{row.evDensity}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-line/50 font-medium">
                        <span className="text-muted">Need Score:</span>
                        <span className="font-bold text-ink">{row.needScore} / 99</span>
                      </div>
                      <div className="text-[11px] text-muted pt-1 border-t border-line/50">
                        Recommended: <strong className="text-ink font-semibold">{row.point.recommendedChargerType}</strong>
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

            <Bar
              dataKey="distance"
              radius={[0, 4, 4, 0]}
              barSize={10}
              isAnimationActive={true}
              animationDuration={500}
              onClick={(entry: any) => onSelectPoint?.(entry.point)}
              className="cursor-pointer"
            >
              {data.map((d) => {
                // Color by distance risk:
                const color =
                  d.distance > 60
                    ? "#B43424" // Critical dead-zone
                    : d.distance > 40
                    ? "#C9A227" // Moderate
                    : "#2C6E52"; // Safe spacing
                return (
                  <Cell
                    key={`bar-${d.id}`}
                    fill={color}
                    opacity={hoveredId === null || hoveredId === d.id ? 1 : 0.45}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Right Distance & Need Badges */}
        <div
          className="pointer-events-none absolute top-[4px] right-0 bottom-[4px] flex flex-col justify-around w-[84px]"
          style={{ height: height - 8 }}
        >
          {data.map((row) => {
            const isCritical = row.distance > 50;
            const isHovered = hoveredId === row.id;
            return (
              <div
                key={`badge-${row.id}`}
                className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded transition-all ${
                  isHovered ? "bg-panel shadow-xs" : ""
                }`}
              >
                <span
                  className={`font-semibold ${
                    isCritical ? "text-rose-700" : "text-ink"
                  }`}
                >
                  {row.distance} km
                </span>
                <span className="rounded bg-line/80 px-1 text-[10px] font-bold text-ink">
                  {row.needScore}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-2 text-[11px] text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-600" />
            Critical &gt;60km
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-copper" />
            Moderate 40–60km
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-signal" />
            Adequate &lt;40km
          </span>
        </div>
        <span className="text-[10px]">
          Dashed line: <strong className="text-rose-700 font-medium">50 km threshold</strong> (NHAI &amp; MoP highway guideline)
        </span>
      </div>
    </div>
  );
}

