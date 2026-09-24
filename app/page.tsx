"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeftRight,
  BarChart3,
  BatteryCharging,
  Building2,
  Car,
  ChevronRight,
  Columns,
  Filter,
  Flame,
  Gauge,
  Info,
  Layers,
  Navigation,
  PieChart,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  Route,
} from "lucide-react";
import RoleSwitcher from "@/components/RoleSwitcher";
import KpiPanel from "@/components/KpiPanel";
import MapLegend from "@/components/MapLegend";
import LocationDetailPanel from "@/components/LocationDetailPanel";
import LocationComparePanel from "@/components/LocationComparePanel";
import FutureLoadSlider from "@/components/FutureLoadSlider";
import SegmentMixDonut from "@/components/charts/SegmentMixDonut";
import DemandSupplyChart from "@/components/charts/DemandSupplyChart";
import StateEvChargerChart from "@/components/charts/StateEvChargerChart";
import CorridorGapChart from "@/components/charts/CorridorGapChart";
import CityShortfallChart from "@/components/charts/CityShortfallChart";
import CategoryGapChart from "@/components/charts/CategoryGapChart";
import EvGrowthProjectionChart from "@/components/charts/EvGrowthProjectionChart";
import TollFlowChart from "@/components/charts/TollFlowChart";
import { CorridorTimeBar, CorridorReadout, CorridorStrip, CorridorStationTable, CorridorMapChips, CORRIDOR_CARD, CORRIDOR_CARD_HEAD } from "@/components/charts/CorridorWhiteSpacePanel";
import { NH44_DELHI_CHANDIGARH } from "@/lib/corridorChainage";
import ChargerUtilizationChart from "@/components/charts/ChargerUtilizationChart";
import RankedTable, { Column } from "@/components/RankedTable";
import { TOLL_PLAZAS, SUBSTATIONS } from "@/lib/tollAndGridData";
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
  getTopDemandHotspots,
  CORRIDORS,
} from "@/lib/data";
import { ChargerRecommendation, DataPoint, EvDensity, Role, StateAggregate } from "@/lib/types";
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

const CHARGER_TYPE_LABELS: Record<ChargerRecommendation, string> = {
  "DC fast charger (CCS2)": "DC fast",
  "AC slow charger or battery swap": "AC slow",
  "Mixed AC and DC hub": "Mixed hub",
};

// Keeps the ranking score primary while providing an executive visual gauge bar
// and shortfall tag, color-coded by urgency.
function ScoreCell({ score, shortfall }: { score: number; shortfall: number }) {
  const isHigh = score >= 70;
  const isMed = score >= 45;

  const badgeClass = isHigh
    ? "bg-rose-500/15 text-rose-800 border-rose-500/30 font-extrabold shadow-2xs"
    : isMed
    ? "bg-amber-500/15 text-amber-900 border-amber-500/30 font-bold"
    : "bg-emerald-500/15 text-emerald-900 border-emerald-500/30 font-semibold";

  const barFillClass = isHigh
    ? "bg-gradient-to-r from-amber-500 to-rose-500"
    : isMed
    ? "bg-gradient-to-r from-emerald-500 to-amber-500"
    : "bg-emerald-500";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex items-center justify-center font-mono text-[11px] px-1.5 py-0.5 rounded-md border ${badgeClass}`}
        >
          {score}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-1 w-11 bg-line rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barFillClass}`}
            style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
          />
        </div>
        <span className="text-[9px] font-mono font-medium text-muted/90 whitespace-nowrap">
          -{shortfall}
        </span>
      </div>
    </div>
  );
}

function DemandCell({ score }: { score: number }) {
  const isHigh = score >= 75;
  return (
    <div className="flex items-center justify-end gap-1 font-mono text-[12px]">
      {isHigh && <Flame className="h-3 w-3 text-amber-600 shrink-0" />}
      <span className={isHigh ? "text-amber-950 font-extrabold" : "text-ink font-semibold"}>
        {score}
      </span>
    </div>
  );
}

function SupplyCell({ existing }: { existing: number }) {
  return (
    <div className="flex items-center justify-end gap-1.5 font-mono text-[12px] font-semibold text-ink">
      <BatteryCharging className="h-3.5 w-3.5 text-muted/70" />
      <span>{existing}</span>
    </div>
  );
}

function ProgressCell({ current, target }: { current: number; target: number }) {
  const pct = Math.round((current / target) * 100);
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 40
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="font-mono text-[11px] font-bold text-ink">{pct}%</span>
      <div className="h-1.5 w-14 bg-line/80 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(6, pct))}%` }}
        />
      </div>
    </div>
  );
}

