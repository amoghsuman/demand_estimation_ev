"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { CHART_INK, CHART_MUTED, colorForSeverity, severityBadge } from "@/lib/chartColors";
import { CityShortfallSummary } from "@/lib/data";

export default function CityShortfallChart({
  cities,
}: {
  cities: (CityShortfallSummary | { city: string; shortfall: number })[];
}) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const maxShortfall = Math.max(...cities.map((c) => c.shortfall), 1);
  const height = cities.length * 30 + 16;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={cities}
          layout="vertical"
          margin={{ top: 4, right: 38, bottom: 4, left: 0 }}
          barCategoryGap={6}
          onMouseMove={(e: any) => {
            const active = e?.activePayload?.[0]?.payload?.city;
            if (active) setHoveredCity(active);
          }}
          onMouseLeave={() => setHoveredCity(null)}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="city"
            width={100}
            tick={(props: any) => {
              const { x, y, payload } = props;
              const isHovered = hoveredCity === payload.value;
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
              const row = payload[0]?.payload as CityShortfallSummary & { city: string; shortfall: number };
              if (!row) return null;
              const badge = severityBadge(row.shortfall, maxShortfall);
              const hasFullData = "sitesCount" in row && row.sitesCount !== undefined;

              return (
                <div className="min-w-[240px] rounded-lg border border-line bg-panel p-3 text-xs shadow-xl font-sans">
                  <div className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                    <div>
                      <div className="font-display font-semibold text-sm text-ink">{row.city}</div>
                      <div className="text-[11px] text-muted">
                        {hasFullData ? `${row.sitesCount} evaluated locations` : "Urban charging footprint"}
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex justify-between font-medium">
                      <span className="text-muted">Net Charger Shortfall:</span>
                      <span className="font-bold text-rose-700">-{row.shortfall} chargers</span>
                    </div>

                    {hasFullData && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted">Current Installed Chargers:</span>
                          <span className="font-semibold text-signal">{row.existingChargers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Target Chargers Needed:</span>
                          <span className="font-semibold text-ink">{row.chargersNeeded}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-line/50">
                          <span className="text-muted">Registered EVs in City:</span>
                          <span className="font-medium text-ink">{row.totalEvs.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Avg Gap Score:</span>
                          <span className="font-semibold text-ink">{row.avgGapScore} / 99</span>
                        </div>
                        {row.topDeficitSite && (
                          <div className="pt-1 border-t border-line/50 text-[11px]">
                            <span className="text-muted">Top Deficit Hotspot: </span>
                            <strong className="text-ink font-semibold">{row.topDeficitSite.name}</strong>
                            <span className="text-rose-700 font-medium"> (-{row.topDeficitSite.shortfall})</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="shortfall"
            radius={[0, 4, 4, 0]}
            barSize={10}
            isAnimationActive={true}
            animationDuration={500}
          >
            {cities.map((c, i) => {
              const isHovered = hoveredCity === c.city;
              const isDimmed = hoveredCity !== null && !isHovered;
              return (
                <Cell
                  key={i}
                  fill={colorForSeverity(c.shortfall, maxShortfall)}
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
          <span>Shortfall severity:</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "rgb(44,110,82)" }} />
            Low
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "rgb(201,162,39)" }} />
            Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "rgb(180,52,36)" }} />
            Critical
          </span>
        </div>
        <span>Hover bar for breakdown</span>
      </div>
    </div>
  );
}
