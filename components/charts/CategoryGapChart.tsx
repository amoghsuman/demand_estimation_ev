"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { AreaCategory } from "@/lib/types";
import { CHART_MUTED, TOOLTIP_STYLE, colorForSeverity } from "@/lib/chartColors";

const CATEGORY_LABELS: Record<AreaCategory, string> = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  highway: "Highway",
};

export default function CategoryGapChart({
  rows,
}: {
  rows: { category: AreaCategory; avgGapScore: number }[];
}) {
  const data = rows.map((r) => ({ name: CATEGORY_LABELS[r.category], avgGapScore: r.avgGapScore }));
  const height = data.length * 26 + 16;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
          barCategoryGap={8}
        >
          <XAxis type="number" hide domain={[0, 99]} />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tick={{ fill: CHART_MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={((value: number) => [value, "Average gap score"]) as any}
          />
          <Bar dataKey="avgGapScore" radius={[0, 3, 3, 0]} barSize={8} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorForSeverity(d.avgGapScore)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
        <span>Color = gap severity:</span>
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