function DensityCell({ density }: { density?: EvDensity }) {
  if (!density) return <span className="text-muted text-xs">-</span>;
  const isHigh = density === "High";
  const isMed = density === "Medium";
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
        isHigh
          ? "bg-rose-500/10 text-rose-700 border-rose-500/25"
          : isMed
          ? "bg-amber-500/10 text-amber-700 border-amber-500/25"
          : "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isHigh ? "bg-rose-500" : isMed ? "bg-amber-500" : "bg-slate-400"
        }`}
      />
      <span>{density}</span>
    </span>
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

function LocationCell({
  name,
  chargerType,
  city,
}: {
  name: string;
  chargerType?: ChargerRecommendation;
  city?: string;
}) {
  const [primary, pincode] = splitLocationName(name);

  return (
    <div title={name} className="flex flex-col gap-0.5 py-0.5 max-w-full">
      <div className="font-semibold text-ink group-hover:text-copperSoft transition-colors text-[13px] truncate leading-snug">
        {primary}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {pincode ? (
          <span className="text-[10px] font-mono text-muted/80">{pincode}</span>
        ) : city ? (
          <span className="text-[10px] text-muted/80">{city}</span>
        ) : null}
        {chargerType && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
              chargerType === "DC fast charger (CCS2)"
                ? "bg-amber-500/10 text-amber-900 border-amber-500/30"
                : chargerType === "Mixed AC and DC hub"
                ? "bg-blue-500/10 text-blue-900 border-blue-500/30"
                : "bg-emerald-500/10 text-emerald-900 border-emerald-500/30"
            }`}
          >
            {chargerType === "DC fast charger (CCS2)" ? (
              <Zap className="h-2.5 w-2.5 text-amber-700 shrink-0" />
            ) : chargerType === "Mixed AC and DC hub" ? (
              <Zap className="h-2.5 w-2.5 text-blue-700 shrink-0" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
            )}
            <span>{CHARGER_TYPE_LABELS[chargerType]}</span>
          </span>
        )}
      </div>
    </div>
  );
}

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

const HEADING_CLASS = "font-display text-lg font-bold text-slate-950 tracking-tight flex items-center gap-2";
const SUBTEXT_CLASS = "text-xs font-normal text-slate-700 mt-1 mb-3.5 leading-relaxed";
const CARD_CLASS = "rounded-xl border border-line bg-white p-5 shadow-xs hover:border-slate-300 transition-all";

