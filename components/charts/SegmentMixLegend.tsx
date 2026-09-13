"use client";

import { SegmentCounts } from "@/lib/types";
import {
  SEGMENT_COLORS,
  SEGMENT_KEYS,
  SEGMENT_LABELS,
  SEGMENT_CHARGER_HINT,
  SegmentKey,
} from "@/lib/chartColors";
import { mixFromCounts } from "@/lib/data";

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

interface SegmentMixLegendProps {
  counts: SegmentCounts;
  hoveredKey?: SegmentKey | null;
  onHoverKey?: (key: SegmentKey | null) => void;
  compact?: boolean;
}

export default function SegmentMixLegend({
  counts,
  hoveredKey,
  onHoverKey,
  compact = false,
}: SegmentMixLegendProps) {
  const mix = mixFromCounts(counts);

  return (
    <div className={`grid ${compact ? "grid-cols-2 gap-2" : "grid-cols-1 sm:grid-cols-2 gap-2.5"}`}>
      {SEGMENT_KEYS.map((key) => {
        const isHovered = hoveredKey === key;
        const isDimmed = hoveredKey !== null && hoveredKey !== undefined && !isHovered;

        return (
          <div
            key={key}
            onMouseEnter={() => onHoverKey?.(key)}
            onMouseLeave={() => onHoverKey?.(null)}
            className={`group flex flex-col justify-between rounded-md border p-2 transition-all duration-150 ${
              isHovered
                ? "border-line bg-panel shadow-xs ring-1 ring-black/5"
                : isDimmed
                ? "border-transparent bg-panel/30 opacity-60"
                : "border-line/70 bg-panel/70 hover:border-line hover:bg-panel"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform group-hover:scale-110"
                  style={{ backgroundColor: SEGMENT_COLORS[key] }}
                />
                {SEGMENT_LABELS[key]}
              </span>
              <span className="text-xs font-semibold text-ink">
                {mix[key]}%
                <span className="ml-1 text-[11px] font-normal text-muted">
                  ({formatCompact(counts[key])})
                </span>
              </span>
            </div>

            {/* Segment micro-bar */}
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line/60">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${mix[key]}%`,
                  backgroundColor: SEGMENT_COLORS[key],
                }}
              />
            </div>

            {/* Operational charger archetype note */}
            {!compact && (
              <span className="mt-1.5 truncate text-[10px] text-muted">
                {SEGMENT_CHARGER_HINT[key]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

