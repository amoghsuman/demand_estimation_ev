"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { SegmentCounts } from "@/lib/types";
import { SEGMENT_COLORS, SEGMENT_KEYS, SEGMENT_LABELS, TOOLTIP_STYLE } from "@/lib/chartColors";
import { mixFromCounts } from "@/lib/data";
import SegmentMixLegend from "./SegmentMixLegend";

export default function SegmentMixBar({ counts }: { counts: SegmentCounts }) {
  const data = [{ name: "mix", ...counts }];
  const mix = mixFromCounts(counts);

  return (
    <div>
      <div className="h-3.5 w-full overflow-hidden rounded-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            stackOffset="expand"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={
                ((value: number, key: string) => [
                  `${value.toLocaleString("en-IN")} EVs (${mix[key as keyof SegmentCounts]}%)`,
                  SEGMENT_LABELS[key as keyof SegmentCounts],
                ]) as any
              }
            />
            {SEGMENT_KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="mix"
                fill={SEGMENT_COLORS[key]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2.5">
        <SegmentMixLegend counts={counts} />
      </div>
    </div>
  );
}
