"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { StateAggregate } from "@/lib/types";
import {
  CHART_SIGNAL,
  CHART_COPPER,
  CHART_MUTED,
  CHART_INK,
  colorForSeverity,
} from "@/lib/chartColors";

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

interface StateEvChargerChartProps {
  states: StateAggregate[];
}

type ViewMode = "target" | "ratio";

export default function StateEvChargerChart({ states }: StateEvChargerChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("target");
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  // Aggregate national policy target metrics
  const totalInstalled = useMemo(
    () => states.reduce((acc, s) => acc + s.currentChargers, 0),
    [states]
  );
  const totalTarget = useMemo(
    () => states.reduce((acc, s) => acc + s.targetChargers, 0),
    [states]
  );
  const overallProgress = totalTarget > 0 ? Math.round((totalInstalled / totalTarget) * 100) : 0;
  const nationalShortfall = useMemo(
    () => states.reduce((acc, s) => acc + s.totalShortfall, 0),
    [states]
  );

  // Target view data
  const targetData = useMemo(() => {
    return states.map((s) => {
      const progressPct = s.targetChargers > 0 ? Math.round((s.currentChargers / s.targetChargers) * 100) : 0;
      const ratio = s.currentChargers > 0 ? Math.round(s.evRegistrations / s.currentChargers) : 0;
      return {
        state: s.state,
        currentChargers: s.currentChargers,
        targetChargers: s.targetChargers,
        progressPct,
        totalShortfall: s.totalShortfall,
        evRegistrations: s.evRegistrations,
        avgGapScore: s.avgGapScore,
        districtsCovered: s.districtsCovered,
        urbanCoveragePct: s.urbanCoveragePct,
        ruralCoveragePct: s.ruralCoveragePct,
        ratio,
        // For dual progress bar
        currentPct: Math.min(progressPct, 100),
        shortfallPct: Math.max(0, 100 - progressPct),
      };
    });
  }, [states]);

  const height = targetData.length * 36 + 20;

  return (
    <div className="space-y-3">
      {/* Top Controls & Aggregate National Policy KPI Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <span className="font-bold text-slate-900">Metric view:</span>
          <button
            onClick={() => setViewMode("target")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              viewMode === "target"
                ? "bg-slate-900 text-white font-bold shadow-2xs"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            Policy target progress
          </button>
          <button
            onClick={() => setViewMode("ratio")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
              viewMode === "ratio"
                ? "bg-slate-900 text-white font-bold shadow-2xs"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
            }`}
          >
            EVs per charger ratio
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-700 font-medium">
            National coverage: <strong className="font-bold text-emerald-700 font-mono">{overallProgress}%</strong>
          </span>
          <span className="text-slate-700 font-medium">
            Total target: <strong className="font-bold text-slate-950 font-mono">{totalTarget.toLocaleString("en-IN")}</strong>
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          {viewMode === "target" ? (
            <BarChart
              data={targetData}
              layout="vertical"
              margin={{ top: 4, right: 105, bottom: 4, left: 0 }}
              barCategoryGap={12}
              onMouseMove={(e: any) => {
                const active = e?.activePayload?.[0]?.payload?.state;
                if (active) setHoveredState(active);
              }}
              onMouseLeave={() => setHoveredState(null)}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="state"
                width={88}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const isHovered = hoveredState === payload.value;
                  return (
                    <text
                      x={x - 6}
                      y={y + 3}
                      textAnchor="end"
                      fill={isHovered ? CHART_INK : CHART_MUTED}
                      fontSize={11}
                      fontWeight={isHovered ? 600 : 500}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload;
                  if (!row) return null;
                  return (
                    <div className="min-w-[230px] rounded-lg border border-line bg-panel p-3 text-xs shadow-lg font-sans">
                      <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                        <div>
                          <div className="font-display font-semibold text-sm text-ink">{row.state}</div>
                          <div className="text-[11px] text-muted">{row.districtsCovered} assessed district sites</div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${
                            row.progressPct >= 70
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : row.progressPct >= 40
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {row.progressPct}% achieved
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted">Current Public Chargers:</span>
                          <span className="font-semibold text-signal">{row.currentChargers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Target (1:500 benchmark):</span>
                          <span className="font-semibold text-ink">{row.targetChargers}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-rose-700">Shortfall to Target:</span>
                          <span className="text-rose-700 font-semibold">-{row.totalShortfall} chargers</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line/50">
                          <span className="text-muted">Registered EVs:</span>
                          <span className="font-medium text-ink">{row.evRegistrations.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">EVs per Existing Charger:</span>
                          <span className="font-medium text-ink">1 per {row.ratio.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line/50 text-[11px]">
                          <span className="text-muted">Coverage (Urban / Rural):</span>
                          <span className="text-ink font-medium">
                            {row.urbanCoveragePct}% / {row.ruralCoveragePct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              {/* Progress achieved towards target (0-100%) */}
              <Bar
                dataKey="currentPct"
                stackId="progress"
                radius={[3, 0, 0, 3]}
                barSize={12}
                isAnimationActive={true}
                animationDuration={600}
              >
                {targetData.map((entry) => {
                  const color =
                    entry.progressPct >= 70
                      ? "#2C6E52"
                      : entry.progressPct >= 40
                      ? "#C9A227"
                      : "#B43424";
                  return (
                    <Cell
                      key={`curr-${entry.state}`}
                      fill={color}
                      opacity={hoveredState === null || hoveredState === entry.state ? 1 : 0.4}
                    />
                  );
                })}
              </Bar>

              {/* Remaining shortfall towards 100% target */}
              <Bar
                dataKey="shortfallPct"
                stackId="progress"
                radius={[0, 3, 3, 0]}
                fill="#E2DFD6"
                barSize={12}
                isAnimationActive={true}
                animationDuration={600}
              />
            </BarChart>
          ) : (
            <BarChart
              data={targetData}
              layout="vertical"
              margin={{ top: 4, right: 105, bottom: 4, left: 0 }}
              barCategoryGap={12}
              onMouseMove={(e: any) => {
                const active = e?.activePayload?.[0]?.payload?.state;
                if (active) setHoveredState(active);
              }}
              onMouseLeave={() => setHoveredState(null)}
            >
              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis
                type="category"
                dataKey="state"
                width={88}
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload;
                  if (!row) return null;
                  const deviation = (row.ratio / 500).toFixed(1);
                  const isHealthy = row.ratio <= 500;

                  return (
                    <div className="min-w-[240px] rounded-lg border border-line bg-panel p-3 text-xs shadow-xl font-sans">
                      <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                        <div>
                          <div className="font-display font-semibold text-sm text-ink">{row.state}</div>
                          <div className="text-[11px] text-muted">{row.districtsCovered} assessed district sites</div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${
                            isHealthy
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {isHealthy ? "Within Policy Limit" : `${deviation}x Benchmark`}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex justify-between font-medium">
                          <span className="text-muted">EVs per Public Charger:</span>
                          <span className={`font-bold ${isHealthy ? "text-signal" : "text-rose-700"}`}>
                            1 per {row.ratio.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted">MoP Policy Target:</span>
                          <span className="text-ink font-semibold">1 per 500 EVs</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line/50">
                          <span className="text-muted">Total Registered EVs:</span>
                          <span className="font-medium text-ink">{row.evRegistrations.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Current Public Chargers:</span>
                          <span className="font-semibold text-signal">{row.currentChargers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Target at 1:500:</span>
                          <span className="font-semibold text-ink">{row.targetChargers}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-rose-700">Net Shortfall:</span>
                          <span className="text-rose-700 font-bold">-{row.totalShortfall} chargers</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line/50 text-[11px]">
                          <span className="text-muted">Urban / Rural Coverage:</span>
                          <span className="text-ink font-medium">
                            {row.urbanCoveragePct}% / {row.ruralCoveragePct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine x={500} stroke="#2C6E52" strokeDasharray="3 3" />
              <Bar
                dataKey="ratio"
                radius={[0, 4, 4, 0]}
                barSize={10}
                isAnimationActive={true}
                animationDuration={500}
              >
                {targetData.map((entry) => (
                  <Cell
                    key={`ratio-${entry.state}`}
                    fill={colorForSeverity(Math.min(entry.ratio / 18, 99))}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>

        {/* Right tags overlay */}
        <div
          className="pointer-events-none absolute top-[4px] right-0 bottom-[4px] flex flex-col justify-around w-[98px]"
          style={{ height: height - 8 }}
        >
          {targetData.map((row) => {
            const isHovered = hoveredState === row.state;
            return (
              <div
                key={`badge-${row.state}`}
                className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded transition-all ${
                  isHovered ? "bg-panel shadow-xs" : ""
                }`}
              >
                {viewMode === "target" ? (
                  <>
                    <span className="font-medium text-ink">{row.currentChargers}/{row.targetChargers}</span>
                    <span
                      className={`text-[10px] font-bold rounded px-1 ${
                        row.progressPct >= 70
                          ? "bg-emerald-100 text-emerald-800"
                          : row.progressPct >= 40
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {row.progressPct}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold text-ink">
                      1:{formatCompact(row.ratio)}
                    </span>
                    <span className="text-[10px] text-rose-700 font-medium">
                      -{row.totalShortfall}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer explanation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-2 text-[11px] text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-signal" />
            Installed chargers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-line" />
            Remaining target gap
          </span>
        </div>
        <span>
          Target benchmark: <strong className="font-medium text-ink">1 charger per 500 EVs</strong> (MoP guideline)
        </span>
      </div>
    </div>
  );
}

