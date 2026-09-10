"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DataPoint } from "@/lib/types";
import { CHART_COPPER, CHART_MUTED, CHART_SIGNAL, TOOLTIP_STYLE } from "@/lib/chartColors";

function shortenName(name: string) {
  return name.length > 15 ? `${name.slice(0, 14)}…` : name;
}

interface Row {
  name: string;
  evPct: number;
  chargersPct: number;
  evRaw: number;
  chargersRaw: number;
}

export default function DemandSupplyChart({ points }: { points: DataPoint[] }) {
  const maxEv = Math.max(...points.map((p) => p.evRegistrations), 1);
  const maxChargers = Math.max(...points.map((p) => p.existingChargers), 1);

  const data: Row[] = points.map((p) => ({
    name: shortenName(p.name),
    evPct: (p.evRegistrations / maxEv) * 100,
    chargersPct: (p.existingChargers / maxChargers) * 100,
    evRaw: p.evRegistrations,
    chargersRaw: p.existingChargers,
  }));
  const height = data.length * 28 + 16;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
          barCategoryGap={10}
        >
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="name"
            width={92}
            tick={{ fill: CHART_MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={
              ((_value: number, name: string, entry: any) => {
                const row: Row | undefined = entry?.payload;
                const raw = name === "evPct" ? row?.evRaw : row?.chargersRaw;
                return [
                  (raw ?? 0).toLocaleString("en-IN"),
                  name === "evPct" ? "EV registrations" : "Existing chargers",
                ];
              }) as any
            }
          />
          <Bar dataKey="evPct" fill={CHART_COPPER} radius={[0, 3, 3, 0]} barSize={6} isAnimationActive={false} />
          <Bar
            dataKey="chargersPct"
            fill={CHART_SIGNAL}
            radius={[0, 3, 3, 0]}
            barSize={6}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1.5 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COPPER }} />
          EV registrations
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_SIGNAL }} />
          Existing chargers
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Each bar is scaled to its own range (hover for exact counts). EV and charger counts differ
        by orders of magnitude.
      </p>
    </div>
  );
}
