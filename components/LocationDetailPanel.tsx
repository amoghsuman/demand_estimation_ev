import { ArrowLeftRight, Zap, Gauge, Navigation } from "lucide-react";
import { DataPoint } from "@/lib/types";
import { CHARGER_RATIO_BENCHMARK, HIGHWAY_CHARGER_RATIO_BENCHMARK, formatShortfall } from "@/lib/data";
import {
  getSubstationForPoint,
  getChargerUtilizationsForPoint,
  getNearestTollPlaza,
} from "@/lib/tollAndGridData";
import { SEGMENT_KEYS, SEGMENT_LABELS } from "@/lib/chartColors";
import KpiPanel from "@/components/KpiPanel";
import SegmentMixBar from "@/components/charts/SegmentMixBar";
import EvGrowthProjectionChart from "@/components/charts/EvGrowthProjectionChart";
import SubstationGridCard from "@/components/SubstationGridCard";

export default function LocationDetailPanel({
  point,
  onClose,
  onCompare,
  onOpenToll,
}: {
  point: DataPoint;
  onClose: () => void;
  onCompare?: (point: DataPoint) => void;
  onOpenToll?: (tollId: string) => void;
}) {
  const ratio =
    point.existingChargers > 0 ? Math.round(point.evRegistrations / point.existingChargers) : null;
  const [benchLow, benchHigh] = point.cityTier
    ? CHARGER_RATIO_BENCHMARK[point.cityTier]
    : HIGHWAY_CHARGER_RATIO_BENCHMARK;

  const simPct = (point as { futureLoadPct?: number }).futureLoadPct;
  const baseDemand = (point as { baselineDemandScore?: number }).baselineDemandScore;

  const substation = getSubstationForPoint(point);
  const siteUtilizations = getChargerUtilizationsForPoint(point);
  const nearestToll = getNearestTollPlaza(point);

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

      {/* Local Electrical Substation Telemetry */}
      <div className="mt-5">
        <SubstationGridCard substation={substation} />
      </div>

      {/* Local Charger Utilization Rates */}
      <div className="mt-5 rounded-lg border border-line bg-panel p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-copper shrink-0" />
            <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">
              Site Charger Utilization Rates
            </span>
          </div>
          <span className="text-[10px] text-slate-600 font-medium">Daily Active Plug-in Telemetry</span>
        </div>

        <div className="space-y-2">
          {siteUtilizations.slice(0, 3).map((u) => (
            <div key={u.chargerType} className="rounded border border-slate-200 bg-white p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">{u.chargerType}</span>
                <span className="font-mono font-bold text-slate-950">{u.avgUtilizationPct}% util</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    u.status === "overcapacity"
                      ? "bg-rose-600"
                      : u.status === "underutilized"
                      ? "bg-slate-400"
                      : "bg-emerald-600"
                  }`}
                  style={{ width: `${u.avgUtilizationPct}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
                <span>Peak: <strong className="text-slate-800 font-mono">{u.peakUtilizationPct}%</strong> ({u.peakHours})</span>
                <span>Wait: <strong className={u.avgQueueWaitMinutes > 10 ? "text-rose-700 font-mono font-bold" : "text-slate-800 font-mono"}>{u.avgQueueWaitMinutes}m</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nearest Toll Flow Connection */}
      {nearestToll && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-amber-700" />
              <span className="font-bold text-amber-950">Nearest Highway Toll: {nearestToll.name}</span>
            </div>
            <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
              {nearestToll.highwayCode}
            </span>
          </div>
          <p className="text-[11px] text-amber-900 leading-snug">
            Corridor EV throughput: <strong className="font-mono">{nearestToll.totalDailyEvs.toLocaleString("en-IN")} EVs/day</strong> ({nearestToll.evSharePct}% of flow). Peak surge: <strong className="font-mono">{nearestToll.peakHourEvVolume} EVs/hr</strong> at {nearestToll.peakHourTimeLabel}.
          </p>
          {onOpenToll && (
            <button
              type="button"
              onClick={() => onOpenToll(nearestToll.id)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2"
            >
              Analyze 24-Hour Toll Flow Profile &rarr;
            </button>
          )}
        </div>
      )}

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
