import { DataPoint } from "@/lib/types";
import { CHARGER_RATIO_BENCHMARK, HIGHWAY_CHARGER_RATIO_BENCHMARK, formatShortfall } from "@/lib/data";
import { SEGMENT_KEYS, SEGMENT_LABELS } from "@/lib/chartColors";
import KpiPanel from "@/components/KpiPanel";
import SegmentMixBar from "@/components/charts/SegmentMixBar";

export default function LocationDetailPanel({
  point,
  onClose,
}: {
  point: DataPoint;
  onClose: () => void;
}) {
  const ratio =
    point.existingChargers > 0 ? Math.round(point.evRegistrations / point.existingChargers) : null;
  const [benchLow, benchHigh] = point.cityTier
    ? CHARGER_RATIO_BENCHMARK[point.cityTier]
    : HIGHWAY_CHARGER_RATIO_BENCHMARK;

  return (
    <div className="flex h-full flex-col">
      <button
        onClick={onClose}
        className="mb-3 flex items-center gap-1.5 self-start text-[11px] text-muted transition-colors hover:text-ink"
      >
        <span aria-hidden>←</span> Back to list
      </button>

      <h2 className="font-display text-lg font-semibold text-ink">{point.name}</h2>
      <p className="mb-4 mt-1 text-[11px] text-muted">
        {point.isCorridor ? point.corridorName : `${point.city}, ${point.state}`}
        {point.cityTier && ` · Tier ${point.cityTier}`}
      </p>

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
    </div>
  );
}
