import { SegmentCounts } from "@/lib/types";
import { SEGMENT_COLORS, SEGMENT_KEYS, SEGMENT_LABELS } from "@/lib/chartColors";
import { mixFromCounts } from "@/lib/data";

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function SegmentMixLegend({ counts }: { counts: SegmentCounts }) {
  const mix = mixFromCounts(counts);
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {SEGMENT_KEYS.map((key) => (
        <div key={key} className="flex items-center justify-between gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 text-muted">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: SEGMENT_COLORS[key] }}
            />
            {SEGMENT_LABELS[key]}
          </span>
          <span className="text-ink font-medium">
            {mix[key]}% · {formatCompact(counts[key])}
          </span>
        </div>
      ))}
    </div>
  );
}
