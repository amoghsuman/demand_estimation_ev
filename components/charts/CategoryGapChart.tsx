"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { AreaCategory } from "@/lib/types";
import { CHART_INK, CHART_MUTED, colorForSeverity, severityBadge } from "@/lib/chartColors";
import { CategoryGapSummary } from "@/lib/data";

const CATEGORY_META: Record<
  AreaCategory,
  { label: string; hardware: string; dwell: string; desc: string }
> = {
  residential: {
    label: "Residential",
    hardware: "AC slow (3.3kW–7.4kW) & Battery Swap",
    dwell: "6–8 hours (overnight)",
    desc: "Private parking, apartments & societies",
  },
  commercial: {
    label: "Commercial",
    hardware: "Destination DC Fast (30–60kW CCS2) & Dual AC",
    dwell: "1–3 hours (opportunity)",
    desc: "Malls, retail centers & office tech parks",
  },
  industrial: {
    label: "Industrial",
    hardware: "Depot High-Power DC & Dedicated Fleet Swap",
    dwell: "4–6 hours (shift changes)",
    desc: "Warehouses, logistics hubs & MIDC zones",
  },
  highway: {
    label: "Highway",
    hardware: "Ultra-Fast DC (60–150kW+ CCS2 Dual Gun)",
    dwell: "20–40 mins (transit)",
    desc: "Inter-city expressways & toll plazas",
  },
};

export default function CategoryGapChart({
  rows,
}: {
  rows: (CategoryGapSummary | { category: AreaCategory; avgGapScore: number })[];
}) {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const data = rows.map((r) => {
    const meta = CATEGORY_META[r.category];
    return {
      name: meta?.label ?? r.category,
      category: r.category,
      avgGapScore: r.avgGapScore,
      raw: r as CategoryGapSummary,
    };
  });

  const height = data.length * 32 + 16;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 38, bottom: 4, left: 0 }}
          barCategoryGap={6}
          onMouseMove={(e: any) => {
            const active = e?.activePayload?.[0]?.payload?.name;
            if (active) setHoveredCat(active);
          }}
          onMouseLeave={() => setHoveredCat(null)}
        >
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={(props: any) => {
              const { x, y, payload } = props;
              const isHovered = hoveredCat === payload.value;
              return (
                <text
                  x={x - 6}
                  y={y + 4}
                  textAnchor="end"
                  fill={isHovered ? CHART_INK : CHART_MUTED}
                  fontSize={11}
                  fontWeight={isHovered ? 600 : 500}
                  className="transition-colors"
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
              const item = payload[0]?.payload;
              if (!item) return null;
              const meta = CATEGORY_META[item.category as AreaCategory];
              const raw = item.raw as CategoryGapSummary;
              const badge = severityBadge(item.avgGapScore, 99);
              const hasFull = raw && "sitesCount" in raw && raw.sitesCount !== undefined;

              return (
                <div className="min-w-[250px] rounded-lg border border-line bg-panel p-3 text-xs shadow-xl font-sans">
                  <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                    <div>
                      <div className="font-display font-semibold text-sm text-ink">{item.name}</div>
                      <div className="text-[11px] text-muted">{meta?.desc}</div>
                    </div>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex justify-between font-medium">
                      <span className="text-muted">Average Gap Score:</span>
                      <span className="font-bold text-ink">{item.avgGapScore} / 99</span>
                    </div>

                    {hasFull && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted">Sites Assessed Nationally:</span>
                          <span className="font-semibold text-ink">{raw.sitesCount} locations</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Total Registered EVs:</span>
                          <span className="font-medium text-ink">{raw.totalEvs.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-rose-700">Total Charger Shortfall:</span>
                          <span className="font-bold text-rose-700">-{raw.totalShortfall} chargers</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line/50">
                          <span className="text-muted">Existing vs Needed:</span>
                          <span className="text-ink font-medium">
                            {raw.existingChargers} installed / {raw.chargersNeeded} needed
                          </span>
                        </div>
                      </>
                    )}

                    <div className="pt-1.5 border-t border-line/50 space-y-1 text-[11px]">
                      <div>
                        <span className="text-muted">Recommended: </span>
                        <strong className="text-ink font-semibold">{meta?.hardware}</strong>
                      </div>
                      <div>
                        <span className="text-muted">Typical Dwell: </span>
                        <span className="text-ink font-medium">{meta?.dwell}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="avgGapScore"
            radius={[0, 4, 4, 0]}
            barSize={10}
            isAnimationActive={true}
            animationDuration={500}
          >
            {data.map((d, i) => {
              const isHovered = hoveredCat === d.name;
              const isDimmed = hoveredCat !== null && !isHovered;
              return (
                <Cell
                  key={i}
                  fill={colorForSeverity(d.avgGapScore)}
                  opacity={isDimmed ? 0.45 : 1}
                  className="transition-opacity duration-200 cursor-pointer"
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <div className="flex items-center gap-2">
          <span>Gap score severity:</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "rgb(44,110,82)" }} />
            Balanced (&lt;35)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "rgb(201,162,39)" }} />
            Moderate (35–65)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "rgb(180,52,36)" }} />
            High (&gt;65)
          </span>
        </div>
        <span>Hover bar for details</span>
      </div>
    </div>
  );
}
