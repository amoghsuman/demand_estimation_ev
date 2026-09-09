"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import RoleSwitcher from "@/components/RoleSwitcher";
import KpiPanel from "@/components/KpiPanel";
import RankedTable, { Column } from "@/components/RankedTable";
import {
  ALL_POINTS,
  operatorRows,
  governmentRows,
  fleetRows,
  operatorKpis,
  governmentKpis,
  fleetKpis,
} from "@/lib/data";
import { DataPoint, Role, StateAggregate } from "@/lib/types";
import { MetricKey } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: "gapScore", label: "Gap" },
  { key: "demandScore", label: "Demand" },
  { key: "existingChargers", label: "Supply" },
];

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
    title: "Corridor readiness for fleet routes",
    sub: "Highway stops ranked by distance to the nearest charger",
  },
};

export default function Home() {
  const [role, setRole] = useState<Role>("operator");
  const [metric, setMetric] = useState<MetricKey>("gapScore");

  const opRows = useMemo(() => operatorRows(), []);
  const govRows = useMemo(() => governmentRows(), []);
  const flRows = useMemo(() => fleetRows(), []);

  const kpis =
    role === "operator"
      ? operatorKpis()
      : role === "government"
      ? governmentKpis()
      : fleetKpis();

  const operatorColumns: Column<DataPoint>[] = [
    { key: "name", label: "Location", render: (r) => r.name },
    { key: "city", label: "City", render: (r) => r.city },
    {
      key: "category",
      label: "Category",
      render: (r) => r.category[0].toUpperCase() + r.category.slice(1),
    },
    { key: "demandScore", label: "Demand", align: "right", render: (r) => r.demandScore },
    {
      key: "existingChargers",
      label: "Existing",
      align: "right",
      render: (r) => r.existingChargers,
    },
    {
      key: "gapScore",
      label: "Gap score",
      align: "right",
      emphasize: true,
      render: (r) => r.gapScore,
    },
  ];

  const governmentColumns: Column<StateAggregate>[] = [
    { key: "state", label: "State", render: (r) => r.state },
    {
      key: "districtsCovered",
      label: "Locations",
      align: "right",
      render: (r) => r.districtsCovered,
    },
    {
      key: "currentChargers",
      label: "Current",
      align: "right",
      render: (r) => r.currentChargers,
    },
    {
      key: "targetChargers",
      label: "Target",
      align: "right",
      render: (r) => r.targetChargers,
    },
    {
      key: "progress",
      label: "Progress",
      align: "right",
      render: (r) => `${Math.round((r.currentChargers / r.targetChargers) * 100)}%`,
    },
    {
      key: "avgGapScore",
      label: "Avg. gap",
      align: "right",
      emphasize: true,
      render: (r) => r.avgGapScore,
    },
  ];

  const fleetColumns: Column<DataPoint>[] = [
    { key: "name", label: "Stop", render: (r) => r.name },
    { key: "corridorName", label: "Corridor", render: (r) => r.corridorName ?? "" },
    {
      key: "distanceToNearestChargerKm",
      label: "Nearest charger (km)",
      align: "right",
      render: (r) => r.distanceToNearestChargerKm,
    },
    { key: "demandScore", label: "Demand", align: "right", render: (r) => r.demandScore },
    {
      key: "gapScore",
      label: "Gap score",
      align: "right",
      emphasize: true,
      render: (r) => r.gapScore,
    },
  ];

  return (
    <main className="h-screen w-screen flex flex-col bg-graphite">
      <header className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl text-ink">Ampere Atlas</h1>
          <span className="text-xs text-muted hidden sm:inline">
            EV charging demand intelligence for India
          </span>
        </div>
        <span className="text-xs text-muted">Demo — illustrative data</span>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="relative flex-1">
          <MapView
            points={ALL_POINTS}
            metric={metric}
            emphasizeCorridor={role === "fleet"}
          />
          <div className="absolute top-4 left-4 bg-panel/90 backdrop-blur border border-line rounded-md px-1 py-1 flex gap-1 z-[500]">
            {METRIC_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setMetric(opt.key)}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  metric === opt.key
                    ? "bg-copper/20 text-copper"
                    : "text-muted hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <aside className="w-[400px] shrink-0 border-l border-line bg-panel flex flex-col px-6 py-5 gap-6 overflow-hidden">
          <RoleSwitcher role={role} onChange={setRole} />

          <KpiPanel kpis={kpis} />

          <div className="flex flex-col min-h-0 flex-1">
            <h2 className="font-display text-lg text-ink italic">
              {ROLE_HEADLINES[role].title}
            </h2>
            <p className="text-xs text-muted mt-1 mb-3">{ROLE_HEADLINES[role].sub}</p>
            <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
              {role === "operator" && (
                <RankedTable columns={operatorColumns} rows={opRows} keyFn={(r) => r.id} />
              )}
              {role === "government" && (
                <RankedTable
                  columns={governmentColumns}
                  rows={govRows}
                  keyFn={(r) => r.state}
                />
              )}
              {role === "fleet" && (
                <RankedTable columns={fleetColumns} rows={flRows} keyFn={(r) => r.id} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
