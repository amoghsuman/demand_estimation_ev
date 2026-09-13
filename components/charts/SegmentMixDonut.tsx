"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SegmentCounts } from "@/lib/types";
import {
  SEGMENT_COLORS,
  SEGMENT_KEYS,
  SEGMENT_LABELS,
  SEGMENT_CHARGER_HINT,
  SEGMENT_DESCRIPTIONS,
  SegmentKey,
  TOOLTIP_STYLE,
} from "@/lib/chartColors";
import { mixFromCounts } from "@/lib/data";
import SegmentMixLegend from "./SegmentMixLegend";

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function SegmentMixDonut({ counts }: { counts: SegmentCounts }) {
  const [hoveredKey, setHoveredKey] = useState<SegmentKey | null>(null);

  const data: { key: SegmentKey; value: number }[] = SEGMENT_KEYS.map((key) => ({
    key,
    value: counts[key],
  }));
  const mix = mixFromCounts(counts);
  const total = counts.twoWheeler + counts.threeWheeler + counts.fourWheeler + counts.fleet;

  const displayValue = hoveredKey
    ? `${mix[hoveredKey]}%`
    : formatCompact(total);
  const displayLabel = hoveredKey
    ? SEGMENT_LABELS[hoveredKey]
    : "Total EVs";
  const displaySub = hoveredKey
    ? `${counts[hoveredKey].toLocaleString("en-IN")} vehicles`
    : "Active parc";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
      <div className="relative h-[136px] w-[136px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              wrapperStyle={{ zIndex: 1000, pointerEvents: "none" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload;
                if (!item) return null;
                const key = item.key as SegmentKey;
                const val = counts[key] ?? 0;
                const pct = mix[key];

                return (
                  <div className="min-w-[230px] rounded-lg border border-line bg-panel p-3 text-xs shadow-xl font-sans">
                    <div className="flex items-center justify-between gap-2 border-b border-line/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: SEGMENT_COLORS[key] }}
                        />
                        <span className="font-display font-semibold text-sm text-ink">
                          {SEGMENT_LABELS[key]}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-ink text-xs">{pct}%</span>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex justify-between font-medium">
                        <span className="text-muted">Registered Volume:</span>
                        <span className="font-bold text-ink">{val.toLocaleString("en-IN")} EVs</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted">Total Fleet Share:</span>
                        <span className="text-muted">
                          {val.toLocaleString("en-IN")} / {total.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-line/50 text-[11px]">
                        <span className="text-muted">Recommended Charger:</span>
                        <div className="font-semibold text-ink mt-0.5">
                          {SEGMENT_CHARGER_HINT[key]}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted italic">
                        {SEGMENT_DESCRIPTIONS[key]}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius={42}
              outerRadius={58}
              paddingAngle={2.5}
              stroke="#FFFFFF"
              strokeWidth={1.5}
              isAnimationActive={true}
              animationDuration={600}
              onMouseEnter={(_, index) => setHoveredKey(data[index]?.key ?? null)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {data.map((d) => {
                const isHovered = hoveredKey === d.key;
                const isDimmed = hoveredKey !== null && !isHovered;
                return (
                  <Cell
                    key={d.key}
                    fill={SEGMENT_COLORS[d.key]}
                    opacity={isDimmed ? 0.45 : 1}
                    style={{
                      transform: isHovered ? "scale(1.04)" : "scale(1)",
                      transformOrigin: "center center",
                      transition: "all 0.2s ease-out",
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Hole Metrics Overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-lg font-bold leading-tight text-slate-950 transition-all">
            {displayValue}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
            {displayLabel}
          </span>
          <span className="text-[9px] text-slate-600 font-medium">
            {displaySub}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1 w-full">
        <SegmentMixLegend
          counts={counts}
          hoveredKey={hoveredKey}
          onHoverKey={setHoveredKey}
        />
      </div>
    </div>
  );
}