export default function Home() {
  const [role, setRole] = useState<Role>("operator");
  const [metric, setMetric] = useState<MetricKey>("gapScore");
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showHotspots, setShowHotspots] = useState<boolean>(false);
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPreset, setFilterPreset] = useState<string>("all");

  // Operational overlay layers & toll state
  const [showSubstations, setShowSubstations] = useState<boolean>(false);
  // Corridor ribbons live in the corridor view only; the urban map never draws them.
  const showCorridors = false;
  const selectedCorridorId: string | null = null;
  const setSelectedCorridorId = (_id: string | null) => setView("corridor");
  const [selectedTollId, setSelectedTollId] = useState<string>("toll-murthal");
  const [whiteSpaceSlot, setWhiteSpaceSlot] = useState<number>(72); // 18:00
  // Top level split: highway corridor work vs urban and residential demand
  const [view, setView] = useState<"corridor" | "urban">("corridor");
  const nh44Tolls = useMemo(() => TOLL_PLAZAS.filter((t) => NH44_DELHI_CHANDIGARH.tolls.some((x) => x.tollId === t.id)), []);
  const [showDataProvenanceModal, setShowDataProvenanceModal] = useState<boolean>(false);

  // Side-by-side comparison state
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [comparePointA, setComparePointA] = useState<DataPoint | null>(null);
  const [comparePointB, setComparePointB] = useState<DataPoint | null>(null);
  const [activeCompareSlot, setActiveCompareSlot] = useState<0 | 1>(0);

  const opRows = useMemo(() => operatorRows(), []);
  const govRows = useMemo(() => governmentRows(), []);
  const flRows = useMemo(() => fleetRows(), []);
  const topHotspots = useMemo(() => getTopDemandHotspots(5), []);

  const filteredMapPoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_POINTS;
    return ALL_POINTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        (p.corridorName && p.corridorName.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const handleRoleChange = useCallback((r: Role) => {
    setRole(r);
    setSelectedPoint(null);
    setSearchQuery("");
    setFilterPreset("all");
  }, []);

  const handleMapSelect = useCallback(
    (p: DataPoint) => {
      if (isCompareMode) {
        // In compare mode, clicking a marker fills the active slot
        if (activeCompareSlot === 0) {
          setComparePointA(p);
          setActiveCompareSlot(1);
        } else {
          setComparePointB(p);
        }
      } else {
        setSelectedPoint(p);
      }
    },
    [isCompareMode, activeCompareSlot]
  );

  const handleSelectComparePoint = useCallback(
    (point: DataPoint, explicitSlot?: 0 | 1) => {
      const slot = explicitSlot !== undefined ? explicitSlot : activeCompareSlot;
      if (slot === 0) {
        setComparePointA(point);
        setActiveCompareSlot(1);
      } else {
        setComparePointB(point);
      }
      setIsCompareMode(true);
    },
    [activeCompareSlot]
  );

  const handleStartCompare = useCallback(
    (initialPoint?: DataPoint) => {
      setIsCompareMode(true);
      if (initialPoint) {
        setComparePointA(initialPoint);
        setActiveCompareSlot(1);
      } else if (selectedPoint) {
        setComparePointA(selectedPoint);
        setActiveCompareSlot(1);
      } else if (!comparePointA && ALL_POINTS.length > 0) {
        setComparePointA(ALL_POINTS[0]);
        setActiveCompareSlot(1);
      }
    },
    [selectedPoint, comparePointA]
  );

  const handleSwapComparePoints = useCallback(() => {
    setComparePointA((prevA) => {
      const tempA = prevA;
      setComparePointB(tempA);
      return comparePointB;
    });
  }, [comparePointB]);

  const handleCloseCompare = useCallback(() => {
    setIsCompareMode(false);
  }, []);

  const filteredOpRows = useMemo(() => {
    let list = opRows;
    if (filterPreset === "critical") {
      list = list.filter((r) => r.gapScore >= 70);
    } else if (filterPreset === "highDemand") {
      list = list.filter((r) => r.demandScore >= 75);
    } else if (filterPreset === "tier1") {
      list = list.filter((r) => r.cityTier === 1);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q)
    );
  }, [opRows, searchQuery, filterPreset]);

  const filteredGovRows = useMemo(() => {
    let list = govRows;
    if (filterPreset === "under50") {
      list = list.filter((r) => r.currentChargers / r.targetChargers < 0.5);
    } else if (filterPreset === "highGap") {
      list = list.filter((r) => r.avgGapScore >= 50);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => r.state.toLowerCase().includes(q));
  }, [govRows, searchQuery, filterPreset]);

  const filteredFlRows = useMemo(() => {
    let list = flRows;
    if (filterPreset === "highDensity") {
      list = list.filter((r) => r.evDensity === "High");
    } else if (filterPreset === "criticalNeed") {
      list = list.filter((r) => (r.needScore ?? r.gapScore) >= 70);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        (r.corridorName && r.corridorName.toLowerCase().includes(q)) ||
        r.state.toLowerCase().includes(q)
    );
  }, [flRows, searchQuery, filterPreset]);

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
      label: "Opportunity",
      width: "28%",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <LocationCell
          name={r.name}
          chargerType={r.recommendedChargerType}
          city={r.city}
        />
      ),
    },
    {
      key: "city",
      label: "City",
      width: "18%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.city,
      render: (r) => (
        <span className="font-medium text-ink/90 text-[12px]">{r.city}</span>
      ),
    },
    {
      key: "evRegistrations",
      label: "EV Base",
      align: "right",
      width: "14%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.evRegistrations,
      render: (r) => (
        <span className="font-mono text-[11px] font-semibold text-ink">
          {formatCompact(r.evRegistrations)}
        </span>
      ),
    },
    {
      key: "demandScore",
      label: "Demand",
      align: "right",
      width: "13%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.demandScore,
      render: (r) => <DemandCell score={r.demandScore} />,
    },
    {
      key: "existingChargers",
      label: "Supply",
      align: "right",
      width: "12%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.existingChargers,
      render: (r) => <SupplyCell existing={r.existingChargers} />,
    },
    {
      key: "gapScore",
      label: "Gap score",
      align: "right",
      width: "15%",
      emphasize: true,
      sortable: true,
      sortValue: (r) => r.gapScore,
      render: (r) => <ScoreCell score={r.gapScore} shortfall={r.shortfall} />,
    },
  ];

  const governmentColumns: Column<StateAggregate>[] = [
    {
      key: "state",
      label: "State / UT",
      width: "24%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.state,
      render: (r) => (
        <span className="font-semibold text-ink text-[13px]">{r.state}</span>
      ),
    },
    {
      key: "evRegistrations",
      label: "EV Fleet",
      align: "right",
      width: "14%",
      sortable: true,
      sortValue: (r) => r.evRegistrations,
      render: (r) => (
        <span className="font-mono text-[11px] font-semibold text-ink">
          {formatCompact(r.evRegistrations)}
        </span>
      ),
    },
    {
      key: "districtsCovered",
      label: "Sites",
      align: "right",
      width: "10%",
      sortable: true,
      sortValue: (r) => r.districtsCovered,
      render: (r) => (
        <span className="font-mono text-[11px] font-medium text-muted">
          {r.districtsCovered}
        </span>
      ),
    },
    {
      key: "currentChargers",
      label: "Current",
      align: "right",
      width: "12%",
      sortable: true,
      sortValue: (r) => r.currentChargers,
      render: (r) => (
        <span className="font-mono text-[11px] font-semibold text-ink">
          {r.currentChargers}
        </span>
      ),
    },
    {
      key: "targetChargers",
      label: "Target",
      align: "right",
      width: "12%",
      sortable: true,
      sortValue: (r) => r.targetChargers,
      render: (r) => (
        <span className="font-mono text-[11px] font-medium text-muted">
          {r.targetChargers}
        </span>
      ),
    },
    {
      key: "progress",
      label: "Progress",
      align: "right",
      width: "14%",
      sortable: true,
      sortValue: (r) => r.currentChargers / r.targetChargers,
      render: (r) => (
        <ProgressCell current={r.currentChargers} target={r.targetChargers} />
      ),
    },
    {
      key: "avgGapScore",
      label: "Deficit",
      align: "right",
      width: "14%",
      emphasize: true,
      sortable: true,
      sortValue: (r) => r.avgGapScore,
      render: (r) => (
        <ScoreCell score={r.avgGapScore} shortfall={r.totalShortfall} />
      ),
    },
  ];

  const fleetColumns: Column<DataPoint>[] = [
    {
      key: "name",
      label: "Corridor Stop",
      width: "28%",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <LocationCell
          name={r.name}
          chargerType={r.recommendedChargerType}
          city={r.city}
        />
      ),
    },
    {
      key: "evRegistrations",
      label: "Daily EVs",
      align: "right",
      width: "14%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.evRegistrations,
      render: (r) => (
        <span className="font-mono text-[11px] font-semibold text-ink">
          {formatCompact(r.evRegistrations)}
        </span>
      ),
    },
    {
      key: "existingChargingLocations",
      label: "Sites",
      align: "right",
      width: "10%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.existingChargingLocations ?? 0,
      render: (r) => (
        <span className="font-mono text-[11px] text-muted">
          {r.existingChargingLocations ?? 0}
        </span>
      ),
    },
    {
      key: "estimatedDailyTransactions",
      label: "Daily Txns",
      align: "right",
      width: "15%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.estimatedDailyTransactions ?? 0,
      render: (r) => (
        <span className="font-mono text-[11px] font-semibold text-ink">
          {(r.estimatedDailyTransactions ?? 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "evDensity",
      label: "Density",
      align: "center",
      width: "15%",
      nowrap: true,
      sortable: true,
      sortValue: (r) => r.evDensity ?? "",
      render: (r) => <DensityCell density={r.evDensity} />,
    },
    {
      key: "needScore",
      label: "Need score",
      align: "right",
      width: "18%",
      emphasize: true,
      sortable: true,
      sortValue: (r) => r.needScore ?? r.gapScore,
      render: (r) => (
        <ScoreCell score={r.needScore ?? r.gapScore} shortfall={r.shortfall} />
      ),
    },
  ];

  return (
    <main className="min-h-screen w-screen flex flex-col bg-graphite">
      <header className="flex items-center gap-3 sm:gap-5 px-4 sm:px-6 py-3.5 border-b border-line flex-wrap sm:flex-nowrap">
        <h1 className="font-display text-xl text-ink shrink-0">Ampere Atlas</h1>
        <div className="flex items-center rounded-lg border border-line bg-panel p-0.5 text-[11px] font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setView("corridor")}
            className={`rounded-md px-3 py-1.5 transition-colors ${view === "corridor" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
          >
            Corridor · Delhi to Chandigarh
          </button>
          <button
            type="button"
            onClick={() => setView("urban")}
            className={`rounded-md px-3 py-1.5 transition-colors ${view === "urban" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
          >
            Urban &amp; residential
          </button>
        </div>
        {view === "urban" && <RoleSwitcher role={role} onChange={handleRoleChange} />}

        {/* 50:50 Equal Width View Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-panel border border-line text-xs shadow-2xs">
          <Columns className="h-3.5 w-3.5 text-copper shrink-0" />
          <span className="font-semibold text-slate-900 text-[11px]">Equal Split View (50:50)</span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px] text-slate-600">Map &amp; Ranked Table</span>
        </div>

        <button
          type="button"
          onClick={() => setShowDataProvenanceModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-300 text-slate-800 text-[11px] font-semibold transition-colors shadow-2xs"
          title="Inspect data modeling methodology, synthetic calibration, and telemetry sources"
        >
          <Info className="h-3.5 w-3.5 text-copper shrink-0" />
          <span>Data Calibration &amp; Methodology</span>
        </button>

        <span className="ml-auto hidden xl:inline text-[11px] text-muted">
          EV charging demand intelligence for India
        </span>
      </header>

      {view === "corridor" && (
        <>
          <CorridorTimeBar corridor={NH44_DELHI_CHANDIGARH} slot={whiteSpaceSlot} onSlotChange={setWhiteSpaceSlot} />

          <div className="grid gap-4 px-5 pt-4" style={{ gridTemplateColumns: "40% 1fr", height: 720 }}>
            <div className={`${CORRIDOR_CARD} flex flex-col`}>
              <div className={CORRIDOR_CARD_HEAD}>
                <b className="font-display text-[15px] font-medium text-slate-900">Corridor map</b>
                <span className="text-[11px] font-medium text-slate-500">
                  {String(Math.floor(whiteSpaceSlot / 4)).padStart(2, "0")}:{String((whiteSpaceSlot % 4) * 15).padStart(2, "0")} · both carriageways
                  <label className="ml-3 inline-flex items-center gap-1.5">
                    <input type="checkbox" checked={showSubstations} onChange={() => setShowSubstations((v) => !v)} className="accent-amber-600" />
                    substations
                  </label>
                </span>
              </div>
              <div className="relative flex-1">
                <MapView
                  points={[]}
                  metric={metric}
                  emphasizeCorridor
                  onSelect={handleMapSelect}
                  focusPoint={undefined}
                  showHeatmap={false}
                  isCompareMode={false}
                  comparePointA={null}
                  comparePointB={null}
                  activeCompareSlot={0}
                  onSelectComparePoint={handleSelectComparePoint}
                  showHotspots={false}
                  hotspotPoints={[]}
                  showTollPlazas
                  showSubstations={showSubstations}
                  showCorridors
                  showWhiteSpace
                  whiteSpaceSlot={whiteSpaceSlot}
                  corridorFocusId={NH44_DELHI_CHANDIGARH.id}
                  selectedCorridorId={NH44_DELHI_CHANDIGARH.id}
                  onSelectCorridor={() => undefined}
                  onSelectToll={(tollId: string) => {
                    if (nh44Tolls.some((t) => t.id === tollId)) setSelectedTollId(tollId);
                    document.getElementById("toll-flow-analytics-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
                <CorridorMapChips slot={whiteSpaceSlot} />
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-4">
              <CorridorReadout corridor={NH44_DELHI_CHANDIGARH} slot={whiteSpaceSlot} />
              <CorridorStrip
                corridor={NH44_DELHI_CHANDIGARH}
                slot={whiteSpaceSlot}
                onSelectToll={(tollId) => {
                  setSelectedTollId(tollId);
                  document.getElementById("toll-flow-analytics-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 px-5 pb-8 pt-4 xl:grid-cols-2">
            <CorridorStationTable corridor={NH44_DELHI_CHANDIGARH} slot={whiteSpaceSlot} />
            <div id="toll-flow-analytics-section" className={`${CORRIDOR_CARD} scroll-mt-6`}>
              <div className={CORRIDOR_CARD_HEAD}>
                <b className="font-display text-[15px] font-medium text-slate-900">
                  Toll plaza: {nh44Tolls.find((t) => t.id === selectedTollId)?.name.replace(/ Toll Plaza.*$/i, "") ?? ""}
                </b>
                <div className="flex gap-0.5 rounded-md bg-panel2 p-0.5 text-[11px] font-semibold">
                  {nh44Tolls.map((toll) => (
                    <button
                      key={toll.id}
                      onClick={() => setSelectedTollId(toll.id)}
                      className={`rounded px-2.5 py-1 ${selectedTollId === toll.id ? "bg-[#1F2A37] text-white" : "text-slate-700 hover:bg-white"}`}
                    >
                      {toll.name.replace(/ Toll Plaza.*$/i, "").replace(/\s*\(.*\)/, "").split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <TollFlowChart tollId={selectedTollId} hideSelector />
              </div>
            </div>
          </div>
        </>
      )}

      {view === "urban" && (
        <>
      <div className="flex h-[660px] xl:h-[700px] shrink-0 w-full overflow-hidden">
        {/* Left Map Panel - strictly 50% width */}
        <div className="relative w-1/2 shrink-0 h-full">
          <MapView
            points={filteredMapPoints}
            metric={metric}
            emphasizeCorridor={role === "fleet"}
            onSelect={handleMapSelect}
            focusPoint={isCompareMode ? undefined : selectedPoint}
            showHeatmap={showHeatmap}
            isCompareMode={isCompareMode}
            comparePointA={comparePointA}
            comparePointB={comparePointB}
            activeCompareSlot={activeCompareSlot}
            onSelectComparePoint={handleSelectComparePoint}
            showHotspots={showHotspots}
            hotspotPoints={topHotspots}
            showTollPlazas={false}
            showSubstations={showSubstations}
            showCorridors={false}
            showWhiteSpace={false}
            selectedCorridorId={selectedCorridorId}
            onSelectCorridor={setSelectedCorridorId}
            onSelectToll={(tollId) => {
              setSelectedTollId(tollId);
              const el = document.getElementById("toll-flow-analytics-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          />
          <div className="absolute top-4 left-4 bg-panel/90 backdrop-blur border border-line rounded-md px-1.5 py-1 flex items-center gap-1.5 z-[500] shadow-sm">
            <div className="flex items-center gap-1">
              {METRIC_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setMetric(opt.key)}
                  className={`text-[11px] px-2.5 py-1.5 rounded transition-colors ${
                    metric === opt.key
                      ? "bg-copper/20 text-copperSoft font-medium"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-line/80 mx-0.5" />

            <button
              id="map-heatmap-toggle-btn"
              type="button"
              onClick={() => setShowHeatmap((prev) => !prev)}
              className={`text-[11px] px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-all ${
                showHeatmap
                  ? "bg-copper/25 text-copperSoft border border-copper/40 font-semibold shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel border border-transparent"
              }`}
              title="Toggle regional demand intensity heatmap overlay"
            >
              <Flame className={`h-3.5 w-3.5 ${showHeatmap ? "text-signal" : "text-copper"}`} />
              <span>Demand Heatmap</span>
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
                  showHeatmap ? "bg-signal animate-pulse" : "bg-muted/40"
                }`}
              />
            </button>

            <div className="h-4 w-px bg-line/80 mx-0.5" />

            <button
              id="map-hotspots-toggle-btn"
              type="button"
              onClick={() => setShowHotspots((prev) => !prev)}
              className={`text-[11px] px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-all ${
                showHotspots
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel border border-transparent"
              }`}
              title="Pin top 5 highest-demand locations across India on the map, regardless of active search filter"
            >
              <Flame className={`h-3.5 w-3.5 ${showHotspots ? "text-rose-400 animate-pulse" : "text-copper"}`} />
              <span>Show Hotspots</span>
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  showHotspots
                    ? "bg-rose-500 text-white"
                    : "bg-panel border border-line text-muted"
                }`}
              >
                5
              </span>
            </button>

            <div className="h-4 w-px bg-line/80 mx-0.5" />

            <button
              id="map-substations-toggle-btn"
              type="button"
              onClick={() => setShowSubstations((prev) => !prev)}
              className={`text-[11px] px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-all ${
                showSubstations
                  ? "bg-indigo-100 text-indigo-950 border border-indigo-400 font-bold shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel border border-transparent"
              }`}
              title="Toggle electrical distribution substations showing EV headroom & feeder capacity"
            >
              <Zap className={`h-3.5 w-3.5 ${showSubstations ? "text-indigo-800" : "text-slate-500"}`} />
              <span>Substations</span>
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  showSubstations
                    ? "bg-indigo-800 text-white"
                    : "bg-panel border border-line text-muted"
                }`}
              >
                {SUBSTATIONS.length}
              </span>
            </button>

            <div className="h-4 w-px bg-line/80 mx-0.5" />

            <button
              id="map-compare-mode-btn"
              type="button"
              onClick={() => {
                setIsCompareMode((prev) => {
                  const next = !prev;
                  if (next && !comparePointA && selectedPoint) {
                    setComparePointA(selectedPoint);
                    setActiveCompareSlot(1);
                  } else if (next && !comparePointA && ALL_POINTS.length > 0) {
                    setComparePointA(ALL_POINTS[0]);
                    setActiveCompareSlot(1);
                  }
                  return next;
                });
              }}
              className={`text-[11px] px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-all ${
                isCompareMode
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-xs"
                  : "text-muted hover:text-ink hover:bg-panel border border-transparent"
              }`}
              title="Compare two locations side-by-side"
            >
              <ArrowLeftRight className={`h-3.5 w-3.5 ${isCompareMode ? "text-amber-400" : "text-muted"}`} />
              <span>Compare</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded border ${
                  isCompareMode
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                    : "bg-panel border-line text-muted"
                }`}
              >
                {[comparePointA, comparePointB].filter(Boolean).length}/2
              </span>
            </button>
          </div>

          {isCompareMode && (
            <div className="absolute top-16 left-4 z-[500] bg-panel/95 backdrop-blur border border-amber-500/30 shadow-md rounded-md px-3 py-2 text-xs flex items-center gap-2.5">
              <span className="text-amber-300 text-[11px] font-semibold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                Compare Mode Active
              </span>
              <span className="text-line text-xs">|</span>
              <span className="text-muted text-[11px]">
                Click map markers to pick{" "}
                <strong className={activeCompareSlot === 0 ? "text-amber-300 underline" : "text-amber-400"}>
                  Location A
                </strong>{" "}
                or{" "}
                <strong className={activeCompareSlot === 1 ? "text-sky-300 underline" : "text-sky-400"}>
                  Location B
                </strong>
              </span>
            </div>
          )}

          <MapLegend
            metric={metric}
            showHeatmap={showHeatmap}
            showHotspots={showHotspots}
            showCorridors={showCorridors}
          />
        </div>

        {/* Right Table & Detail Panel - strictly 50% width to match left map panel */}
        <aside className="w-1/2 shrink-0 border-l border-line bg-panel2 flex flex-col overflow-y-auto h-full">
          <div className="px-5 pt-3.5 pb-3.5 border-b border-line bg-panel2/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-copper shadow-2xs" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
                  {role === "operator"
                    ? "Network Performance Telemetry"
                    : role === "government"
                    ? "National Policy Benchmarks"
                    : "Highway Corridor Vital Signs"}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-full border border-line shadow-2xs">
                Live Feed
              </span>
            </div>
            <KpiPanel kpis={kpis} />
          </div>

          <div className="flex flex-col min-h-0 flex-1 px-5 pt-3.5 pb-4">
            {isCompareMode ? (
              <LocationComparePanel
                allPoints={ALL_POINTS}
                pointA={comparePointA}
                pointB={comparePointB}
                activeSlot={activeCompareSlot}
                onSelectPoint={handleSelectComparePoint}
                onSwap={handleSwapComparePoints}
                onClose={handleCloseCompare}
                onSelectSlot={setActiveCompareSlot}
              />
            ) : selectedPoint ? (
              <LocationDetailPanel
                point={selectedPoint}
                onClose={() => setSelectedPoint(null)}
                onCompare={handleStartCompare}
                onOpenToll={(tollId) => {
                  setSelectedTollId(tollId);
                  const el = document.getElementById("toll-flow-analytics-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              />
            ) : (
              <>
                {/* Visual Header Box with High-Contrast Typography & Visual Accent */}
                <div className="mb-3 bg-white rounded-xl border border-line p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                        {role === "operator" ? "OPPORTUNITY MATRIX" : role === "government" ? "STATE TARGET AUDIT" : "CORRIDOR READINESS"}
                      </span>
                      <h2 className="font-display text-lg font-bold text-slate-950 tracking-tight">
                        {ROLE_HEADLINES[role].title}
                      </h2>
                    </div>
                    {searchQuery.trim() && (
                      <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        {role === "operator"
                          ? `${filteredOpRows.length} of ${opRows.length}`
                          : role === "government"
                          ? `${filteredGovRows.length} of ${govRows.length}`
                          : `${filteredFlRows.length} of ${flRows.length}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-normal text-slate-700 mt-1 leading-relaxed">
                    {ROLE_HEADLINES[role].sub}
                  </p>
                </div>

                {/* Real-time search filter input bar */}
                <div className="relative mb-2.5">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="sidebar-location-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      role === "government"
                        ? "Filter states by name (e.g. Maharashtra, Delhi)..."
                        : "Filter by city or location (e.g. Gurugram, Indiranagar)..."
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs text-slate-950 placeholder:text-slate-500 focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/40 transition-colors shadow-2xs font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      id="clear-location-search"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-950 transition-colors"
                      title="Clear search filter"
                      aria-label="Clear search filter"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick filter segment chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
                  {role === "operator" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("all")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "all"
                            ? "bg-slate-900 border-slate-900 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-50 shadow-2xs"
                        }`}
                      >
                        All ({opRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("critical")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "critical"
                            ? "bg-rose-600 border-rose-600 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50/50 shadow-2xs"
                        }`}
                      >
                        Critical Gap ≥70 ({opRows.filter((r) => r.gapScore >= 70).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("highDemand")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "highDemand"
                            ? "bg-amber-600 border-amber-600 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50/50 shadow-2xs"
                        }`}
                      >
                        High Demand ({opRows.filter((r) => r.demandScore >= 75).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("tier1")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "tier1"
                            ? "bg-copper border-copperSoft text-slate-950 shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-amber-800 hover:border-amber-300 hover:bg-amber-50/50 shadow-2xs"
                        }`}
                      >
                        Tier 1 Metros ({opRows.filter((r) => r.cityTier === 1).length})
                      </button>
                    </>
                  )}

                  {role === "government" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("all")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "all"
                            ? "bg-slate-900 border-slate-900 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-50 shadow-2xs"
                        }`}
                      >
                        All States ({govRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("under50")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "under50"
                            ? "bg-rose-600 border-rose-600 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50/50 shadow-2xs"
                        }`}
                      >
                        &lt;50% Target ({govRows.filter((r) => r.currentChargers / r.targetChargers < 0.5).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("highGap")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "highGap"
                            ? "bg-amber-600 border-amber-600 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50/50 shadow-2xs"
                        }`}
                      >
                        High Deficit ({govRows.filter((r) => r.avgGapScore >= 50).length})
                      </button>
                    </>
                  )}

                  {role === "fleet" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("all")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "all"
                            ? "bg-slate-900 border-slate-900 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-slate-950 hover:bg-slate-50 shadow-2xs"
                        }`}
                      >
                        All Stops ({flRows.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("highDensity")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "highDensity"
                            ? "bg-rose-600 border-rose-600 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50/50 shadow-2xs"
                        }`}
                      >
                        High Density ({flRows.filter((r) => r.evDensity === "High").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterPreset("criticalNeed")}
                        className={`px-2.5 py-1 rounded-full font-semibold border transition-all whitespace-nowrap ${
                          filterPreset === "criticalNeed"
                            ? "bg-amber-600 border-amber-600 text-white shadow-2xs font-bold"
                            : "bg-white border-slate-300 text-slate-800 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50/50 shadow-2xs"
                        }`}
                      >
                        Need Score ≥70 ({flRows.filter((r) => (r.needScore ?? r.gapScore) >= 70).length})
                      </button>
                    </>
                  )}
                </div>

                {/* Table Header Context Bar */}
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-950">
                    <span className="h-2 w-2 rounded-full bg-copper shadow-2xs" />
                    <span>Priority Ranking Leaderboard</span>
                    <span className="text-slate-300 font-normal">·</span>
                    <span className="text-[11px] font-mono font-semibold text-slate-700">
                      {role === "operator"
                        ? `${filteredOpRows.length} opportunities`
                        : role === "government"
                        ? `${filteredGovRows.length} states`
                        : `${filteredFlRows.length} highway stops`}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-600">
                    Sortable columns · Click row to inspect
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
                  {role === "operator" && (
                    <RankedTable
                      columns={operatorColumns}
                      rows={filteredOpRows}
                      keyFn={(r) => r.id}
                      showRank={true}
                      onRowClick={setSelectedPoint}
                      emptyMessage={
                        <div className="space-y-1.5">
                          <p>No locations found matching &ldquo;{searchQuery}&rdquo;</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setFilterPreset("all");
                            }}
                            className="text-[11px] font-medium text-copperSoft hover:underline"
                          >
                            Clear search &amp; filter
                          </button>
                        </div>
                      }
                    />
                  )}
                  {role === "government" && (
                    <RankedTable
                      columns={governmentColumns}
                      rows={filteredGovRows}
                      keyFn={(r) => r.state}
                      showRank={true}
                      emptyMessage={
                        <div className="space-y-1.5">
                          <p>No states found matching &ldquo;{searchQuery}&rdquo;</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setFilterPreset("all");
                            }}
                            className="text-[11px] font-medium text-copperSoft hover:underline"
                          >
                            Clear search &amp; filter
                          </button>
                        </div>
                      }
                    />
                  )}
                  {role === "fleet" && (
                    <RankedTable
                      columns={fleetColumns}
                      rows={filteredFlRows}
                      keyFn={(r) => r.id}
                      showRank={true}
                      onRowClick={setSelectedPoint}
                      emptyMessage={
                        <div className="space-y-1.5">
                          <p>No corridor stops found matching &ldquo;{searchQuery}&rdquo;</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setFilterPreset("all");
                            }}
                            className="text-[11px] font-medium text-copperSoft hover:underline"
                          >
                            Clear search &amp; filter
                          </button>
                        </div>
                      }
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <section className="border-t border-line px-6 py-6 bg-graphite">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-copper shadow-2xs" />
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-900">
              Analytical Visualizations &amp; Growth Models
            </h2>
          </div>
          <span className="text-xs text-slate-600 font-medium">
            Synchronized with selected location &amp; filters
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Vehicle Segment Mix */}
          <div className={CARD_CLASS}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 mb-1.5">
                  FLEET COMPOSITION
                </span>
                <h3 className={HEADING_CLASS}>
                  <PieChart className="h-4 w-4 text-copper shrink-0" />
                  <span>{role === "fleet" ? "Corridor" : "National"} vehicle segment mix</span>
                </h3>
              </div>
            </div>
            <p className={SUBTEXT_CLASS}>Total registered electric vehicles classified by 2W, 3W, 4W &amp; Bus distribution</p>
            <SegmentMixDonut counts={nationalMixCounts} />
          </div>

          {/* Demand vs Supply / Policy Progress / Corridor Chart */}
          <div className={CARD_CLASS}>
            {role === "operator" && (
              <>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-200 mb-1.5">
                      DEFICIT ANALYSIS
                    </span>
                    <h3 className={HEADING_CLASS}>
                      <BarChart3 className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>EV registrations vs. existing chargers</span>
                    </h3>
                  </div>
                </div>
                <p className={SUBTEXT_CLASS}>Top sites ranked by gap score deficit · Click bar to inspect site telemetry</p>
                <DemandSupplyChart points={topGapPoints} onSelectPoint={setSelectedPoint} />
              </>
            )}
            {role === "government" && (
              <>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200 mb-1.5">
                      POLICY BENCHMARK
                    </span>
                    <h3 className={HEADING_CLASS}>
                      <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>EV registrations vs. chargers by state</span>
                    </h3>
                  </div>
                </div>
                <p className={SUBTEXT_CLASS}>State implementation progress measured against the 1:500 guideline benchmark</p>
                <StateEvChargerChart states={govRows} />
              </>
            )}
            {role === "fleet" && (
              <>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 mb-1.5">
                      HIGHWAY CONNECTIVITY
                    </span>
                    <h3 className={HEADING_CLASS}>
                      <Car className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Distance to nearest highway fast-charger</span>
                    </h3>
                  </div>
                </div>
                <p className={SUBTEXT_CLASS}>Corridor stops graded green under 20 km, amber 20 to 30 km, red beyond 30 km · Click bar to inspect stop</p>
                <CorridorGapChart
                  points={flRows}
                  onSelectPoint={setSelectedPoint}
                  onSelectCorridor={setSelectedCorridorId}
                />
              </>
            )}
          </div>

          {role === "operator" && (
            <div className={CARD_CLASS}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 mb-1.5">
                    METROPOLITAN SHORTFALL
                  </span>
                  <h3 className={HEADING_CLASS}>
                    <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Total charger shortfall by city</span>
                  </h3>
                </div>
              </div>
              <p className={SUBTEXT_CLASS}>
                Net chargers required minus currently deployed infrastructure across Tier 1 &amp; Tier 2 metros
              </p>
              <CityShortfallChart cities={cityShortfallRows} />
            </div>
          )}

          <div className={`${CARD_CLASS} ${lastChartSpansFull ? "lg:col-span-2" : ""}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200 mb-1.5">
                  LAND-USE TYPOLOGY
                </span>
                <h3 className={HEADING_CLASS}>
                  <Layers className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Average gap score by area category</span>
                </h3>
              </div>
            </div>
            <p className={SUBTEXT_CLASS}>
              Comparative infrastructure deficit across Residential, Commercial, Industrial, and Highway archetypes
            </p>
            <CategoryGapChart rows={categoryGapRows} />
          </div>

          {/* 5-Year Projected EV Registration Growth */}
          <div className={`${CARD_CLASS} lg:col-span-2`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-950 border border-cyan-300 mb-1.5">
                  STRATEGIC FORECAST (2026–2031)
                </span>
                <h3 className={HEADING_CLASS}>
                  <TrendingUp className="h-4 w-4 text-cyan-700 shrink-0" />
                  <span>5-Year Projected EV Registration Growth &amp; Target Capacity</span>
                </h3>
              </div>
            </div>
            <p className={SUBTEXT_CLASS}>
              Forward adoption trajectory, multi-segment fleet forecast &amp; required charging infrastructure targets
            </p>
            <div className="mt-3">
              <EvGrowthProjectionChart selectedPoint={selectedPoint} />
            </div>
          </div>

          {/* Multi-Charger Utilization Benchmarks & Bottleneck Audit */}
          <div className={`${CARD_CLASS} lg:col-span-2`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300 mb-1.5">
                  DISPATCH &amp; ASSET UTILIZATION
                </span>
                <h3 className={HEADING_CLASS}>
                  <Gauge className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>Charger Utilization Rates, Dwell Times &amp; Queue Delay Benchmarks</span>
                </h3>
              </div>
            </div>
            <p className={SUBTEXT_CLASS}>
              Operational efficiency and bottleneck risk across AC Slow (3.3kW / 7.4kW), Fast DC (30kW / 60kW), and High-Power DC (120kW / 240kW) chargers
            </p>
            <div className="mt-3">
              <ChargerUtilizationChart locationPoint={selectedPoint} />
            </div>
          </div>
        </div>
      </section>

        </>
      )}

      {/* Data Provenance & Methodology Modal */}
      {showDataProvenanceModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300">
                  TRANSPARENCY &amp; METHODOLOGY
                </span>
                <h2 className="font-display text-xl font-bold text-slate-950 mt-1">
                  Data Architecture &amp; Calibration Methodology
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDataProvenanceModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5">
                <h3 className="font-bold text-amber-950 text-sm mb-1">
                  Are we using dummy data in Ampere Atlas?
                </h3>
                <p>
                  Ampere Atlas utilizes <strong>statistically calibrated benchmark models</strong> derived from real-world empirical distributions and statutory policy guidelines, rather than direct live IoT API feeds from individual charging stations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-amber-600" /> Highway Toll Flow &amp; FASTag Data
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Calibrated against NHAI FASTag hourly traffic distributions across national expressways (NH-48, Mumbai-Pune Expressway, Yamuna Expressway, etc.), mapping diurnal peak transit curves between 07:00–10:00 and 17:00–21:00.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-indigo-600" /> Electrical Substation &amp; Grid Headroom
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Derived from State DISCOM 11kV/33kV feeder loading norms, HT-2 industrial tariffs, transformer peak MVA thresholds, and statutory energization timelines for high-capacity EV charging loads.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-emerald-600" /> Charger Utilization Benchmarks
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Modeled using empirical CPO telemetry averages across slow AC (3.3/7.4 kW), fast DC (30/60 kW), and high-power DC (120/240 kW) guns, capturing queue probability and optimal revenue thresholds (55–75%).
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" /> VAHAN &amp; MoP Policy Norms
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    EV fleet counts, segment distributions (2W, 3W, 4W, Bus), and 1:500 guideline targets are benchmarked against official VAHAN dashboards and Ministry of Power guidelines.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDataProvenanceModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
