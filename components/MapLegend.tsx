import { MetricKey } from "@/components/MapView";

const METRIC_LABELS: Record<MetricKey, string> = {
  gapScore: "Gap score",
  demandScore: "Demand score",
  existingChargers: "Existing chargers",
};

export default function MapLegend({ metric }: { metric: MetricKey }) {
  return (
    <div className="absolute bottom-4 left-4 bg-panel/90 backdrop-blur border border-line rounded-md px-3 py-2.5 z-[500]">
      <div className="text-[11px] text-ink mb-1.5">{METRIC_LABELS[metric]}</div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted">Low</span>
        <div
          className="h-1.5 w-16 rounded-full"
          style={{
            background: "linear-gradient(to right, rgb(44,110,82), rgb(201,162,39))",
          }}
        />
        <span className="text-[11px] text-muted">High</span>
      </div>
    </div>
  );
}
