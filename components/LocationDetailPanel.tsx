import { DataPoint } from "@/lib/types";
import { CHARGER_RATIO_BENCHMARK, HIGHWAY_CHARGER_RATIO_BENCHMARK } from "@/lib/data";
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

      <h2 className="font-display text-base text-ink italic">{point.name}</h2>
      <p className="mb-4 mt-1 text-[11px] text-muted">
        {point.isCorridor ? point.corridorName : `${point.city}, ${point.state}`}
        {point.cityTier && ` · Tier ${point.cityTier}`}
      </p>

      <KpiPanel
        kpis={[
          { label: "Demand score", value: String(point.demandScore) },
          { label: "Existing chargers", value: String(point.existingChargers) },
          { label: "Gap score", value: String(point.gapScore) },
        ]}
      />

      <div className="mt-4 rounded-md border border-line bg-panel2/40 px-3 py-2.5 text-[13px] leading-relaxed text-muted">
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

      <div className="mt-4 rounded-md border border-line bg-panel2/40 px-3 py-2.5 text-[13px] leading-relaxed text-muted">
        Recommended charger type:{" "}
        <span className="text-ink font-medium">{point.recommendedChargerType}</span>
      </div>

      <div className="mt-6">
        <h3 className="mb-2.5 font-display text-base text-ink">
          Vehicle segment mix ({point.evRegistrations.toLocaleString("en-IN")} EVs)
        </h3>
        <SegmentMixBar counts={point.segmentCounts} />
      </div>
    </div>
  );
}
