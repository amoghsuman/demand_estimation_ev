"use client";

import { useState, useMemo, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Zap,
  Layers,
  ChevronDown,
  Info,
} from "lucide-react";
import { DataPoint } from "@/lib/types";
import {
  SEGMENT_COLORS,
  SEGMENT_LABELS,
  CHART_MUTED,
  CHART_INK,
} from "@/lib/chartColors";
import {
  GrowthScenario,
  GrowthProjectionResult,
  calculateEvGrowthProjection,
  getGrowthProjectionForPoint,
  getGrowthProjectionForRegion,
  getGrowthProjectionForCorridor,
  getAllSelectableRegionsAndCorridors,
  SelectableRegionOrCorridor,
} from "@/lib/data";

interface EvGrowthProjectionChartProps {
  selectedPoint?: DataPoint | null;
  compact?: boolean;
}

export default function EvGrowthProjectionChart({
  selectedPoint,
  compact = false,
}: EvGrowthProjectionChartProps) {
  const [scenario, setScenario] = useState<GrowthScenario>("base");
  const [viewType, setViewType] = useState<"segments" | "chargers">("segments");
  const [customTargetId, setCustomTargetId] = useState<string | null>(null);

  const allTargets = useMemo<SelectableRegionOrCorridor[]>(() => {
    return getAllSelectableRegionsAndCorridors();
  }, []);

  // When selectedPoint changes, auto-align with the selected point's region or corridor
  useEffect(() => {
    if (selectedPoint) {
      if (selectedPoint.isCorridor && selectedPoint.corridorName) {
        const found = allTargets.find(
          (t) => t.type === "corridor" && t.name.toLowerCase() === selectedPoint.corridorName?.toLowerCase()
        );
        if (found) {
          setCustomTargetId(found.id);
          return;
        }
      } else if (selectedPoint.city) {
        const found = allTargets.find(
          (t) => t.type === "region" && t.name.toLowerCase() === selectedPoint.city.toLowerCase()
        );
        if (found) {
          setCustomTargetId(found.id);
          return;
        }
      }
    }
  }, [selectedPoint, allTargets]);

  // Compute the projection based on active selection
  const projection = useMemo<GrowthProjectionResult>(() => {
    // If in compact mode and selectedPoint is present, project for that specific site/stop
    if (compact && selectedPoint) {
      return getGrowthProjectionForPoint(selectedPoint, scenario);
    }

    // Otherwise check customTargetId or fallback to selectedPoint's city/corridor, or default to top region
    const activeTarget = allTargets.find((t) => t.id === customTargetId) ?? allTargets[0];
    if (!activeTarget) {
      // Fallback
      if (selectedPoint) {
        return getGrowthProjectionForPoint(selectedPoint, scenario);
      }
      return getGrowthProjectionForRegion("Delhi NCR", scenario);
    }

    if (activeTarget.type === "corridor") {
      return getGrowthProjectionForCorridor(activeTarget.name, scenario);
    } else {
      return getGrowthProjectionForRegion(activeTarget.name, scenario);
    }
  }, [compact, selectedPoint, customTargetId, allTargets, scenario]);

  const { targetName, targetType, baseYear, endYear, baseEvs, endEvs, cagrPct, totalMultiple, existingChargers, endChargersNeeded, newChargersRequired, years } = projection;

  const chartHeight = compact ? 220 : 280;

  return (
    <div className={`space-y-3.5 ${compact ? "" : "w-full"}`}>
      {/* Target Selector & Scope Bar (in non-compact mode) */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Scope:</span>
            <div className="relative inline-block">
              <select
                id="ev-projection-target-select"
                value={customTargetId ?? (allTargets[0]?.id || "")}
                onChange={(e) => setCustomTargetId(e.target.value)}
                className="appearance-none rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-bold text-slate-950 shadow-2xs hover:border-slate-400 focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/40 transition-colors cursor-pointer"
              >
                <optgroup label="Urban Regions">
                  {allTargets
                    .filter((t) => t.type === "region")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.pointCount} sites · {t.evCount.toLocaleString("en-IN")} EVs)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Highway Corridors">
                  {allTargets
                    .filter((t) => t.type === "corridor")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.pointCount} stops · {t.evCount.toLocaleString("en-IN")} daily EVs)
                      </option>
                    ))}
                </optgroup>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
            </div>
            <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800 capitalize">
              {targetType === "corridor" ? "Highway Corridor" : "Urban Region"}
            </span>
          </div>

          {/* View and Scenario Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-md border border-line bg-panel p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setViewType("segments")}
                className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                  viewType === "segments"
                    ? "bg-copperSoft/20 text-copper font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>Segment Mix</span>
              </button>
              <button
                type="button"
                onClick={() => setViewType("chargers")}
                className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                  viewType === "chargers"
                    ? "bg-copperSoft/20 text-copper font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Zap className="h-3 w-3" />
                <span>Charger Demand</span>
              </button>
            </div>

            {/* Scenario Pills */}
            <div className="inline-flex rounded-md border border-line bg-panel p-0.5 text-[11px]">
              {(["conservative", "base", "accelerated"] as GrowthScenario[]).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setScenario(sc)}
                  className={`rounded px-2 py-1 capitalize font-medium transition-colors ${
                    scenario === sc
                      ? "bg-ink text-panel font-semibold shadow-xs"
                      : "text-muted hover:text-ink"
                  }`}
                  title={`${sc} growth trajectory`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compact Header (when inside detail panel) */}
      {compact && (
        <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <TrendingUp className="h-3.5 w-3.5 text-copper" />
            <span>5-Year EV Trajectory (2026–2031)</span>
          </div>
          <div className="inline-flex rounded-md border border-line bg-panel p-0.5 text-[10px]">
            {(["conservative", "base", "accelerated"] as GrowthScenario[]).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScenario(sc)}
                className={`rounded px-1.5 py-0.5 capitalize transition-colors ${
                  scenario === sc
                    ? "bg-ink text-panel font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                {sc === "conservative" ? "Cons." : sc === "base" ? "Base" : "Accel."}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Metrics Summary Grid with High-Contrast Presentation */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-700">5-Year Projected CAGR</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-mono text-lg font-bold text-emerald-700">+{cagrPct}%</span>
            <span className="text-[10px] text-slate-600 font-medium">/ year</span>
          </div>
          <div className="text-[10px] text-slate-600 font-medium mt-0.5">{totalMultiple}x overall expansion</div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-700">
            {targetType === "corridor" ? "Daily Transiting EVs" : "Registered EV Fleet"}
          </div>
          <div className="mt-0.5 font-mono text-lg font-bold text-slate-950">
            {endEvs.toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-slate-600 font-medium mt-0.5">
            from {baseEvs.toLocaleString("en-IN")} in {baseYear}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-700">Projected Net Additions</div>
          <div className="mt-0.5 font-mono text-lg font-bold text-amber-900">
            +{(endEvs - baseEvs).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-slate-600 font-medium mt-0.5">through {endYear}</div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-700">Target Chargers Needed</div>
          <div className="mt-0.5 font-mono text-lg font-bold text-rose-700">
            {endChargersNeeded} units
          </div>
          <div className="text-[10px] text-slate-600 font-medium mt-0.5">
            +{newChargersRequired} new ({existingChargers} active)
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Visualization */}
      <div className="rounded-lg border border-line bg-panel/40 p-2 sm:p-3">
        <ResponsiveContainer width="100%" height={chartHeight}>
          {viewType === "segments" ? (
            <AreaChart
              data={years}
              margin={{ top: 12, right: 16, bottom: 4, left: 4 }}
            >
              <defs>
                <linearGradient id="grad2W" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEGMENT_COLORS.twoWheeler} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={SEGMENT_COLORS.twoWheeler} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="grad3W" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEGMENT_COLORS.threeWheeler} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={SEGMENT_COLORS.threeWheeler} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="grad4W" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEGMENT_COLORS.fourWheeler} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={SEGMENT_COLORS.fourWheeler} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="gradFleet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEGMENT_COLORS.fleet} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={SEGMENT_COLORS.fleet} stopOpacity={0.2} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                axisLine={{ stroke: "rgba(0,0,0,0.12)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val: number) =>
                  new Intl.NumberFormat("en-IN", {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(val)
                }
                width={46}
              />
              <Tooltip
                wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as typeof years[0];
                  if (!row) return null;
                  const isBaseline = row.year === baseYear;

                  return (
                    <div className="min-w-[240px] rounded-lg border border-line bg-panel p-3 text-xs shadow-xl font-sans">
                      <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-2">
                        <div className="font-display font-semibold text-sm text-ink">
                          Year {label} {isBaseline ? "(Current Baseline)" : "(Projected)"}
                        </div>
                        <span className="font-mono font-bold text-xs text-ink">
                          {row.totalEvs.toLocaleString("en-IN")} EVs
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        {!isBaseline && (
                          <div className="flex justify-between font-medium">
                            <span className="text-muted">YoY Volume Growth:</span>
                            <span className="font-semibold text-signal">
                              +{row.growthRatePct}% (+{row.newAdditions.toLocaleString("en-IN")} EVs)
                            </span>
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-line/50 text-[11px] space-y-1">
                          <span className="text-muted font-medium">Segment Volume Breakdown:</span>
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS.twoWheeler }} />
                                <span className="text-muted">{SEGMENT_LABELS.twoWheeler}:</span>
                              </span>
                              <span className="font-medium text-ink">
                                {row.twoWheeler.toLocaleString("en-IN")} ({Math.round((row.twoWheeler / row.totalEvs) * 100)}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS.threeWheeler }} />
                                <span className="text-muted">{SEGMENT_LABELS.threeWheeler}:</span>
                              </span>
                              <span className="font-medium text-ink">
                                {row.threeWheeler.toLocaleString("en-IN")} ({Math.round((row.threeWheeler / row.totalEvs) * 100)}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS.fourWheeler }} />
                                <span className="text-muted">{SEGMENT_LABELS.fourWheeler}:</span>
                              </span>
                              <span className="font-medium text-ink">
                                {row.fourWheeler.toLocaleString("en-IN")} ({Math.round((row.fourWheeler / row.totalEvs) * 100)}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEGMENT_COLORS.fleet }} />
                                <span className="text-muted">{SEGMENT_LABELS.fleet}:</span>
                              </span>
                              <span className="font-medium text-ink">
                                {row.fleet.toLocaleString("en-IN")} ({Math.round((row.fleet / row.totalEvs) * 100)}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between pt-2 border-t border-line/50 font-medium">
                          <span className="text-muted">Target Public Chargers:</span>
                          <span className="font-bold text-rose-700">{row.chargersNeeded} units</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Area
                type="monotone"
                dataKey="twoWheeler"
                stackId="1"
                stroke={SEGMENT_COLORS.twoWheeler}
                fill="url(#grad2W)"
                strokeWidth={2}
                name={SEGMENT_LABELS.twoWheeler}
              />
              <Area
                type="monotone"
                dataKey="threeWheeler"
                stackId="1"
                stroke={SEGMENT_COLORS.threeWheeler}
                fill="url(#grad3W)"
                strokeWidth={2}
                name={SEGMENT_LABELS.threeWheeler}
              />
              <Area
                type="monotone"
                dataKey="fourWheeler"
                stackId="1"
                stroke={SEGMENT_COLORS.fourWheeler}
                fill="url(#grad4W)"
                strokeWidth={2}
                name={SEGMENT_LABELS.fourWheeler}
              />
              <Area
                type="monotone"
                dataKey="fleet"
                stackId="1"
                stroke={SEGMENT_COLORS.fleet}
                fill="url(#gradFleet)"
                strokeWidth={2}
                name={SEGMENT_LABELS.fleet}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={years}
              margin={{ top: 12, right: 16, bottom: 4, left: 4 }}
              barCategoryGap={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                axisLine={{ stroke: "rgba(0,0,0,0.12)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART_MUTED, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as typeof years[0];
                  if (!row) return null;
                  const deficit = Math.max(0, row.chargersNeeded - existingChargers);

                  return (
                    <div className="min-w-[220px] rounded-lg border border-line bg-panel p-3 text-xs shadow-xl font-sans">
                      <div className="font-display font-semibold text-sm text-ink pb-1.5 border-b border-line/60">
                        Year {label} Charger Infrastructure
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted">Target Chargers Needed:</span>
                          <span className="font-bold text-rose-700">{row.chargersNeeded} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Currently Installed:</span>
                          <span className="font-semibold text-signal">{existingChargers} units</span>
                        </div>
                        <div className="flex justify-between font-medium pt-1 border-t border-line/50">
                          <span className="text-muted">Cumulative Gap:</span>
                          <span className="font-bold text-rose-700">+{deficit} new stations</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted">
                          <span>EV Population:</span>
                          <span className="text-ink font-medium">{row.totalEvs.toLocaleString("en-IN")} EVs</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={existingChargers}
                stroke="#2C6E52"
                strokeDasharray="4 4"
                label={{
                  value: `Current: ${existingChargers}`,
                  fill: "#2C6E52",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
              <Bar
                dataKey="chargersNeeded"
                fill="#B43424"
                radius={[4, 4, 0, 0]}
                barSize={18}
                name="Chargers Needed"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Footer: Interactive Legend & Contextual Notes */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted pt-1">
        {viewType === "segments" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEGMENT_COLORS.twoWheeler }} />
              2-Wheeler
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEGMENT_COLORS.threeWheeler }} />
              3-Wheeler
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEGMENT_COLORS.fourWheeler }} />
              4-Wheeler
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEGMENT_COLORS.fleet }} />
              Commercial Fleet
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-700" />
              Projected Target Chargers
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-emerald-700" />
              Current Baseline ({existingChargers})
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 text-[10px] text-muted/80">
          <Info className="h-3 w-3 shrink-0" />
          <span>CAGR model calibrated on NITI Aayog EV Roadmap & MoP density benchmarks</span>
        </div>
      </div>
    </div>
  );
}
