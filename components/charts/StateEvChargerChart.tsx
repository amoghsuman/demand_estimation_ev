"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer } from "recharts";
import { StateAggregate } from "@/lib/types";
import { CHART_COPPER, CHART_MUTED, CHART_SIGNAL, TOOLTIP_STYLE } from "@/lib/chartColors";

function shorten(name: string) {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

interface Row {
  name: string;
  evPct: number;
  chargersPct: number;
  evRaw: number;
  chargersRaw: number;
  ratioLabel: string;
}

export default function StateEvChargerChart({ states }: { states: StateAggregate[] }) {
  const maxEv = Math.max(...states.map((s) => s.evRegistrations), 1);
  const maxChargers = Math.max(...states.map((s) => s.currentChargers), 1);

  const data: Row[] = states.map((s) => ({
    name: shorten(s.state),
    evPct: (s.evRegistrations / maxEv) * 100,
    chargersPct: (s.currentChargers / maxChargers) * 100,
    evRaw: s.evRegistrations,
    chargersRaw: s.currentChargers,
    ratioLabel: s.currentChargers > 0 ? `${Math.round(s.evRegistrations / s.currentChargers).toLocaleString("en-IN")}/chg` : "no chargers",
  }));
  const height = data.length * 26 + 16;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="name"
            width={78}
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
                return [(raw ?? 0).toLocaleString("en-IN"), name === "evPct" ? "EV registrations" : "Chargers"];
              }) as any
            }
          />
          <Bar dataKey="evPct" fill={CHART_COPPER} radius={[0, 3, 3, 0]} barSize={6} isAnimationActive={false} />
          <Bar dataKey="chargersPct" fill={CHART_SIGNAL} radius={[0, 3, 3, 0]} barSize={6} isAnimationActive={false}>
            <LabelList dataKey="ratioLabel" position="right" style={{ fill: CHART_MUTED, fontSize: 11 }} />
          </Bar>
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
        Bars scaled to their own range; right-hand label is EVs per existing charger (coverage ratio).
      </p>
    </div>
  );
}
