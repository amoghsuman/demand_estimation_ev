"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Crosshair,
  MapPin,
  RotateCcw,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  ChevronDown,
} from "lucide-react";
import { DataPoint } from "@/lib/types";
import {
  CHARGER_RATIO_BENCHMARK,
  HIGHWAY_CHARGER_RATIO_BENCHMARK,
  formatShortfall,
} from "@/lib/data";
import {
  SEGMENT_COLORS,
  SEGMENT_KEYS,
  SEGMENT_LABELS,
  SEGMENT_CHARGER_HINT,
  colorForSeverity,
  SegmentKey,
} from "@/lib/chartColors";
import SegmentMixBar from "@/components/charts/SegmentMixBar";

const CHARGER_TYPE_LABELS: Record<string, string> = {
  ac_slow: "AC Slow (3.3 - 7.4 kW)",
  dc_fast: "DC Fast (30 - 60 kW)",
  ultra_fast: "Ultra-Fast (120+ kW)",
  two_wheeler_swap: "2W Battery Swap",
};

interface LocationComparePanelProps {
  pointA: DataPoint | null;
  pointB: DataPoint | null;
  activeSlot: 0 | 1;
  onSelectSlot: (slot: 0 | 1) => void;
  onSetPointA?: (point: DataPoint | null) => void;
  onSetPointB?: (point: DataPoint | null) => void;
  onSelectPoint?: (point: DataPoint, explicitSlot?: 0 | 1) => void;
  onSwapPoints?: () => void;
  onSwap?: () => void;
  onClose: () => void;
  onFocusPoint?: (point: DataPoint) => void;
  allPoints: DataPoint[];
}

