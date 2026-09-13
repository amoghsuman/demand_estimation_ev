"use client";

import { useState } from "react";
import {
  TrendingUp,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Flame,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { MetricKey } from "@/components/MapView";

interface FutureLoadSliderProps {
  value: number; // 0 to 100 percentage increase
  onChange: (value: number) => void;
  pointsCount: number;
  avgBaselineDemand: number;
  avgSimulatedDemand: number;
  highBaselineCount: number;
  highSimulatedCount: number;
  criticalBaselineCount: number;
  criticalSimulatedCount: number;
  metric: MetricKey;
  onSelectMetric?: (metric: MetricKey) => void;
}

const PRESETS = [
  { label: "0% (Current)", value: 0, desc: "Baseline" },
  { label: "+20%", value: 20, desc: "Near-Term" },
  { label: "+50%", value: 50, desc: "Target" },
  { label: "+100%", value: 100, desc: "2x Surge" },
];

export default function FutureLoadSlider({
  value,
  onChange,
  pointsCount,
  avgBaselineDemand,
  avgSimulatedDemand,
  highBaselineCount,
  highSimulatedCount,
  criticalBaselineCount,
  criticalSimulatedCount,
  metric,
  onSelectMetric,
}: FutureLoadSliderProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const isSimulating = value > 0;
  const demandDelta = avgSimulatedDemand - avgBaselineDemand;
  const highDelta = highSimulatedCount - highBaselineCount;
  const criticalDelta = criticalSimulatedCount - criticalBaselineCount;

  if (isCollapsed) {
    return (
      <div className="absolute top-4 right-4 z-[500] animate-in fade-in duration-150">
        <div
          className={`flex items-center gap-2 bg-panel/95 backdrop-blur border shadow-md rounded-lg px-3 py-2 ${
            isSimulating
              ? "border-amber-500/50 shadow-amber-500/10"
              : "border-line"
          }`}
        >
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsCollapsed(false)}>
            <TrendingUp
              className={`h-3.5 w-3.5 ${
                isSimulating ? "text-amber-400 animate-pulse" : "text-copper"
              }`}
            />
            <span className="text-xs font-semibold text-ink">
              {isSimulating ? `+${value}% Future Load` : "Predict Future Load"}
            </span>
          </div>

          {isSimulating && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Avg {avgSimulatedDemand} (+{demandDelta})
            </span>
          )}

          <div className="flex items-center gap-1 border-l border-line/60 pl-2">
            {PRESETS.slice(1).map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange(p.value)}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all ${
                  value === p.value
                    ? "bg-copper text-white shadow-xs"
                    : "bg-panel2 hover:bg-panel text-muted hover:text-ink border border-line"
                }`}
                title={`Set to ${p.label} EV adoption`}
              >
                {p.label}
              </button>
            ))}

            {isSimulating && (
              <button
                type="button"
                onClick={() => onChange(0)}
                className="p-1 text-muted hover:text-ink rounded hover:bg-panel2"
                title="Reset to 0% baseline"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="p-1 text-muted hover:text-ink rounded hover:bg-panel2 ml-0.5"
              title="Expand simulation panel"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="predict-future-load-overlay"
      className={`absolute top-4 right-4 z-[500] w-80 bg-panel/95 backdrop-blur border shadow-xl rounded-lg p-3.5 transition-all duration-150 animate-in fade-in slide-in-from-top-2 ${
        isSimulating
          ? "border-amber-500/50 shadow-amber-500/10 ring-1 ring-amber-500/20"
          : "border-line"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-line/60">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal
            className={`h-4 w-4 ${isSimulating ? "text-amber-400" : "text-copper"}`}
          />
          <div>
            <h3 className="text-xs font-bold text-ink leading-tight">Predict Future Load</h3>
            <p className="text-[10px] text-muted">Simulate EV adoption surge on demand</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isSimulating && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded bg-panel2 hover:bg-panel text-muted hover:text-ink border border-line transition-colors"
              title="Reset to current baseline (0%)"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-muted hover:text-ink rounded hover:bg-panel2 transition-colors"
            title="Minimize to compact view"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Adoption Growth Readout & Slider */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] font-medium text-ink">EV Adoption Increase</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-base font-bold font-mono ${
                isSimulating ? "text-amber-400" : "text-ink"
              }`}
            >
              +{value}%
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                value === 0
                  ? "bg-panel2 text-muted border border-line"
                  : value <= 20
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : value <= 50
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {value === 0
                ? "Current"
                : value <= 20
                ? "Near-Term"
                : value <= 50
                ? "Target"
                : "2x Surge"}
            </span>
          </div>
        </div>

        {/* Custom Range Slider */}
        <div className="relative py-1">
          <input
            id="future-load-slider-input"
            type="range"
            min={0}
            max={100}
            step={5}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-panel2 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-line"
            aria-label="Predict future EV adoption load"
          />
          <div className="flex justify-between text-[9px] text-muted font-mono mt-1 px-0.5">
            <span className={value === 0 ? "text-ink font-bold" : ""}>0%</span>
            <span className={value === 20 ? "text-ink font-bold" : ""}>+20%</span>
            <span className={value === 50 ? "text-ink font-bold" : ""}>+50%</span>
            <span className={value === 100 ? "text-ink font-bold" : ""}>+100%</span>
          </div>
        </div>
      </div>

      {/* Preset Scenario Buttons */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {PRESETS.map((p) => {
          const isActive = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={`py-1.5 px-1 rounded text-center transition-all cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-copper to-amber-600 text-white font-bold shadow-xs border border-copperSoft"
                  : "bg-panel2 hover:bg-panel text-ink border border-line hover:border-copper/50"
              }`}
            >
              <div className="text-[11px] leading-none font-mono font-bold">{p.label}</div>
              <div
                className={`text-[8px] mt-0.5 uppercase tracking-tight ${
                  isActive ? "text-white/80" : "text-muted"
                }`}
              >
                {p.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Real-time Impact Telemetry on All Markers */}
      <div className="bg-panel2/80 rounded-md p-2.5 border border-line/70 space-y-2 mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
          <span>Marker Impact ({pointsCount} locations)</span>
          {isSimulating && (
            <span className="text-[9px] font-bold text-amber-400">Simulating</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {/* Average Demand Score */}
          <div className="bg-panel rounded p-1.5 border border-line/60">
            <div className="text-[9px] text-muted font-medium truncate">Avg Demand</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-mono font-bold text-ink">
                {avgSimulatedDemand}
              </span>
              {isSimulating && (
                <span className="text-[10px] font-mono font-semibold text-amber-400">
                  +{demandDelta}
                </span>
              )}
            </div>
            <div className="text-[8px] text-muted truncate">
              Base: {avgBaselineDemand}
            </div>
          </div>

          {/* High Demand Hubs */}
          <div className="bg-panel rounded p-1.5 border border-line/60">
            <div className="text-[9px] text-muted font-medium truncate">High (≥75)</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-mono font-bold text-ink">
                {highSimulatedCount}
              </span>
              {isSimulating && highDelta > 0 && (
                <span className="text-[10px] font-mono font-semibold text-rose-400">
                  +{highDelta}
                </span>
              )}
            </div>
            <div className="text-[8px] text-muted truncate">
              Base: {highBaselineCount}
            </div>
          </div>

          {/* Critical Overload */}
          <div className="bg-panel rounded p-1.5 border border-line/60">
            <div className="text-[9px] text-muted font-medium truncate">Critical (≥90)</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs font-mono font-bold text-rose-500">
                {criticalSimulatedCount}
              </span>
              {isSimulating && criticalDelta > 0 && (
                <span className="text-[10px] font-mono font-semibold text-rose-500">
                  +{criticalDelta}
                </span>
              )}
            </div>
            <div className="text-[8px] text-muted truncate">
              Base: {criticalBaselineCount}
            </div>
          </div>
        </div>

        {isSimulating && criticalSimulatedCount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-rose-400 pt-0.5 font-medium">
            <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
            <span>
              {criticalSimulatedCount} location{criticalSimulatedCount > 1 ? "s" : ""} exceed critical grid capacity thresholds.
            </span>
          </div>
        )}
      </div>

      {/* Layer Helper: Switch to Demand Score if currently on another metric */}
      {metric !== "demandScore" && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => onSelectMetric?.("demandScore")}
            className="w-full py-1 px-2 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-amber-400" />
              <span>Switch layer to Demand Score</span>
            </span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
