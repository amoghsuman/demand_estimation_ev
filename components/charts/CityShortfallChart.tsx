"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { CHART_MUTED, TOOLTIP_STYLE, colorForSeverity } from "@/lib/chartColors";

export default function CityShortfallChart({
  cities,
}: {
  cities: { city: string; shortfall: number }[];
}) {
  const maxShortfall = Math.max(...cities.map((c) => c.shortfall), 1);
  const height = cities.length * 26 + 16;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={cities}
          layout="vertical"
          margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
          barCategoryGap={8}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="city"
            width={96}
            tick={{ fill: CHART_MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={((value: number) => [`${value} chargers short`, "Total shortfall"]) as any}
          />
          <Bar dataKey="shortfall" radius={[0, 3, 3, 0]} barSize={8} isAnimationActive={false}>
            {cities.map((c, i) => (
              <Cell key={i} fill={colorForSeverity(c.shortfall, maxShortfall)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
        <span>Color = shortfall severity:</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "rgb(44,110,82)" }} />
          Low
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "rgb(201,162,39)" }} />
          High
        </span>
      </div>
    </div>
  );
}
