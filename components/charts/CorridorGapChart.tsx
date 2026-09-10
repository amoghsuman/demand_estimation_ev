"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { DataPoint } from "@/lib/types";
import { CHART_MUTED, TOOLTIP_STYLE, colorForSeverity } from "@/lib/chartColors";

function shorten(name: string) {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
}

export default function CorridorGapChart({ points }: { points: DataPoint[] }) {
  const data = points.map((p) => ({
    name: shorten(p.name),
    distance: p.distanceToNearestChargerKm,
    gapScore: p.gapScore,
  }));
  const height = data.length * 26 + 16;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
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
            formatter={((value: number, _name: string, entry: any) => [
              `${value} km  ·  gap score ${entry?.payload?.gapScore ?? "-"}`,
              "Distance to nearest charger",
            ]) as any}
          />
          <Bar dataKey="distance" radius={[0, 3, 3, 0]} barSize={8} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorForSeverity(d.gapScore)} />
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
