"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SegmentCounts } from "@/lib/types";
import { SEGMENT_COLORS, SEGMENT_KEYS, SEGMENT_LABELS, SegmentKey, TOOLTIP_STYLE } from "@/lib/chartColors";
import { mixFromCounts } from "@/lib/data";
import SegmentMixLegend from "./SegmentMixLegend";

export default function SegmentMixDonut({ counts }: { counts: SegmentCounts }) {
  const data: { key: SegmentKey; value: number }[] = SEGMENT_KEYS.map((key) => ({
    key,
    value: counts[key],
  }));
  const mix = mixFromCounts(counts);

  return (
    <div className="flex items-center gap-4">
      <div className="h-[84px] w-[84px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={
                ((value: number, _name: string, entry: any) => {
                  const key = entry?.payload?.key as SegmentKey;
                  return [`${value.toLocaleString("en-IN")} EVs (${mix[key]}%)`, SEGMENT_LABELS[key]];
                }) as any
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="key"
              innerRadius={24}
              outerRadius={40}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={SEGMENT_COLORS[d.key]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="min-w-0 flex-1">
        <SegmentMixLegend counts={counts} />
      </div>
    </div>
  );
}
