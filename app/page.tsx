"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import RoleSwitcher from "@/components/RoleSwitcher";
import KpiPanel from "@/components/KpiPanel";
import MapLegend from "@/components/MapLegend";
import LocationDetailPanel from "@/components/LocationDetailPanel";
import SegmentMixDonut from "@/components/charts/SegmentMixDonut";
import DemandSupplyChart from "@/components/charts/DemandSupplyChart";
import StateEvChargerChart from "@/components/charts/StateEvChargerChart";
import CorridorGapChart from "@/components/charts/CorridorGapChart";
import CityShortfallChart from "@/components/charts/CityShortfallChart";
import CategoryGapChart from "@/components/charts/CategoryGapChart";
import RankedTable, { Column } from "@/components/RankedTable";
import {
  ALL_POINTS,
  operatorRows,
  governmentRows,
  fleetRows,
  operatorKpis,
  governmentKpis,
  fleetKpis,
  aggregateSegmentCounts,
  cityShortfalls,
  categoryGapBreakdown,
} from "@/lib/data";
import { ChargerRecommendation, DataPoint, Role, StateAggregate } from "@/lib/types";
import { MetricKey } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: "gapScore", label: "Gap" },
  { key: "demandScore", label: "Demand" },
  { key: "existingChargers", label: "Supply" },
];

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

// Keeps the ranking score primary while making its shortfall traceable
// right next to it, wherever a gap-style score appears in a table.
function ScoreCell({ score, shortfall }: { score: number; shortfall: number }) {
  return (
    <div>
      <div className="font-semibold">{score}</div>
      <div className="whitespace-nowrap text-[10px] font-normal text-muted">Short by {shortfall}</div>
    </div>
  );
}

// Pincode-generated points carry a "Sector N, Pincode XXXXXX" name; splitting
// it lets the pincode read as a subtitle instead of wrapping as one long
// string. The charger type joins that same subtitle line (freeing up a
// whole column), separated by a middot; landmark and corridor names have
// no pincode, so their subtitle is just the charger type.
function splitLocationName(name: string): [string, string | null] {
  const idx = name.indexOf(", Pincode ");
  if (idx === -1) return [name, null];
  return [name.slice(0, idx), name.slice(idx + 2)];
}

function LocationCell({ name, chargerLabel }: { name: string; chargerLabel: string }) {
  const [primary, pincode] = splitLocationName(name);
  const subtitle = pincode ? `${pincode} · ${chargerLabel}` : chargerLabel;
  return (
    <div title={name}>
      <div className="truncate text-ink">{primary}</div>
      <div className="truncate text-[11px] font-normal text-muted">{subtitle ?? " "}</div>
    </div>
  );
}

const CHARGER_TYPE_LABELS: Record<ChargerRecommendation, string> = {
  "DC fast charger (CCS2)": "DC fast",
  "AC slow charger or battery swap": "AC slow",
  "Mixed AC and DC hub": "Mixed",
};

const ROLE_HEADLINES: Record<Role, { title: string; sub: string }> = {
  operator: {
    title: "Where to build next",
    sub: "Sites ranked by gap score, highest first opportunity to lowest",
  },
  government: {
    title: "Coverage against policy targets",
    sub: "State level progress toward planned charger density",
  },
  fleet: {
    title: "Toll to toll corridor readiness",
    sub: "Highway stops compared on charging locations, transactions, density, and need",
  },
};

const HEADING_CLASS = "font-display text-lg font-semibold text-ink";
const SUBTEXT_CLASS = "mb-3 mt-1 text-[11px] text-muted";
const CARD_CLASS = "rounded-lg border border-line bg-panel2 p-4";