export default function LocationComparePanel({
  pointA,
  pointB,
  activeSlot,
  onSelectSlot,
  onSetPointA,
  onSetPointB,
  onSelectPoint,
  onSwapPoints,
  onSwap,
  onClose,
  onFocusPoint,
  allPoints,
}: LocationComparePanelProps) {
  const [dropdownSlot, setDropdownSlot] = useState<0 | 1 | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const handleSwap = () => {
    if (onSwap) {
      onSwap();
    } else if (onSwapPoints) {
      onSwapPoints();
    }
  };

  const handleSetA = (p: DataPoint | null) => {
    if (onSetPointA) onSetPointA(p);
    if (onSelectPoint && p) onSelectPoint(p, 0);
  };

  const handleSetB = (p: DataPoint | null) => {
    if (onSetPointB) onSetPointB(p);
    if (onSelectPoint && p) onSelectPoint(p, 1);
  };

  const filteredPoints = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return allPoints;
    return allPoints.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        (p.corridorName && p.corridorName.toLowerCase().includes(q))
    );
  }, [allPoints, searchFilter]);

  // Derived metrics for Point A
  const ratioA = useMemo(() => {
    if (!pointA || pointA.existingChargers <= 0) return null;
    return Math.round(pointA.evRegistrations / pointA.existingChargers);
  }, [pointA]);

  // Derived metrics for Point B
  const ratioB = useMemo(() => {
    if (!pointB || pointB.existingChargers <= 0) return null;
    return Math.round(pointB.evRegistrations / pointB.existingChargers);
  }, [pointB]);

  // Benchmarks
  const benchA = pointA
    ? pointA.cityTier
      ? CHARGER_RATIO_BENCHMARK[pointA.cityTier]
      : HIGHWAY_CHARGER_RATIO_BENCHMARK
    : null;

  const benchB = pointB
    ? pointB.cityTier
      ? CHARGER_RATIO_BENCHMARK[pointB.cityTier]
      : HIGHWAY_CHARGER_RATIO_BENCHMARK
    : null;

  // Comparison differentials
  const demandDelta = pointA && pointB ? pointA.demandScore - pointB.demandScore : 0;
  const chargersDelta = pointA && pointB ? pointA.existingChargers - pointB.existingChargers : 0;
  const gapDelta = pointA && pointB ? pointA.gapScore - pointB.gapScore : 0;

  // Suggested points if only 1 is picked
  const suggestedOpponents = useMemo(() => {
    if (!pointA && !pointB) return allPoints.slice(0, 4);
    const existing = pointA || pointB;
    if (!existing) return allPoints.slice(0, 4);
    return allPoints
      .filter((p) => p.id !== existing.id)
      .sort((a, b) => b.demandScore - a.demandScore)
      .slice(0, 4);
  }, [pointA, pointB, allPoints]);

  return (
    <div className="flex h-full flex-col font-sans">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-ink leading-tight">
              Location Comparison
            </h2>
            <p className="text-[11px] text-muted">
              Side-by-side demand, infrastructure &amp; vehicle mix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!pointA || !pointB}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] border border-line bg-panel hover:bg-panel2 text-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none transition-colors"
            title="Swap Location A and Location B"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Swap</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink hover:bg-panel transition-colors"
            title="Exit comparison"
            aria-label="Exit comparison"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Target Slot Status & Selection Badges */}
      <div className="py-3 space-y-2 border-b border-line/60">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Location A Slot Card */}
          <div
            onClick={() => onSelectSlot(0)}
            className={`relative rounded-lg border p-2.5 cursor-pointer transition-all ${
              activeSlot === 0
                ? "border-amber-500 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/40"
                : "border-line bg-panel hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Location A
              </span>
              {pointA && (
                <div className="flex items-center gap-1">
                  {onFocusPoint && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusPoint(pointA);
                      }}
                      className="p-1 rounded text-muted hover:text-amber-300 transition-colors"
                      title="Pan map to Location A"
                    >
                      <Crosshair className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetA(null);
                    }}
                    className="p-1 rounded text-muted hover:text-ink transition-colors"
                    title="Remove Location A"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {pointA ? (
              <div>
                <h3 className="font-display text-[13px] font-bold text-ink truncate">
                  {pointA.name}
                </h3>
                <p className="text-[11px] text-muted truncate">
                  {pointA.isCorridor ? pointA.corridorName : `${pointA.city}, ${pointA.state}`}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1 rounded bg-panel2 text-muted border border-line/60">
                    {pointA.isCorridor ? "Highway" : `Tier ${pointA.cityTier}`}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400">
                    Demand {pointA.demandScore}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <p className="text-[11px] font-medium text-amber-300/90">
                  {activeSlot === 0 ? "Targeting Slot A..." : "Click to select Slot A"}
                </p>
                <p className="text-[10px] text-muted mt-0.5">Click any marker on the map</p>
              </div>
            )}

            {/* Quick change dropdown trigger */}
            <div className="mt-1.5 pt-1.5 border-t border-line/40 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownSlot((prev) => (prev === 0 ? null : 0));
                  setSearchFilter("");
                }}
                className="text-[10px] text-muted hover:text-ink flex items-center gap-0.5"
              >
                <span>{pointA ? "Change..." : "Browse list..."}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Location B Slot Card */}
          <div
            onClick={() => onSelectSlot(1)}
            className={`relative rounded-lg border p-2.5 cursor-pointer transition-all ${
              activeSlot === 1
                ? "border-sky-500 bg-sky-500/10 shadow-xs ring-1 ring-sky-500/40"
                : "border-line bg-panel hover:border-sky-500/50"
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-sky-500/25 text-sky-300">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Location B
              </span>
              {pointB && (
                <div className="flex items-center gap-1">
                  {onFocusPoint && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusPoint(pointB);
                      }}
                      className="p-1 rounded text-muted hover:text-sky-300 transition-colors"
                      title="Pan map to Location B"
                    >
                      <Crosshair className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetB(null);
                    }}
                    className="p-1 rounded text-muted hover:text-ink transition-colors"
                    title="Remove Location B"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {pointB ? (
              <div>
                <h3 className="font-display text-[13px] font-bold text-ink truncate">
                  {pointB.name}
                </h3>
                <p className="text-[11px] text-muted truncate">
                  {pointB.isCorridor ? pointB.corridorName : `${pointB.city}, ${pointB.state}`}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1 rounded bg-panel2 text-muted border border-line/60">
                    {pointB.isCorridor ? "Highway" : `Tier ${pointB.cityTier}`}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-sky-400">
                    Demand {pointB.demandScore}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <p className="text-[11px] font-medium text-sky-300/90">
                  {activeSlot === 1 ? "Targeting Slot B..." : "Click to select Slot B"}
                </p>
                <p className="text-[10px] text-muted mt-0.5">Click any marker on the map</p>
              </div>
            )}

            {/* Quick change dropdown trigger */}
            <div className="mt-1.5 pt-1.5 border-t border-line/40 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownSlot((prev) => (prev === 1 ? null : 1));
                  setSearchFilter("");
                }}
                className="text-[10px] text-muted hover:text-ink flex items-center gap-0.5"
              >
                <span>{pointB ? "Change..." : "Browse list..."}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown search modal/popover if user clicked browse list */}
        {dropdownSlot !== null && (
          <div className="rounded-md border border-line bg-panel p-2 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-line">
              <span className="text-[11px] font-semibold text-ink">
                Select location for Slot {dropdownSlot === 0 ? "A" : "B"}
              </span>
              <button
                type="button"
                onClick={() => setDropdownSlot(null)}
                className="text-muted hover:text-ink p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by name, city, or corridor..."
              className="w-full text-xs px-2 py-1.5 rounded border border-line bg-panel2 text-ink placeholder:text-muted focus:outline-none focus:border-copper"
            />
            <div className="max-h-48 overflow-y-auto mt-2 space-y-1">
              {filteredPoints.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (dropdownSlot === 0) handleSetA(p);
                    else handleSetB(p);
                    setDropdownSlot(null);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-panel2 flex items-center justify-between text-xs transition-colors"
                >
                  <span className="truncate pr-2 text-ink">
                    {p.name}{" "}
                    <span className="text-muted text-[11px]">
                      ({p.isCorridor ? p.corridorName : p.city})
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-copper shrink-0">
                    Score {p.demandScore}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-5 pt-3 pr-1">
        {/* If neither point is selected */}
        {!pointA && !pointB && (
          <div className="rounded-lg border border-dashed border-line bg-panel/50 p-6 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold text-ink">
                Select two location markers on the map
              </h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Click any charging hub or highway waypoint marker on the map to place it in
                Location A, then click a second marker to compare.
              </p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] text-muted">Or quick pick from top demand hubs:</span>
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {suggestedOpponents.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      handleSetA(p);
                      onSelectSlot(1);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded border border-line bg-panel hover:bg-panel2 text-ink transition-colors"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* If only ONE point is selected */}
        {((pointA && !pointB) || (!pointA && pointB)) && (
          <div className="rounded-lg border border-line bg-panel p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-copper animate-pulse" />
              <h4 className="text-xs font-semibold text-ink">
                1 location selected — choose second location marker
              </h4>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Click any other marker on the map to compare its demand, charging hardware, and EV
              segments directly against{" "}
              <strong className="text-ink font-semibold">{(pointA || pointB)?.name}</strong>.
            </p>
            <div className="pt-1">
              <span className="text-[11px] font-medium text-ink">Suggested comparisons:</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {suggestedOpponents.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (!pointA) handleSetA(p);
                      else handleSetB(p);
                    }}
                    className="text-left p-2 rounded border border-line bg-panel2 hover:border-copper/60 text-xs transition-colors group"
                  >
                    <div className="font-semibold text-ink truncate group-hover:text-copperSoft">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-muted flex justify-between mt-0.5">
                      <span>{p.city}</span>
                      <span className="font-mono text-copper">Score {p.demandScore}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* When BOTH locations are selected: Show comprehensive side-by-side comparison */}
        {pointA && pointB && (
          <>
            {/* Key Comparison Takeaways / Executive Pill */}
            <div className="rounded-lg border border-line bg-panel p-3 text-xs space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-copper uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                Strategic Comparison Takeaway
              </div>
              <p className="text-muted leading-relaxed text-[12px]">
                {demandDelta > 0 ? (
                  <>
                    <strong className="text-amber-400 font-semibold">{pointA.name}</strong> holds a{" "}
                    <strong className="text-ink font-semibold">+{demandDelta} pt</strong> higher
                    demand score than{" "}
                    <strong className="text-sky-400 font-semibold">{pointB.name}</strong>.
                  </>
                ) : demandDelta < 0 ? (
                  <>
                    <strong className="text-sky-400 font-semibold">{pointB.name}</strong> leads by{" "}
                    <strong className="text-ink font-semibold">+{Math.abs(demandDelta)} pts</strong>{" "}
                    in demand intensity over{" "}
                    <strong className="text-amber-400 font-semibold">{pointA.name}</strong>.
                  </>
                ) : (
                  <>Both locations share an identical demand intensity score of {pointA.demandScore}.</>
                )}{" "}
                {chargersDelta !== 0 && (
                  <span>
                    Existing charger supply is{" "}
                    <strong className="text-ink font-semibold">
                      {chargersDelta > 0
                        ? `${pointA.name} (+${chargersDelta} units)`
                        : `${pointB.name} (+${Math.abs(chargersDelta)} units)`}
                    </strong>
                    .
                  </span>
                )}
              </p>
            </div>

            {/* SECTION 1: DEMAND INTENSITY & EV ADOPTION PRESSURE */}
            <div className="rounded-lg border border-line bg-panel p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line/60">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <h3 className="font-display text-sm font-semibold text-ink">
                    1. Demand Score &amp; EV Pressure
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted uppercase">Score Metric (0–99)</span>
              </div>

              {/* Demand Score Comparative Bars */}
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-amber-300 truncate max-w-[200px]">
                      A: {pointA.name}
                    </span>
                    <span className="font-mono font-bold text-ink">
                      {pointA.demandScore}{" "}
                      <span className="text-[10px] text-muted font-normal">/ 99</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-panel2 overflow-hidden border border-line">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, pointA.demandScore))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-sky-300 truncate max-w-[200px]">
                      B: {pointB.name}
                    </span>
                    <span className="font-mono font-bold text-ink">
                      {pointB.demandScore}{" "}
                      <span className="text-[10px] text-muted font-normal">/ 99</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-panel2 overflow-hidden border border-line">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, pointB.demandScore))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Demand & Gap Metrics Table */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded bg-panel2 border border-line/60 space-y-1">
                  <div className="text-muted text-[10px]">Registered / Daily EVs</div>
                  <div className="text-xs font-bold text-amber-300 font-mono">
                    {pointA.evRegistrations.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-muted pt-1 border-t border-line/40">
                    Gap score:{" "}
                    <span
                      className="font-bold font-mono"
                      style={{ color: colorForSeverity(pointA.gapScore) }}
                    >
                      {pointA.gapScore}
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded bg-panel2 border border-line/60 space-y-1">
                  <div className="text-muted text-[10px]">Registered / Daily EVs</div>
                  <div className="text-xs font-bold text-sky-300 font-mono">
                    {pointB.evRegistrations.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-muted pt-1 border-t border-line/40">
                    Gap score:{" "}
                    <span
                      className="font-bold font-mono"
                      style={{ color: colorForSeverity(pointB.gapScore) }}
                    >
                      {pointB.gapScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: EXISTING CHARGER INFRASTRUCTURE & GAP */}
            <div className="rounded-lg border border-line bg-panel p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line/60">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-copper" />
                  <h3 className="font-display text-sm font-semibold text-ink">
                    2. Charger Infrastructure &amp; Shortfall
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted uppercase">Hardware Audit</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Location A Infrastructure */}
                <div className="rounded-md border border-amber-500/30 bg-panel2/70 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400">Location A</span>
                    <span className="text-xs font-mono font-bold text-ink">
                      {pointA.existingChargers} chargers
                    </span>
                  </div>

                  <div className="text-[11px] text-muted leading-tight">
                    {ratioA !== null ? (
                      <>
                        Ratio: <strong className="text-ink">1 per {ratioA.toLocaleString("en-IN")} EVs</strong>
                      </>
                    ) : (
                      <span className="text-signal font-semibold">0 public chargers recorded</span>
                    )}
                  </div>

                  <div className="text-[11px] text-muted pt-1 border-t border-line/50">
                    Deficit:{" "}
                    <span className="text-ink font-medium">
                      {formatShortfall(pointA.chargersNeeded, pointA.existingChargers, pointA.shortfall)}
                    </span>
                  </div>

                  <div className="text-[10px] text-muted pt-1 border-t border-line/50">
                    Rec. Hardware:{" "}
                    <span className="text-amber-300 font-medium block">
                      {CHARGER_TYPE_LABELS[pointA.recommendedChargerType]}
                    </span>
                  </div>
                </div>

                {/* Location B Infrastructure */}
                <div className="rounded-md border border-sky-500/30 bg-panel2/70 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-400">Location B</span>
                    <span className="text-xs font-mono font-bold text-ink">
                      {pointB.existingChargers} chargers
                    </span>
                  </div>

                  <div className="text-[11px] text-muted leading-tight">
                    {ratioB !== null ? (
                      <>
                        Ratio: <strong className="text-ink">1 per {ratioB.toLocaleString("en-IN")} EVs</strong>
                      </>
                    ) : (
                      <span className="text-signal font-semibold">0 public chargers recorded</span>
                    )}
                  </div>

                  <div className="text-[11px] text-muted pt-1 border-t border-line/50">
                    Deficit:{" "}
                    <span className="text-ink font-medium">
                      {formatShortfall(pointB.chargersNeeded, pointB.existingChargers, pointB.shortfall)}
                    </span>
                  </div>

                  <div className="text-[10px] text-muted pt-1 border-t border-line/50">
                    Rec. Hardware:{" "}
                    <span className="text-sky-300 font-medium block">
                      {CHARGER_TYPE_LABELS[pointB.recommendedChargerType]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Benchmark Reference */}
              <div className="rounded border border-line/60 bg-panel2 px-2.5 py-1.5 text-[11px] text-muted flex items-center justify-between">
                <span>Benchmark Guideline:</span>
                <span className="font-mono text-ink text-[10px]">
                  {pointA.cityTier ? `Tier-${pointA.cityTier}` : "Highway"}: 1 per{" "}
                  {benchA ? `${Math.round(benchA[0])}-${Math.round(benchA[1])}` : "400"} EVs
                </span>
              </div>
            </div>

            {/* SECTION 3: EV SEGMENT DISTRIBUTION COMPARISON */}
            <div className="rounded-lg border border-line bg-panel p-3.5 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-line/60">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h3 className="font-display text-sm font-semibold text-ink">
                    3. EV Segment Distribution
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted uppercase">Fleet Composition</span>
              </div>

              {/* Side-by-Side Segment Mix Bars */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-amber-300 truncate">A: {pointA.name}</span>
                    <span className="font-mono text-[10px] text-muted">
                      {pointA.evRegistrations.toLocaleString("en-IN")} total
                    </span>
                  </div>
                  <SegmentMixBar counts={pointA.segmentCounts} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-sky-300 truncate">B: {pointB.name}</span>
                    <span className="font-mono text-[10px] text-muted">
                      {pointB.evRegistrations.toLocaleString("en-IN")} total
                    </span>
                  </div>
                  <SegmentMixBar counts={pointB.segmentCounts} />
                </div>
              </div>

              {/* Granular Segment Breakdown Matrix */}
              <div className="overflow-hidden rounded-md border border-line bg-panel2 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line text-[10px] text-muted uppercase">
                      <th className="py-1.5 px-2 font-medium">Vehicle Segment</th>
                      <th className="py-1.5 px-2 font-medium text-right text-amber-300">
                        A: {pointA.name.split(" ")[0]}
                      </th>
                      <th className="py-1.5 px-2 font-medium text-right text-sky-300">
                        B: {pointB.name.split(" ")[0]}
                      </th>
                      <th className="py-1.5 px-2 font-medium text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/40">
                    {SEGMENT_KEYS.map((key) => {
                      const countA = pointA.segmentCounts[key];
                      const countB = pointB.segmentCounts[key];
                      const shareA = pointA.segmentMix[key];
                      const shareB = pointB.segmentMix[key];
                      const shareDelta = shareA - shareB;

                      return (
                        <tr key={key} className="hover:bg-panel/40">
                          <td className="py-1.5 px-2 flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: SEGMENT_COLORS[key] }}
                            />
                            <span className="text-ink font-medium text-[11px]">
                              {SEGMENT_LABELS[key]}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-[11px] text-ink">
                            {shareA}%{" "}
                            <span className="text-[10px] text-muted">
                              ({countA.toLocaleString("en-IN")})
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-[11px] text-ink">
                            {shareB}%{" "}
                            <span className="text-[10px] text-muted">
                              ({countB.toLocaleString("en-IN")})
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-[10px]">
                            {shareDelta > 0 ? (
                              <span className="text-amber-300">+{shareDelta}% A</span>
                            ) : shareDelta < 0 ? (
                              <span className="text-sky-300">+{Math.abs(shareDelta)}% B</span>
                            ) : (
                              <span className="text-muted">Par</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Hardware fit takeaway */}
              <div className="rounded border border-line/60 bg-panel2 p-2.5 text-[11px] text-muted space-y-1">
                <span className="text-ink font-semibold block">Hardware Recommendation Implication:</span>
                <p className="leading-relaxed">
                  {pointA.segmentMix.twoWheeler + pointA.segmentMix.threeWheeler > 65 ? (
                    <>
                      <strong>{pointA.name}</strong> is micro-mobility intensive (
                      {pointA.segmentMix.twoWheeler + pointA.segmentMix.threeWheeler}% 2W/3W), favoring
                      swapping kiosks &amp; AC slow chargers.
                    </>
                  ) : (
                    <>
                      <strong>{pointA.name}</strong> has significant passenger car/fleet presence,
                      warranting high-power CCS2 DC Fast chargers.
                    </>
                  )}{" "}
                  {pointB.segmentMix.twoWheeler + pointB.segmentMix.threeWheeler > 65 ? (
                    <>
                      Meanwhile, <strong>{pointB.name}</strong> is driven by 2W/3W daily commutes.
                    </>
                  ) : (
                    <>
                      Meanwhile, <strong>{pointB.name}</strong> exhibits higher 4W/Fleet energy
                      throughput ({pointB.segmentMix.fourWheeler + pointB.segmentMix.fleet}%).
                    </>
                  )}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
