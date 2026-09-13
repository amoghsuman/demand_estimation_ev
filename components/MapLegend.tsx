import { MetricKey } from "@/components/MapView";

const METRIC_LABELS: Record<MetricKey, string> = {
  gapScore: "Gap score",
  demandScore: "Demand score",
  existingChargers: "Existing chargers",
};

interface MapLegendProps {
  metric: MetricKey;
  showHeatmap?: boolean;
  showHotspots?: boolean;
  futureLoadPct?: number;
}

export default function MapLegend({
  metric,
  showHeatmap = false,
  showHotspots = false,
  futureLoadPct = 0,
}: MapLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 bg-panel/90 backdrop-blur border border-line rounded-md px-3 py-2.5 z-[500] shadow-sm space-y-2.5">
      {futureLoadPct > 0 && (
        <div className="pb-2 border-b border-line/60">
          <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Simulated +{futureLoadPct}% Load
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Future Active
            </span>
          </div>
          <p className="text-[10px] text-muted mt-0.5">All marker demand scores scaled</p>
        </div>
      )}

      {showHeatmap && (
        <div className="pb-2 border-b border-line/60">
          <div className="text-[11px] font-semibold text-ink mb-1.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-copper font-semibold">
              <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
              Demand Heatmap Overlay
            </span>
            <span className="text-[9px] font-mono font-medium px-1 rounded bg-copper/15 text-copperSoft">
              Score 0–99
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted">Low (0)</span>
            <div
              className="h-1.5 w-28 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #2C6E52 0%, #C9A227 45%, #D96B27 70%, #B43424 100%)",
              }}
            />
            <span className="text-[10px] text-muted">Peak (99)</span>
          </div>
        </div>
      )}

      {showHotspots && (
        <div className="pb-2 border-b border-line/60">
          <div className="text-[11px] font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gradient-to-br from-red-600 to-amber-500 text-white font-bold text-[8px] shadow-xs">
              #1
            </span>
            <span>Top 5 Demand Hotspots</span>
          </div>
          <p className="text-[10px] text-muted">Pinned permanently across all filters</p>
        </div>
      )}

      <div>
        <div className="text-[11px] text-ink mb-1.5">
          {showHeatmap ? `Marker: ${METRIC_LABELS[metric]}` : METRIC_LABELS[metric]}
        </div>
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
    </div>
  );
}

