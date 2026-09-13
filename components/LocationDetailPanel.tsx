import { ArrowLeftRight } from "lucide-react";
import { DataPoint } from "@/lib/types";
import { CHARGER_RATIO_BENCHMARK, HIGHWAY_CHARGER_RATIO_BENCHMARK, formatShortfall } from "@/lib/data";
import { SEGMENT_KEYS, SEGMENT_LABELS } from "@/lib/chartColors";
import KpiPanel from "@/components/KpiPanel";
import SegmentMixBar from "@/components/charts/SegmentMixBar";
import EvGrowthProjectionChart from "@/components/charts/EvGrowthProjectionChart";

export default function LocationDetailPanel({
  point,
  onClose,
  onCompare,
}: {
  point: DataPoint;
  onClose: () => void;
  onCompare?: (point: DataPoint) => void;
}) {
  const ratio =
    point.existingChargers > 0 ? Math.round(point.evRegistrations / point.existingChargers) : null;
  const [benchLow, benchHigh] = point.cityTier
    ? CHARGER_RATIO_BENCHMARK[point.cityTier]
    : HIGHWAY_CHARGER_RATIO_BENCHMARK;

  const simPct = (point as { futureLoadPct?: number }).futureLoadPct;
  const baseDemand = (point as { baselineDemandScore?: number }).baselineDemandScore;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-ink"
        >
          <span aria-hidden>←</span> Back to list
        </button>

        {onCompare && (
          <button
            type="button"
            onClick={() => onCompare(point)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-colors"
            title="Compare this location side-by-side with another location"
          >
            <ArrowLeftRight className="h-3 w-3" />
            <span>Compare location</span>
          </button>
        )}
      </div>

      <h2 className="font-display text-lg font-semibold text-ink">{point.name}</h2>
      <p className="mb-3 mt-1 text-[11px] text-muted">
        {point.isCorridor ? point.corridorName : `${point.city}, ${point.state}`}
        {point.cityTier && ` · Tier ${point.cityTier}`}
      </p>

      {Boolean(simPct && simPct > 0) && (
        <div className="mb-3.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <span>⚡ Simulated +{simPct}% EV Adoption</span>
          </div>
          <div className="text-[11px] text-muted">
            Demand: <strong className="text-amber-400 font-bold">{point.demandScore}</strong>
            {baseDemand !== undefined && ` (Base: ${baseDemand})`}
          </div>
        </div>
      )}

      <KpiPanel
        kpis={[
          {
            label: point.isCorridor ? "Daily EVs" : "Registered EVs",
            value: point.evRegistrations.toLocaleString("en-IN"),
          },
          { label: "Demand score", value: String(point.demandScore) },
          { label: "Existing chargers", value: String(point.existingChargers) },
          { label: "Gap score", value: String(point.gapScore) },
        ]}
      />

      <div className="mt-4 rounded-md border border-line bg-panel px-3 py-2.5 text-[13px] leading-relaxed text-muted">
        <span className="text-ink font-medium">
          {formatShortfall(point.chargersNeeded, point.existingChargers, point.shortfall)}
        </span>{" "}
        chargers against the benchmark density for this location.
      </div>

      <div className="mt-4 rounded-md border border-line bg-panel px-3 py-2.5 text-[13px] leading-relaxed text-muted">
        <span className="text-ink font-medium">
          {point.evRegistrations.toLocaleString("en-IN")} {point.isCorridor ? "est. daily EVs" : "EVs"}
        </span>{" "}
        {ratio !== null ? (
          <>
            share {point.existingChargers.toLocaleString("en-IN")} charger
            {point.existingChargers === 1 ? "" : "s"} here, about{" "}
            <span className="text-ink font-medium">1 per {ratio.toLocaleString("en-IN")}</span>.
          </>
        ) : (
          <>and no public charger recorded here yet.</>
        )}{" "}
        {point.cityTier ? `Tier-${point.cityTier}` : "Highway"} benchmark: 1 per{" "}
        {Math.round(benchLow).toLocaleString("en-IN")}-{Math.round(benchHigh).toLocaleString("en-IN")}.
      </div>

      <div className="mt-4 rounded-md border border-line bg-panel px-3 py-2.5 text-[13px] leading-relaxed text-muted">
        Recommended charger type:{" "}
        <span className="text-ink font-medium">{point.recommendedChargerType}</span>
      </div>

      <div className="mt-6">
        <h3 className="mb-2.5 font-display text-lg font-semibold text-ink">
          Vehicle segment mix ({point.evRegistrations.toLocaleString("en-IN")} EVs)
        </h3>
        <SegmentMixBar counts={point.segmentCounts} />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border border-line bg-panel px-3 py-2.5 text-[13px]">
          {SEGMENT_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-muted">{SEGMENT_LABELS[key]}</span>
              <span className="font-medium text-ink">
                {point.segmentCounts[key].toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-line/60 pt-5">
        <EvGrowthProjectionChart selectedPoint={point} compact={true} />
      </div>
    </div>
  );
}
