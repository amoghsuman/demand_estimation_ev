import { MetricKey } from "@/components/MapView";

const METRIC_LABELS: Record<MetricKey, string> = {
  gapScore: "Infrastructure Gap Score",
  demandScore: "EV Demand Density",
  existingChargers: "Existing Charging Supply",
};

interface MapLegendProps {
  metric: MetricKey;
  showHeatmap?: boolean;
  showHotspots?: boolean;
  futureLoadPct?: number;
  showCorridors?: boolean;
}

export default function MapLegend({
  metric,
  showHeatmap = false,
  showHotspots = false,
  futureLoadPct = 0,
  showCorridors = true,
}: MapLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md border border-line rounded-xl px-3.5 py-3 z-[500] shadow-md space-y-2.5 max-w-[240px]">
      {futureLoadPct > 0 && (
        <div className="pb-2 border-b border-line">
          <div className="text-[11px] font-bold text-amber-700 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Simulated +{futureLoadPct}% Load
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              Future Active
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">All marker demand scores scaled</p>
        </div>
      )}

      {showHeatmap && (
        <div className="pb-2 border-b border-line">
          <div className="text-[11px] font-semibold text-slate-900 mb-1.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-amber-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              Demand Heatmap
            </span>
            <span className="text-[9px] font-mono font-medium px-1 rounded bg-amber-100 text-amber-900">
              0–99
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono">0</span>
            <div
              className="h-1.5 flex-1 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #2C6E52 0%, #C9A227 45%, #D96B27 70%, #B43424 100%)",
              }}
            />
            <span className="text-[10px] text-slate-500 font-mono">99</span>
          </div>
        </div>
      )}

      {showHotspots && (
        <div className="pb-2 border-b border-line">
          <div className="text-[11px] font-semibold text-rose-700 mb-0.5 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-red-600 to-amber-500 text-white font-bold text-[8px] shadow-xs">
              ★
            </span>
            <span>Top 5 Demand Hotspots</span>
          </div>
          <p className="text-[10px] text-slate-500">Pinned permanently across filters</p>
        </div>
      )}

      {showCorridors && (
        <div className="pb-2 border-b border-line">
          <div className="text-[11px] font-semibold text-slate-800 mb-0.5 flex items-center gap-2">
            <span className="h-2 w-4 rounded-full bg-slate-900 flex items-center justify-center px-0.5">
              <span className="h-1 w-3 rounded-full bg-amber-500" />
            </span>
            <span>National Corridors</span>
          </div>
          <p className="text-[10px] text-slate-500">Expressway ribbons &amp; fast hubs</p>
        </div>
      )}

      <div>
        <div className="text-[11px] font-medium text-slate-900 mb-1">
          {METRIC_LABELS[metric]}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">Low</span>
          <div
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: "linear-gradient(to right, rgb(44,110,82), rgb(201,162,39))",
            }}
          />
          <span className="text-[10px] text-slate-500 font-mono">High</span>
        </div>
      </div>
    </div>
  );
}