export default function Home() {
  const [role, setRole] = useState<Role>("operator");
  const [metric, setMetric] = useState<MetricKey>("gapScore");
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);

  const opRows = useMemo(() => operatorRows(), []);
  const govRows = useMemo(() => governmentRows(), []);
  const flRows = useMemo(() => fleetRows(), []);

  const handleRoleChange = useCallback((r: Role) => {
    setRole(r);
    setSelectedPoint(null);
  }, []);

  const handleMapSelect = useCallback((p: DataPoint) => setSelectedPoint(p), []);

  const kpis =
    role === "operator"
      ? operatorKpis()
      : role === "government"
      ? governmentKpis()
      : fleetKpis();

  // Government view reports on the same national urban footprint as the
  // operator view; only the fleet role narrows the row set to corridors.
  const nationalMixPoints = role === "fleet" ? flRows : opRows;
  const nationalMixCounts = useMemo(
    () => aggregateSegmentCounts(nationalMixPoints),
    [nationalMixPoints]
  );
  const topGapPoints = useMemo(() => opRows.slice(0, 9), [opRows]);
  const cityShortfallRows = useMemo(() => cityShortfalls(opRows), [opRows]);
  const categoryGapRows = useMemo(() => categoryGapBreakdown(ALL_POINTS), []);

  // The chart grid below the map is 2 columns wide. Operator adds a 4th
  // card (city shortfall), making the count even and filling the grid
  // cleanly; government/fleet stay at 3, so the last card spans both
  // columns to close out that row instead of leaving a gap next to it.
  const chartCount = role === "operator" ? 4 : 3;
  const lastChartSpansFull = chartCount % 2 !== 0;

  const operatorColumns: Column<DataPoint>[] = [
    {
      key: "name",
      label: "Location",
      width: "27%",
      render: (r) => (
        <LocationCell name={r.name} chargerLabel={CHARGER_TYPE_LABELS[r.recommendedChargerType]} />
      ),
    },
    { key: "city", label: "City", width: "20%", nowrap: true, render: (r) => r.city },
    {
      key: "evRegistrations",
      label: "EVs",
      align: "right",
      width: "10%",
      nowrap: true,
      render: (r) => formatCompact(r.evRegistrations),
    },
    {
      key: "demandScore",
      label: "Demand",
      align: "right",
      width: "16%",
      nowrap: true,
      render: (r) => r.demandScore,
    },
    {
      key: "existingChargers",
      label: "Existing",
      align: "right",
      width: "14%",
      nowrap: true,
      render: (r) => r.existingChargers,
    },
    {
      key: "gapScore",
      label: "Gap score",
      align: "right",
      width: "13%",
      emphasize: true,
      render: (r) => <ScoreCell score={r.gapScore} shortfall={r.shortfall} />,
    },
  ];

  const governmentColumns: Column<StateAggregate>[] = [
    { key: "state", label: "State", width: "23%", nowrap: true, render: (r) => r.state },
    {
      key: "evRegistrations",
      label: "EVs",
      align: "right",
      width: "13%",
      render: (r) => formatCompact(r.evRegistrations),
    },
    {
      key: "districtsCovered",
      label: "Sites",
      align: "right",
      width: "10%",
      render: (r) => r.districtsCovered,
    },
    {
      key: "currentChargers",
      label: "Current",
      align: "right",
      width: "15%",
      render: (r) => r.currentChargers,
    },
    {
      key: "targetChargers",
      label: "Target",
      align: "right",
      width: "12%",
      render: (r) => r.targetChargers,
    },
    {
      key: "progress",
      label: "Prog.",
      align: "right",
      width: "12%",
      render: (r) => `${Math.round((r.currentChargers / r.targetChargers) * 100)}%`,
    },
    {
      key: "avgGapScore",
      label: "Avg. gap",
      align: "right",
      width: "15%",
      emphasize: true,
      render: (r) => <ScoreCell score={r.avgGapScore} shortfall={r.totalShortfall} />,
    },
  ];

  const fleetColumns: Column<DataPoint>[] = [
    {
      key: "name",
      label: "Stop",
      width: "28%",
      render: (r) => (
        <LocationCell name={r.name} chargerLabel={CHARGER_TYPE_LABELS[r.recommendedChargerType]} />
      ),
    },
    {
      key: "evRegistrations",
      label: "Daily EVs",
      align: "right",
      width: "17%",
      nowrap: true,
      render: (r) => formatCompact(r.evRegistrations),
    },
    {
      key: "existingChargingLocations",
      label: "Sites",
      align: "right",
      width: "10%",
      nowrap: true,
      render: (r) => r.existingChargingLocations ?? 0,
    },
    {
      key: "estimatedDailyTransactions",
      label: "Daily txns",
      align: "right",
      width: "17%",
      nowrap: true,
      render: (r) => (r.estimatedDailyTransactions ?? 0).toLocaleString("en-IN"),
    },
    {
      key: "evDensity",
      label: "Density",
      align: "right",
      width: "14%",
      nowrap: true,
      render: (r) => r.evDensity ?? "-",
    },
    {
      key: "needScore",
      label: "Need score",
      align: "right",
      width: "14%",
      emphasize: true,
      render: (r) => <ScoreCell score={r.needScore ?? r.gapScore} shortfall={r.shortfall} />,
    },
  ];

  return (
    <main className="min-h-screen w-screen flex flex-col bg-graphite">
      <header className="flex items-center gap-6 px-6 py-4 border-b border-line">
        <h1 className="font-display text-xl text-ink shrink-0">Ampere Atlas</h1>
        <RoleSwitcher role={role} onChange={handleRoleChange} />
        <span className="ml-auto hidden lg:inline text-[11px] text-muted">
          EV charging demand intelligence for India
        </span>
      </header>

      <div className="flex h-[620px] shrink-0">
        <div className="relative flex-1">
          <MapView
            points={ALL_POINTS}
            metric={metric}
            emphasizeCorridor={role === "fleet"}
            onSelect={handleMapSelect}
            focusPoint={selectedPoint}
          />
          <div className="absolute top-4 left-4 bg-panel/90 backdrop-blur border border-line rounded-md px-1 py-1 flex gap-1 z-[500]">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setMetric(opt.key)}
                className={`text-[11px] px-3 py-1.5 rounded transition-colors ${
                  metric === opt.key
                    ? "bg-copper/20 text-copperSoft font-medium"
                    : "text-muted hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <MapLegend metric={metric} />
        </div>

        <aside className="w-[520px] shrink-0 border-l border-line bg-panel2 flex flex-col overflow-y-auto">
          <div className="px-6 pt-4 pb-4 border-b border-line">
            <KpiPanel kpis={kpis} />
          </div>

          <div className="flex flex-col min-h-0 flex-1 px-6 pt-4 pb-4">
            {selectedPoint ? (
              <LocationDetailPanel point={selectedPoint} onClose={() => setSelectedPoint(null)} />
            ) : (
              <>
                <h2 className={HEADING_CLASS}>{ROLE_HEADLINES[role].title}</h2>
                <p className="text-[11px] text-muted mt-1 mb-3">{ROLE_HEADLINES[role].sub}</p>
                <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
                  {role === "operator" && (
                    <RankedTable
                      columns={operatorColumns}
                      rows={opRows}
                      keyFn={(r) => r.id}
                      onRowClick={setSelectedPoint}
                    />
                  )}
                  {role === "government" && (
                    <RankedTable
                      columns={governmentColumns}
                      rows={govRows}
                      keyFn={(r) => r.state}
                    />
                  )}
                  {role === "fleet" && (
                    <RankedTable
                      columns={fleetColumns}
                      rows={flRows}
                      keyFn={(r) => r.id}
                      onRowClick={setSelectedPoint}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <section className="border-t border-line px-6 py-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className={CARD_CLASS}>
            <h3 className={HEADING_CLASS}>
              {role === "fleet" ? "Corridor" : "National"} vehicle segment mix
            </h3>
            <p className={SUBTEXT_CLASS}>Total registered EVs by vehicle type</p>
            <SegmentMixDonut counts={nationalMixCounts} />
          </div>

          <div className={CARD_CLASS}>
            {role === "operator" && (
              <>
                <h3 className={HEADING_CLASS}>EV registrations vs. existing chargers</h3>
                <p className={SUBTEXT_CLASS}>Top sites by gap score</p>
                <DemandSupplyChart points={topGapPoints} />
              </>
            )}
            {role === "government" && (
              <>
                <h3 className={HEADING_CLASS}>EV registrations vs. chargers by state</h3>
                <p className={SUBTEXT_CLASS}>Ranked by average gap score</p>
                <StateEvChargerChart states={govRows} />
              </>
            )}
            {role === "fleet" && (
              <>
                <h3 className={HEADING_CLASS}>Distance to nearest charger</h3>
                <p className={SUBTEXT_CLASS}>All corridor stops, by route</p>
                <CorridorGapChart points={flRows} />
              </>
            )}
          </div>

          {role === "operator" && (
            <div className={CARD_CLASS}>
              <h3 className={HEADING_CLASS}>Total shortfall by city</h3>
              <p className={SUBTEXT_CLASS}>
                Chargers needed minus existing, summed across each city&apos;s sites
              </p>
              <CityShortfallChart cities={cityShortfallRows} />
            </div>
          )}

          <div className={`${CARD_CLASS} ${lastChartSpansFull ? "lg:col-span-2" : ""}`}>
            <h3 className={HEADING_CLASS}>Average gap score by area category</h3>
            <p className={SUBTEXT_CLASS}>
              Residential, commercial, industrial, and highway sites compared nationally
            </p>
            <CategoryGapChart rows={categoryGapRows} />
          </div>
        </div>
      </section>
    </main>
  );
}
