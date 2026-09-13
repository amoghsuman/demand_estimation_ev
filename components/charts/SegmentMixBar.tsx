"use client";

import { useState } from "react";
import { SegmentCounts } from "@/lib/types";
import {
  SEGMENT_COLORS,
  SEGMENT_KEYS,
  SEGMENT_LABELS,
  SEGMENT_CHARGER_HINT,
  SEGMENT_DESCRIPTIONS,
  SegmentKey,
} from "@/lib/chartColors";
import { mixFromCounts } from "@/lib/data";
import SegmentMixLegend from "./SegmentMixLegend";

export default function SegmentMixBar({ counts }: { counts: SegmentCounts }) {
  const [hoveredKey, setHoveredKey] = useState<SegmentKey | null>(null);

  const mix = mixFromCounts(counts);
  const total = counts.twoWheeler + counts.threeWheeler + counts.fourWheeler + counts.fleet;

  return (
    <div className="space-y-3 relative">
      {/* Floating interactive tooltip on segment hover */}
      {hoveredKey && (
        <div className="rounded-lg border border-line bg-panel p-2.5 shadow-xl text-xs font-sans animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-1.5">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: SEGMENT_COLORS[hoveredKey] }}
              />
              <span className="font-display font-semibold text-sm text-ink">
                {SEGMENT_LABELS[hoveredKey]}
              </span>
            </div>
            <span className="font-mono font-bold text-ink text-xs">{mix[hoveredKey]}%</span>
          </div>

          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between font-medium">
              <span className="text-muted">Registered Volume:</span>
              <span className="font-bold text-ink">
                {counts[hoveredKey].toLocaleString("en-IN")} EVs
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Local Site Share:</span>
              <span>
                {counts[hoveredKey].toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="pt-1 border-t border-line/50">
              <span className="text-muted">Hardware: </span>
              <span className="font-semibold text-ink">{SEGMENT_CHARGER_HINT[hoveredKey]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Stacked Progress Bar */}
      <div className="h-4 w-full overflow-hidden rounded-full border border-line bg-panel p-0.5">
        <div className="flex h-full w-full overflow-hidden rounded-full">
          {SEGMENT_KEYS.map((key) => {
            const pct = mix[key];
            const isHovered = hoveredKey === key;
            const isDimmed = hoveredKey !== null && !isHovered;
            if (pct <= 0) return null;
            return (
              <div
                key={key}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{
                  width: `${pct}%`,
                  backgroundColor: SEGMENT_COLORS[key],
                }}
                className={`h-full transition-all duration-200 cursor-pointer ${
                  isDimmed ? "opacity-40" : "opacity-100"
                } ${isHovered ? "ring-2 ring-ink ring-inset" : ""}`}
                title={`${SEGMENT_LABELS[key]}: ${pct}% (${counts[key].toLocaleString("en-IN")} EVs)`}
              />
            );
          })}
        </div>
      </div>

      <SegmentMixLegend
        counts={counts}
        hoveredKey={hoveredKey}
        onHoverKey={setHoveredKey}
      />
    </div>
  );
}

