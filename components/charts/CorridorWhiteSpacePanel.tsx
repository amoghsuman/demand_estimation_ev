"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Play,
  Pause,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Car,
  Flame,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Info,
  Radio,
  X,
  Layers,
  Sparkles,
  BatteryCharging,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
} from "lucide-react";
import {
  ChainageCorridor,
  GREEN_MAX_KM,
  RED_MIN_KM,
  SIDES,
  SIDE_LABEL,
  SLOTS_PER_DAY,
  STATUS_COLORS,
  Side,
  StationDay,
  UBC_SOURCE,
  UBC_STATUS_META,
  corridorSnapshot,
  segmentsForSlot,
  simulateCorridor,
  slotLabel,
  tollFlowAtSlot,
} from "@/lib/corridorChainage";
import { TOLL_PLAZAS } from "@/lib/tollAndGridData";

export const CORRIDOR_CARD = "rounded-xl border border-line bg-white shadow-2xs overflow-hidden transition-all";
export const CORRIDOR_CARD_HEAD = "flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 bg-slate-50/50";

// Short plaza names for tags on the strip and the map.
export function tollShortName(tollId: string): string {
  const name = TOLL_PLAZAS.find((t) => t.id === tollId)?.name ?? tollId;
  return name.replace(/ Toll Plaza.*$/i, "").replace(/\s*\(.*\)/, "").trim().split(" ")[0];
}

// Peak slots: flow at or above 85% of the daily maximum, used to shade the timeline.
function usePeakSlots(corridor: ChainageCorridor): boolean[] {
  return useMemo(
    () => Array.from({ length: SLOTS_PER_DAY }, (_, t) => corridorSnapshot(corridor, t).isPeak),
    [corridor]
  );
}

/* ---------------- 1. Executive Time & Simulation Control Bar ---------------- */
export function CorridorTimeBar({
  corridor,
  slot,
  onSlotChange,
}: {
  corridor: ChainageCorridor;
  slot: number;
  onSlotChange: (s: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const peaks = usePeakSlots(corridor);
  const snap = useMemo(() => corridorSnapshot(corridor, slot), [corridor, slot]);
  const peakSlot = useMemo(() => {
    let best = 0;
    for (let t = 0; t < SLOTS_PER_DAY; t++) {
      if (corridorSnapshot(corridor, t).evsPerSlot > corridorSnapshot(corridor, best).evsPerSlot) {
        best = t;
      }
    }
    return best;
  }, [corridor]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => onSlotChange((slot + 1) % SLOTS_PER_DAY), 350);
    return () => clearInterval(t);
  }, [playing, slot, onSlotChange]);

  // Group consecutive peak slots into bands for the timeline background.
  const bands: { start: number; end: number }[] = [];
  peaks.forEach((p, i) => {
    if (!p) return;
    const last = bands[bands.length - 1];
    if (last && last.end === i) last.end = i + 1;
    else bands.push({ start: i, end: i + 1 });
  });
  const pct = (t: number) => `${(t / SLOTS_PER_DAY) * 100}%`;

  return (
    <div className="border-b border-slate-800 bg-slate-950 px-5 py-3.5 text-white shadow-md">
      <div className="mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Corridor Identity & Dial */}
        <div className="flex items-center gap-5 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="font-display text-base font-semibold tracking-tight text-white">
                {corridor.name.replace(" – ", " to ").replace(/\s*\(NH44\)/, "")}
              </h2>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400 border border-slate-700">
                NH-44
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {corridor.lengthKm} km · {corridor.stations.length} Fast Hubs · {corridor.tolls.length} NHAI Toll Plazas
            </div>
          </div>

          <div className="hidden sm:flex items-baseline gap-2 border-l border-slate-800 pl-4">
            <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
              {snap.label}
            </span>
            <span className="text-[11px] text-slate-400">
              to {slotLabel((slot + 1) % SLOTS_PER_DAY)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                snap.isPeak
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {snap.isPeak ? "Peak Surge" : "Normal Flow"}
            </span>
          </div>
        </div>

        {/* Center: Interactive Scrubber Track */}
        <div className="relative flex-1 min-w-[280px] max-w-2xl px-2">
          <div className="relative h-9 flex items-center">
            {/* Background base track */}
            <div className="absolute left-0 right-0 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              {bands.map((b) => (
                <div
                  key={b.start}
                  className="absolute h-full bg-amber-500/30"
                  style={{ left: pct(b.start), width: pct(b.end - b.start) }}
                  title="Peak traffic window"
                />
              ))}
              {/* Active progress fill */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                style={{ width: pct(slot) }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={SLOTS_PER_DAY - 1}
              value={slot}
              onChange={(e) => onSlotChange(Number(e.target.value))}
              aria-label="15 minute slot of the day"
              className="corridor-slider absolute left-0 right-0 w-full h-8 cursor-pointer appearance-none bg-transparent z-10"
            />
          </div>

          {/* Time Hour Marks */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span className="text-amber-400 font-semibold">18:00 (Peak)</span>
            <span>24:00</span>
          </div>
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs ${
              playing
                ? "bg-amber-400 text-slate-950 font-bold hover:bg-amber-300"
                : "bg-white text-slate-900 hover:bg-slate-100"
            }`}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            <span>{playing ? "Pause" : "Play 24h"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              onSlotChange(peakSlot);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            title="Jump directly to peak diurnal congestion slot (18:30)"
          >
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-rose-400" />
              <span>Jump to Peak</span>
            </span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        .corridor-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #f59e0b;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
          cursor: grab;
          transition: transform 0.1s ease;
        }
        .corridor-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .corridor-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 3px solid #f59e0b;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
          cursor: grab;
        }
      `}</style>
    </div>
  );
}

/* ---------------- 2. Corridor Readout Telemetry Cards ---------------- */
export function CorridorReadout({ corridor, slot }: { corridor: ChainageCorridor; slot: number }) {
  const snap = useMemo(() => corridorSnapshot(corridor, slot), [corridor, slot]);

  const cards = [
    {
      title: "EV Traffic in Transit",
      value: snap.evsPerSlot.toLocaleString("en-IN"),
      unit: "EVs / 15m",
      icon: Car,
      accent: "text-slate-900",
      indicator: "bg-slate-500",
      detail: (
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5 text-sky-600" />
            <strong className="text-slate-900 font-mono">{snap.sides.NB.evsPerSlot}</strong> to Chd
          </span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1">
            <ArrowDownLeft className="h-3.5 w-3.5 text-indigo-600" />
            <strong className="text-slate-900 font-mono">{snap.sides.SB.evsPerSlot}</strong> to Del
          </span>
        </div>
      ),
      subtext: `~${snap.evsPerHourEquivalent.toLocaleString("en-IN")} EVs/hour on highway`,
    },
    {
      title: "Charging Demand Pull-In",
      value: snap.stopping.toLocaleString("en-IN"),
      unit: "Stops / 15m",
      icon: Zap,
      accent: "text-amber-700",
      indicator: "bg-amber-500",
      detail: (
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span>
            NB: <strong className="text-slate-900 font-mono">{snap.sides.NB.stopping}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            SB: <strong className="text-slate-900 font-mono">{snap.sides.SB.stopping}</strong>
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">
            {((snap.stopping / Math.max(1, snap.evsPerSlot)) * 100).toFixed(1)}% fleet share
          </span>
        </div>
      ),
      subtext: "Vehicles pulling into any station this slot",
    },
    {
      title: "Demand Fulfillment Rate",
      value: `${snap.foundChargerPct}%`,
      unit: "Fulfilled",
      icon: CheckCircle2,
      accent:
        snap.foundChargerPct >= 95
          ? "text-emerald-700"
          : snap.foundChargerPct >= 85
          ? "text-amber-700"
          : "text-rose-700",
      indicator:
        snap.foundChargerPct >= 95
          ? "bg-emerald-500"
          : snap.foundChargerPct >= 85
          ? "bg-amber-500"
          : "bg-rose-500",
      detail: (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-emerald-700 font-semibold">{snap.served} served</span>
          <span className="text-slate-300">·</span>
          <span className="text-amber-700 font-medium">{snap.waiting} queued</span>
          <span className="text-slate-300">·</span>
          <span className={snap.turnedAway > 0 ? "text-rose-700 font-bold" : "text-slate-400"}>
            {snap.turnedAway} unserved
          </span>
        </div>
      ),
      subtext: snap.turnedAway > 0 ? "Spillover queues at peak hubs" : "Zero queue bottleneck",
    },
    {
      title: "Active White Spaces (>30km)",
      value: String(snap.whiteSpaceCount),
      unit: `gaps · ${snap.whiteSpaceKm} km`,
      icon: AlertTriangle,
      accent: snap.whiteSpaceCount > 0 ? "text-rose-700" : "text-emerald-700",
      indicator: snap.whiteSpaceCount > 0 ? "bg-rose-500" : "bg-emerald-500",
      detail: (
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span>
            NB: <strong className="text-slate-900 font-mono">{snap.sides.NB.whiteSpaces.length}</strong> gaps
          </span>
          <span className="text-slate-300">·</span>
          <span>
            SB: <strong className="text-slate-900 font-mono">{snap.sides.SB.whiteSpaces.length}</strong> gaps
          </span>
        </div>
      ),
      subtext: `Dead-zones exceeding safe ${RED_MIN_KM} km spacing`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className="group relative rounded-xl border border-line bg-white p-4 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
          >
            {/* Top accent hairline */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.indicator} opacity-80`} />

            <div>
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  {c.title}
                </span>
                <Icon className={`h-4 w-4 ${c.accent} opacity-80 shrink-0`} />
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className={`font-mono text-2xl font-bold tracking-tight ${c.accent} tabular-nums`}>
                  {c.value}
                </span>
                <span className="text-xs font-semibold text-slate-500">{c.unit}</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
              {c.detail}
              <p className="text-[10.5px] text-slate-500 truncate">{c.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 3. Dual-Carriageway Chainage Strip ---------------- */
interface HighwaySector {
  id: string;
  name: string;
  shortLabel: string;
  minKm: number;
  maxKm: number;
}

const HIGHWAY_SECTORS: HighwaySector[] = [
  { id: "all", name: "Full Highway Corridor", shortLabel: "All (km 0–245)", minKm: 0, maxKm: 245 },
  { id: "s1", name: "Sector 1: Delhi – Sonipat / Murthal", shortLabel: "Delhi–Sonipat (0–50 km)", minKm: 0, maxKm: 50 },
  { id: "s2", name: "Sector 2: Panipat – Samalkha", shortLabel: "Panipat (50–100 km)", minKm: 50, maxKm: 100 },
  { id: "s3", name: "Sector 3: Karnal – Kurukshetra", shortLabel: "Karnal–Kurukshetra (100–180 km)", minKm: 100, maxKm: 180 },
  { id: "s4", name: "Sector 4: Ambala – Chandigarh", shortLabel: "Ambala–Chd (180–245 km)", minKm: 180, maxKm: 245 },
];

function assignStationTiers(stations: StationDay[]) {
  const sorted = [...stations].sort((a, b) => a.station.km - b.station.km);
  const tierMap = new Map<string, number>();
  const tiers: number[] = [];
  const minSpacingKm = 15; // stations closer than 15km must use different vertical tiers

  for (let i = 0; i < sorted.length; i++) {
    const km = sorted[i].station.km;
    const usedTiers = new Set<number>();
    for (let j = i - 1; j >= 0; j--) {
      if (km - sorted[j].station.km < minSpacingKm) {
        usedTiers.add(tiers[j]);
      } else {
        break;
      }
    }
    let tier = 0;
    while (usedTiers.has(tier)) {
      tier++;
    }
    const finalTier = tier % 3;
    tiers.push(finalTier);
    tierMap.set(sorted[i].station.id, finalTier);
  }
  return tierMap;
}

export function CorridorStrip({
  corridor,
  slot,
  onSelectToll,
}: {
  corridor: ChainageCorridor;
  slot: number;
  onSelectToll?: (tollId: string) => void;
}) {
  const [hoveredKm, setHoveredKm] = useState<{ side: Side; km: number } | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [activeSectorId, setActiveSectorId] = useState<string>("all");
  const [expandedSequenceSide, setExpandedSequenceSide] = useState<Record<Side, boolean>>({
    NB: true,
    SB: true,
  });

  const snap = useMemo(() => corridorSnapshot(corridor, slot), [corridor, slot]);
  const segs = useMemo(
    () => ({
      NB: segmentsForSlot(corridor, slot, "NB"),
      SB: segmentsForSlot(corridor, slot, "SB"),
    }),
    [corridor, slot]
  );
  const days = useMemo(() => simulateCorridor(corridor), [corridor]);
  const pct = (km: number) => `${(km / corridor.lengthKm) * 100}%`;

  // Aggregate stats across the whole strip
  const stats = useMemo(() => {
    let totalGuns = 0;
    let totalFree = 0;
    let totalBusy = 0;
    let totalOffline = 0;

    let nbGuns = 0;
    let nbFree = 0;
    let nbBusy = 0;
    let nbOffline = 0;
    let nbAvailableHubs = 0;

    let sbGuns = 0;
    let sbFree = 0;
    let sbBusy = 0;
    let sbOffline = 0;
    let sbAvailableHubs = 0;

    days.forEach((d) => {
      const h = d.slots[slot];
      const guns = d.station.guns;
      const free = h.gunsFree;
      const busy = h.gunsBusy;
      const isOffline = h.ubcStatus === "offline";

      totalGuns += guns;
      totalFree += free;
      totalBusy += busy;
      if (isOffline) totalOffline += guns;

      if (d.station.side === "NB") {
        nbGuns += guns;
        nbFree += free;
        nbBusy += busy;
        if (isOffline) nbOffline += guns;
        if (free > 0) nbAvailableHubs++;
      } else {
        sbGuns += guns;
        sbFree += free;
        sbBusy += busy;
        if (isOffline) sbOffline += guns;
        if (free > 0) sbAvailableHubs++;
      }
    });

    return {
      totalGuns,
      totalFree,
      totalBusy,
      totalOffline,
      totalFreePct: totalGuns > 0 ? Math.round((totalFree / totalGuns) * 100) : 0,
      nb: {
        guns: nbGuns,
        free: nbFree,
        busy: nbBusy,
        offline: nbOffline,
        availableHubs: nbAvailableHubs,
        freePct: nbGuns > 0 ? Math.round((nbFree / nbGuns) * 100) : 0,
      },
      sb: {
        guns: sbGuns,
        free: sbFree,
        busy: sbBusy,
        offline: sbOffline,
        availableHubs: sbAvailableHubs,
        freePct: sbGuns > 0 ? Math.round((sbFree / sbGuns) * 100) : 0,
      },
    };
  }, [days, slot]);

  // Precompute tier assignments per side
  const tiersBySide = useMemo(() => {
    return {
      NB: assignStationTiers(days.filter((d) => d.station.side === "NB")),
      SB: assignStationTiers(days.filter((d) => d.station.side === "SB")),
    };
  }, [days]);

  const selectedStationDay = useMemo(() => {
    if (!selectedStationId) return null;
    return days.find((d) => d.station.id === selectedStationId) ?? null;
  }, [days, selectedStationId]);

  const activeSector = HIGHWAY_SECTORS.find((s) => s.id === activeSectorId) ?? HIGHWAY_SECTORS[0];

  const hoveredSeg = hoveredKm
    ? segs[hoveredKm.side].find((s) => hoveredKm.km >= s.startKm && hoveredKm.km < s.endKm)
    : null;

  return (
    <div className={`${CORRIDOR_CARD} flex flex-col`}>
      <div className={CORRIDOR_CARD_HEAD}>
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-bold text-slate-900 tracking-tight">
            Corridor Chainage &amp; Charging Presence by Kilometre
          </h3>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-600 font-medium">NH-44 Both Carriageways</span>
        </div>

        {/* Legend pills */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3.5 rounded-xs" style={{ background: STATUS_COLORS.green }} />
            <span>&lt;{GREEN_MAX_KM}km (Covered)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3.5 rounded-xs" style={{ background: STATUS_COLORS.amber }} />
            <span>20–30km / Congested</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3.5 rounded-xs" style={{ background: STATUS_COLORS.red }} />
            <span className="font-bold text-rose-700">&gt;{RED_MIN_KM}km (White Space)</span>
          </span>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Whole Strip Total Charger Availability Hero Box */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Headline Big Metric */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
                <Zap className="h-6 w-6 fill-current text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Available Chargers in Whole Corridor
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 border border-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Live UBC Feed
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-mono text-3xl font-extrabold text-emerald-950 tabular-nums">
                    {stats.totalFree}
                  </span>
                  <span className="text-base font-bold text-emerald-800">
                    / {stats.totalGuns} Guns Available
                  </span>
                  <span className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                    {stats.totalFreePct}% Ready
                  </span>
                </div>
                <p className="text-[11.5px] text-emerald-800/90 mt-0.5">
                  Across all 50 fast-charging hubs on NH-44 ({corridor.lengthKm} km total corridor) at {snap.label}
                </p>
              </div>
            </div>

            {/* Directional Split Badges */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              {/* Northbound Pill */}
              <div className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-sky-700">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Northbound (to Chd)
                  </span>
                  <span className="font-mono text-slate-500">25 hubs</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                    {stats.nb.free}
                  </span>
                  <span className="text-xs font-medium text-slate-500">/ {stats.nb.guns} free</span>
                  <span className="text-[11px] font-bold text-sky-700 ml-auto">{stats.nb.freePct}%</span>
                </div>
              </div>

              {/* Southbound Pill */}
              <div className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1 text-indigo-700">
                    <ArrowDownLeft className="h-3.5 w-3.5" /> Southbound (to Del)
                  </span>
                  <span className="font-mono text-slate-500">25 hubs</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                    {stats.sb.free}
                  </span>
                  <span className="text-xs font-medium text-slate-500">/ {stats.sb.guns} free</span>
                  <span className="text-[11px] font-bold text-indigo-700 ml-auto">{stats.sb.freePct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Highway Sector Quick Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>Filter Highway Sector:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {HIGHWAY_SECTORS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSectorId(s.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  activeSectorId === s.id
                    ? "bg-slate-900 text-white font-bold shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {s.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Station Inspection Banner */}
        {selectedStationDay && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3.5 shadow-xs text-xs transition-all animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500 text-slate-950 font-bold px-2 py-0.5 text-[10.5px]">
                    Pinned Station
                  </span>
                  <span className="font-bold text-slate-950 text-sm">{selectedStationDay.station.name}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono font-medium text-slate-700">
                    km {selectedStationDay.station.km} ({selectedStationDay.station.side === "NB" ? "To Chandigarh" : "To Delhi"})
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 text-[11.5px]">
                  <span>Operator: <strong className="text-slate-900">{selectedStationDay.station.operator}</strong></span>
                  <span>Capacity: <strong className="text-slate-900 font-mono">{selectedStationDay.station.guns} guns × {selectedStationDay.station.powerKw} kW</strong></span>
                  <span>
                    Status: <strong className="font-bold" style={{ color: UBC_STATUS_META[selectedStationDay.slots[slot].ubcStatus].color }}>
                      {UBC_STATUS_META[selectedStationDay.slots[slot].ubcStatus].label}
                    </strong>
                  </span>
                  <span>
                    Live Available: <strong className="font-mono font-bold text-emerald-800 text-xs">
                      {selectedStationDay.slots[slot].gunsFree} of {selectedStationDay.station.guns} guns free
                    </strong>
                  </span>
                  <span>Queue: <strong className="font-mono text-slate-900">{Math.round(selectedStationDay.slots[slot].waiting)} waiting</strong></span>
                  <span>Upstream Gap: <strong className="font-mono text-slate-900">{selectedStationDay.upstreamGapKm} km</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStationId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-amber-200/60 cursor-pointer"
                title="Dismiss pinned station"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Carriageway Lanes */}
        {SIDES.map((side) => {
          const isNB = side === "NB";
          const sideDays = days
            .filter((d) => d.station.side === side)
            .sort((a, b) => a.station.km - b.station.km);

          return (
            <div key={side} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
              {/* Lane Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-lg text-xs font-bold ${
                      isNB ? "bg-sky-100 text-sky-800" : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {isNB ? "↑" : "↓"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {isNB ? "Northbound Carriageway (Delhi → Chandigarh)" : "Southbound Carriageway (Chandigarh → Delhi)"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        · {sideDays.length} charging hubs · {corridor.lengthKm} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prominent Lane Availability KPI Badge */}
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs shadow-2xs">
                    <span className="text-slate-500 font-medium">Carriageway Available:</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm tabular-nums">
                      {isNB ? stats.nb.free : stats.sb.free} / {isNB ? stats.nb.guns : stats.sb.guns} Guns Free
                    </span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                      {isNB ? stats.nb.freePct : stats.sb.freePct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Anti-Collision 3-Tier Staggered Station Indicators along the highway */}
              <div className="relative h-[98px] mb-1">
                {sideDays.map((d) => {
                  const h = d.slots[slot];
                  const meta = UBC_STATUS_META[h.ubcStatus];
                  const tier = tiersBySide[side].get(d.station.id) ?? 0;
                  // Tier heights:
                  // Tier 0: stem 8px
                  // Tier 1: stem 36px
                  // Tier 2: stem 64px
                  const stemH = tier === 0 ? 8 : tier === 1 ? 36 : 64;
                  const isSelected = selectedStationId === d.station.id;
                  const inSector =
                    activeSector.id === "all" ||
                    (d.station.km >= activeSector.minKm && d.station.km <= activeSector.maxKm);

                  return (
                    <div
                      key={d.station.id}
                      onClick={() => setSelectedStationId(isSelected ? null : d.station.id)}
                      className={`group absolute -translate-x-1/2 flex flex-col items-center cursor-pointer transition-opacity duration-150 ${
                        inSector ? "opacity-100" : "opacity-30"
                      } ${isSelected ? "z-40" : tier === 2 ? "z-30" : tier === 1 ? "z-20" : "z-10"}`}
                      style={{
                        left: pct(d.station.km),
                        bottom: 0,
                      }}
                    >
                      {/* Badge container with hover tooltip */}
                      <div className="relative flex flex-col items-center">
                        {/* The Badge */}
                        <div
                          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-bold shadow-xs border transition-all duration-150 ${
                            isSelected
                              ? "ring-2 ring-amber-400 bg-slate-950 text-amber-300 border-amber-400 scale-110 shadow-md"
                              : h.gunsFree > 0
                              ? "bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500/80 group-hover:scale-110"
                              : h.ubcStatus === "offline"
                              ? "bg-slate-600 hover:bg-slate-500 text-slate-200 border-slate-500 group-hover:scale-110"
                              : "bg-amber-600 hover:bg-amber-500 text-white border-amber-400/80 group-hover:scale-110"
                          }`}
                          title={`${d.station.name} (${d.station.km} km): ${h.gunsFree} of ${d.station.guns} chargers free`}
                        >
                          <Zap className={`h-2.5 w-2.5 fill-current shrink-0 ${isSelected ? "text-amber-400" : ""}`} />
                          <span>{h.gunsFree}</span>
                          <span className="text-[9.5px] opacity-80">/{d.station.guns}</span>
                        </div>

                        {/* Hover quick card */}
                        {!isSelected && (
                          <div className="pointer-events-none absolute bottom-full mb-1.5 hidden group-hover:flex flex-col rounded-lg bg-slate-950 p-2.5 text-[11px] text-white shadow-xl min-w-[220px] z-50 border border-slate-700">
                            <div className="font-bold text-amber-400">{d.station.name}</div>
                            <div className="text-[10px] text-slate-300">
                              km {d.station.km} · {d.station.operator} · {d.station.guns} guns × {d.station.powerKw} kW
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] pt-1 border-t border-slate-800">
                              <span className="text-slate-400">Live Free Guns:</span>
                              <span className="font-bold font-mono text-emerald-400 text-xs">
                                {h.gunsFree} of {d.station.guns} Free
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">UBC Feed Status:</span>
                              <span className="font-semibold" style={{ color: meta.color }}>
                                {meta.label}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Asset Utilization:</span>
                              <span className="font-mono text-slate-200">{h.utilizationPct}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400">Upstream Gap:</span>
                              <span className="font-mono text-amber-300">{d.upstreamGapKm} km behind</span>
                            </div>
                            <div className="mt-1 text-[9.5px] text-slate-400 text-right italic">Click to pin details</div>
                          </div>
                        )}
                      </div>

                      {/* Stem line connecting badge to highway ribbon */}
                      <div
                        className={`w-[1.5px] transition-colors ${
                          isSelected
                            ? "bg-amber-500 w-[2px]"
                            : "bg-slate-300 group-hover:bg-amber-400"
                        }`}
                        style={{ height: `${stemH}px` }}
                      />
                      {/* Anchor dot on ribbon */}
                      <div
                        className={`rounded-full ring-2 ring-white transition-colors ${
                          isSelected
                            ? "h-2 w-2 bg-amber-500"
                            : "h-1.5 w-1.5 bg-slate-600 group-hover:bg-amber-600"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Segmented Highway Ribbon */}
              <div className="relative flex h-5 w-full overflow-hidden rounded-md border border-slate-300/80 shadow-2xs">
                {segs[side].map((s) => (
                  <div
                    key={s.startKm}
                    className="h-full cursor-pointer transition-opacity hover:opacity-85 border-r border-white/20"
                    style={{
                      width: pct(s.endKm - s.startKm),
                      background: STATUS_COLORS[s.status],
                    }}
                    onMouseEnter={() => setHoveredKm({ side, km: s.startKm })}
                    onMouseLeave={() => setHoveredKm(null)}
                  />
                ))}
              </div>

              {/* Milestone Ruler */}
              <div className="mt-1.5 flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
                <span>km 0 (Delhi)</span>
                <span>km 60</span>
                <span>km 120 (Karnal)</span>
                <span>km 180 (Kurukshetra)</span>
                <span>km {corridor.lengthKm} (Chandigarh)</span>
              </div>

              {/* Toll Plazas Waypoint tags along this carriageway */}
              <div className="relative h-7 mt-2">
                {corridor.tolls.map((t) => {
                  const flow = tollFlowAtSlot(t.tollId, slot, side);
                  return (
                    <button
                      key={t.tollId}
                      type="button"
                      onClick={() => onSelectToll?.(t.tollId)}
                      className="absolute top-0 -translate-x-1/2 rounded-md bg-slate-900 hover:bg-amber-600 px-2 py-0.5 text-[10.5px] font-semibold text-white shadow-2xs hover:shadow-xs transition-colors flex items-center gap-1 cursor-pointer z-10"
                      style={{ left: pct(t.km) }}
                      title={`Inspect ${tollShortName(t.tollId)} Toll Plaza (${flow} EVs this slot)`}
                    >
                      <Car className="h-2.5 w-2.5 text-amber-400" />
                      <span>{tollShortName(t.tollId)}</span>
                      <span className="font-mono text-slate-300 text-[10px]">({flow})</span>
                    </button>
                  );
                })}
              </div>

              {/* Interactive Station Sequencer Rack */}
              <div className="mt-3 pt-2.5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSequenceSide((prev) => ({
                        ...prev,
                        [side]: !prev[side],
                      }))
                    }
                    className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-800 hover:text-slate-950 cursor-pointer"
                  >
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${
                        expandedSequenceSide[side] ? "rotate-90 text-amber-600" : "text-slate-400"
                      }`}
                    />
                    <span>Station-by-Station Charger Counts ({sideDays.length} Hubs in Route Order)</span>
                  </button>
                  <span className="text-[10.5px] text-slate-500 font-mono">
                    Scroll horizontally to inspect each hub
                  </span>
                </div>

                {expandedSequenceSide[side] && (
                  <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                    {sideDays.map((d) => {
                      const h = d.slots[slot];
                      const isSelected = selectedStationId === d.station.id;
                      const inSector =
                        activeSector.id === "all" ||
                        (d.station.km >= activeSector.minKm && d.station.km <= activeSector.maxKm);

                      return (
                        <div
                          key={d.station.id}
                          onClick={() => setSelectedStationId(isSelected ? null : d.station.id)}
                          className={`flex-shrink-0 w-[150px] rounded-lg border p-2 text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "border-amber-400 bg-amber-50/90 ring-2 ring-amber-400/50 shadow-xs"
                              : inSector
                              ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                              : "border-slate-100 bg-slate-50 opacity-40"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                            <span className="font-mono font-bold text-slate-700">km {d.station.km}</span>
                            <span className="truncate max-w-[80px]">{d.station.operator}</span>
                          </div>
                          <div className="font-bold text-slate-900 text-[11px] truncate" title={d.station.name}>
                            {d.station.name}
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold ${
                                h.gunsFree > 0
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : h.ubcStatus === "offline"
                                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              <Zap className="h-2.5 w-2.5 fill-current" />
                              <span>{h.gunsFree}/{d.station.guns} free</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">{d.station.powerKw} kW</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Hover telemetry inspector box */}
        <div className="rounded-lg bg-slate-100 p-2.5 text-xs text-slate-700 min-h-[36px] flex items-center">
          {hoveredSeg ? (
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: STATUS_COLORS[hoveredSeg.status] }}
              />
              <span>
                <strong>
                  {SIDE_LABEL[hoveredSeg.side].short} (km {hoveredSeg.startKm}–{hoveredSeg.endKm}):
                </strong>{" "}
                {hoveredSeg.reason} ·{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {hoveredSeg.evsPassing} EVs
                </span>{" "}
                passing this 15-min window.
              </span>
            </div>
          ) : (
            <span className="text-slate-500 italic">
              Hover over any highway segment ribbon above to inspect live charging gap risk and EV density.
            </span>
          )}
        </div>

        {/* Structured White Space & Bottleneck Audit (Clean, no raw pill clutter) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Identified Infrastructure White Spaces &amp; Bottlenecks
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Evaluated against MoP 20km highway guideline
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {SIDES.flatMap((side) =>
              snap.sides[side].whiteSpaces.map((r) => (
                <div
                  key={`${side}-ws-${r.startKm}`}
                  className="rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" />
                      <strong className="text-rose-950 font-semibold">
                        {side === "NB" ? "To Chandigarh (NB)" : "To Delhi (SB)"}: km {r.startKm} to {r.endKm}
                      </strong>
                    </div>
                    <p className="text-[11px] text-rose-800">
                      {r.lengthKm} km continuous stretch with zero active fast-charging hubs.
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                    +{r.lengthKm - RED_MIN_KM} km gap
                  </span>
                </div>
              ))
            )}

            {SIDES.flatMap((side) =>
              snap.sides[side].amberStretches
                .filter((r) => r.lengthKm >= 15)
                .map((r) => (
                  <div
                    key={`${side}-amber-${r.startKm}`}
                    className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
                        <strong className="text-amber-950 font-semibold">
                          {side === "NB" ? "To Chandigarh (NB)" : "To Delhi (SB)"}: km {r.startKm} to {r.endKm}
                        </strong>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        {r.lengthKm} km buffer zone or peak gun saturation risk.
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                      Congestion Alert
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 4. Station Telemetry Table ---------------- */
export function CorridorStationTable({ corridor, slot }: { corridor: ChainageCorridor; slot: number }) {
  const [tableSide, setTableSide] = useState<Side | "both">("both");
  const days = useMemo(() => simulateCorridor(corridor), [corridor]);
  const rows = days
    .filter((d) => tableSide === "both" || d.station.side === tableSide)
    .sort((a, b) =>
      a.station.side === b.station.side ? a.station.km - b.station.km : a.station.side === "NB" ? -1 : 1
    );

  return (
    <div className={CORRIDOR_CARD}>
      <div className={CORRIDOR_CARD_HEAD}>
        <div>
          <h3 className="font-display text-sm font-bold text-slate-900 tracking-tight">
            Highway Fast-Charging Stations Telemetry
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Live status at {slotLabel(slot)} · {rows.length} stations
          </p>
        </div>

        {/* Side filter segmented control */}
        <div className="flex gap-1 rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold">
          {(["both", "NB", "SB"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTableSide(k)}
              className={`rounded-md px-2.5 py-1 transition-all ${
                tableSide === k
                  ? "bg-white text-slate-950 font-bold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {k === "both" ? "Both Directions" : k === "NB" ? "To Chandigarh" : "To Delhi"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[460px] overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-semibold text-slate-600 z-10 border-b border-line">
            <tr>
              <th className="px-3.5 py-2.5">Station &amp; Operator</th>
              <th className="px-2.5 py-2.5">Direction</th>
              <th className="px-2.5 py-2.5 text-right">Chainage</th>
              <th className="px-2.5 py-2.5 text-right">Upstream Gap</th>
              <th className="px-3 py-2.5">Live Status</th>
              <th className="px-2.5 py-2.5 text-right">Guns Free</th>
              <th className="px-2.5 py-2.5 text-right">Demand</th>
              <th className="px-2.5 py-2.5 text-right">Queued</th>
              <th className="px-3 py-2.5">Asset Utilization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((d) => {
              const h = d.slots[slot];
              const meta = UBC_STATUS_META[h.ubcStatus];
              return (
                <tr
                  key={d.station.id}
                  id={`corridor-station-row-${d.station.id}`}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-3.5 py-2">
                    <div className="font-semibold text-slate-900">{d.station.name}</div>
                    <div className="text-[10.5px] text-slate-500">
                      {d.station.operator} · {d.station.guns} guns × {d.station.powerKw} kW
                    </div>
                  </td>
                  <td className="px-2.5 py-2 text-slate-700 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        d.station.side === "NB"
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                      }`}
                    >
                      {d.station.side === "NB" ? "↑ Chd" : "↓ Del"}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono font-medium text-slate-800">
                    km {d.station.km}
                  </td>
                  <td
                    className={`px-2.5 py-2 text-right font-mono ${
                      d.upstreamGapKm > RED_MIN_KM
                        ? "font-bold text-rose-700"
                        : d.upstreamGapKm >= GREEN_MAX_KM
                        ? "text-amber-700"
                        : "text-slate-600"
                    }`}
                  >
                    {d.upstreamGapKm} km
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 font-semibold text-[11px]"
                      style={{ color: meta.color }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono font-semibold text-slate-900">
                    {h.gunsFree} / {d.station.guns}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-slate-700">
                    {Math.round(h.arrivals)}
                  </td>
                  <td
                    className={`px-2.5 py-2 text-right font-mono ${
                      h.turnedAway >= 0.5 ? "font-bold text-rose-700" : "text-slate-400"
                    }`}
                  >
                    {Math.round(h.turnedAway)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${h.utilizationPct}%`,
                            background:
                              h.ubcStatus === "offline"
                                ? "#94a3b8"
                                : h.utilizationPct >= 90
                                ? "#f59e0b"
                                : "#10b981",
                          }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-medium text-slate-700">
                        {h.ubcStatus === "offline" ? "—" : `${h.utilizationPct}%`}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Upstream gap is measured along the same carriageway in the direction of travel.</span>
        <span className="font-medium text-slate-700">Source: {UBC_SOURCE.name}</span>
      </div>
    </div>
  );
}

/* ---------------- 5. Clean Non-Intrusive Map Legend & HUD Overlay ---------------- */
export function CorridorMapChips({ slot }: { slot: number }) {
  return (
    <>
      {/* Top-Right: Clean UBC Live Telemetry Pill */}
      <div className="absolute right-3 top-3 z-[500] flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/95 backdrop-blur-xs px-3 py-1.5 text-xs text-slate-800 shadow-md">
        <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
        <span className="font-bold text-slate-900">{UBC_SOURCE.code} Live</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500 text-[11px]">{slotLabel(slot)} feed</span>
      </div>

      {/* Bottom: Compact, unobtrusive legend strip that doesn't block the highway */}
      <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap items-center gap-2 rounded-lg border border-slate-200/90 bg-white/95 backdrop-blur-xs px-3 py-2 text-[11px] text-slate-700 shadow-md max-w-[90%]">
        <span className="font-bold text-slate-900 mr-1">Ribbons:</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-xs" style={{ background: STATUS_COLORS.green }} />
          <span>&lt;20km</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-xs" style={{ background: STATUS_COLORS.amber }} />
          <span>20–30km</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-xs" style={{ background: STATUS_COLORS.red }} />
          <span className="font-bold text-rose-700">&gt;30km White Space</span>
        </span>

        <span className="text-slate-300 mx-1">|</span>

        <span className="font-bold text-slate-900 mr-1">Pins:</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-xs" style={{ background: UBC_STATUS_META.available.color }} />
          <span>Available</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-xs" style={{ background: UBC_STATUS_META.busy.color }} />
          <span>Busy</span>
        </span>
      </div>
    </>
  );
}

/* ---------------- 6. Dedicated Below-Map Corridor Charger Availability Deck ---------------- */
export function CorridorBelowMapAvailability({
  corridor,
  slot,
  onSelectStation,
}: {
  corridor: ChainageCorridor;
  slot: number;
  onSelectStation?: (stationId: string) => void;
}) {
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "NB" | "SB">("ALL");
  const [availFilter, setAvailFilter] = useState<"all" | "available" | "fast">("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"km-asc" | "free-desc" | "power-desc">("km-asc");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const days = useMemo(() => simulateCorridor(corridor), [corridor]);

  // Aggregate stats across the highway
  const stats = useMemo(() => {
    let totalGuns = 0;
    let totalFree = 0;
    let totalBusy = 0;
    let totalOffline = 0;

    let nbGuns = 0;
    let nbFree = 0;
    let nbAvailableHubs = 0;

    let sbGuns = 0;
    let sbFree = 0;
    let sbAvailableHubs = 0;

    let fastGuns = 0;
    let fastFree = 0;

    days.forEach((d) => {
      const h = d.slots[slot];
      const guns = d.station.guns;
      const free = h.gunsFree;
      const busy = h.gunsBusy;
      const isOffline = h.ubcStatus === "offline";

      totalGuns += guns;
      totalFree += free;
      totalBusy += busy;
      if (isOffline) totalOffline += guns;

      if (d.station.powerKw >= 100) {
        fastGuns += guns;
        fastFree += free;
      }

      if (d.station.side === "NB") {
        nbGuns += guns;
        nbFree += free;
        if (free > 0 && !isOffline) nbAvailableHubs++;
      } else {
        sbGuns += guns;
        sbFree += free;
        if (free > 0 && !isOffline) sbAvailableHubs++;
      }
    });

    return {
      totalGuns,
      totalFree,
      totalBusy,
      totalOffline,
      totalFreePct: totalGuns > 0 ? Math.round((totalFree / totalGuns) * 100) : 0,
      fastGuns,
      fastFree,
      nb: {
        guns: nbGuns,
        free: nbFree,
        hubsOpen: nbAvailableHubs,
        pct: nbGuns > 0 ? Math.round((nbFree / nbGuns) * 100) : 0,
      },
      sb: {
        guns: sbGuns,
        free: sbFree,
        hubsOpen: sbAvailableHubs,
        pct: sbGuns > 0 ? Math.round((sbFree / sbGuns) * 100) : 0,
      },
    };
  }, [days, slot]);

  // Filter and sort station list
  const filteredStations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const sector = HIGHWAY_SECTORS.find((s) => s.id === sectorFilter);

    return days
      .filter((d) => {
        const h = d.slots[slot];
        // Direction
        if (directionFilter !== "ALL" && d.station.side !== directionFilter) return false;
        // Availability
        if (availFilter === "available" && h.gunsFree <= 0) return false;
        if (availFilter === "fast" && d.station.powerKw < 100) return false;
        // Sector
        if (sector && sector.id !== "all") {
          if (d.station.km < sector.minKm || d.station.km > sector.maxKm) return false;
        }
        // Search
        if (q) {
          const matchName = d.station.name.toLowerCase().includes(q);
          const matchOp = d.station.operator.toLowerCase().includes(q);
          const matchKm = `km ${d.station.km}`.includes(q) || String(d.station.km).includes(q);
          if (!matchName && !matchOp && !matchKm) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "free-desc") {
          const diff = b.slots[slot].gunsFree - a.slots[slot].gunsFree;
          if (diff !== 0) return diff;
        } else if (sortBy === "power-desc") {
          const diff = b.station.powerKw - a.station.powerKw;
          if (diff !== 0) return diff;
        }
        // Default km sequence
        return a.station.km - b.station.km;
      });
  }, [days, slot, directionFilter, availFilter, sectorFilter, searchQuery, sortBy]);

  return (
    <div className={`${CORRIDOR_CARD} flex flex-col flex-1`}>
      {/* Header */}
      <div className={CORRIDOR_CARD_HEAD}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs shrink-0">
            <BatteryCharging className="h-4 w-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-[14.5px] font-bold text-slate-900 leading-tight">
                Highway Charger Availability Deck
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live {slotLabel(slot)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Real-time available guns, wait queues &amp; hub readiness directly below the corridor
            </p>
          </div>
        </div>

        {/* Search input in header */}
        <div className="relative w-44 sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Find hub, town, operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
        {/* Executive Availability KPI Summary Ribbon */}
        <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-teal-50/60 p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Primary metric */}
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-900 block">
                  Corridor Free Chargers
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-950 tabular-nums">
                    {stats.totalFree}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-800">
                    / {stats.totalGuns} Guns Free
                  </span>
                  <span className="rounded-md bg-white/95 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-emerald-700 border border-emerald-300 shadow-2xs">
                    {stats.totalFreePct}% Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Split Direction Quick Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDirectionFilter(directionFilter === "NB" ? "ALL" : "NB")}
                className={`px-3 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  directionFilter === "NB"
                    ? "bg-sky-600 text-white border-sky-700 font-bold shadow-xs"
                    : "bg-white/90 hover:bg-white text-slate-800 border-slate-200"
                }`}
              >
                <div className="text-[10px] uppercase font-semibold opacity-85">NB (to Chd)</div>
                <div className="font-mono font-bold text-[12px] flex items-center gap-1">
                  <span>{stats.nb.free} / {stats.nb.guns} Free</span>
                  <span className="text-[10px] opacity-75">({stats.nb.pct}%)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDirectionFilter(directionFilter === "SB" ? "ALL" : "SB")}
                className={`px-3 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                  directionFilter === "SB"
                    ? "bg-indigo-600 text-white border-indigo-700 font-bold shadow-xs"
                    : "bg-white/90 hover:bg-white text-slate-800 border-slate-200"
                }`}
              >
                <div className="text-[10px] uppercase font-semibold opacity-85">SB (to Del)</div>
                <div className="font-mono font-bold text-[12px] flex items-center gap-1">
                  <span>{stats.sb.free} / {stats.sb.guns} Free</span>
                  <span className="text-[10px] opacity-75">({stats.sb.pct}%)</span>
                </div>
              </button>

              <div className="hidden sm:block px-3 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-800">
                <div className="text-[10px] uppercase font-semibold text-slate-500">120kW Rapid</div>
                <div className="font-mono font-bold text-[12px] text-amber-900">
                  {stats.fastFree} / {stats.fastGuns} Free
                </div>
              </div>
            </div>
          </div>

          {/* Visual capacity distribution bar */}
          <div className="mt-3.5">
            <div className="h-2 w-full rounded-full bg-slate-200/90 overflow-hidden flex shadow-inner">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(stats.totalFree / Math.max(1, stats.totalGuns)) * 100}%` }}
                title={`${stats.totalFree} Free Guns`}
              />
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${(stats.totalBusy / Math.max(1, stats.totalGuns)) * 100}%` }}
                title={`${stats.totalBusy} Busy Guns`}
              />
              <div
                className="h-full bg-slate-400 transition-all duration-300"
                style={{ width: `${(stats.totalOffline / Math.max(1, stats.totalGuns)) * 100}%` }}
                title={`${stats.totalOffline} Offline Guns`}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-600 mt-1.5 font-medium px-0.5">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-2 rounded-xs bg-emerald-500" />
                <strong className="text-emerald-800">{stats.totalFree} Free</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-2 rounded-xs bg-amber-400" />
                <strong className="text-amber-800">{stats.totalBusy} In Use</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-2 rounded-xs bg-slate-400" />
                <strong className="text-slate-600">{stats.totalOffline} Maintenance</strong>
              </span>
              <span className="text-slate-500">
                50 Total Highway Hubs
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Filter & Sort Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-0.5">
          {/* Direction & Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDirectionFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  directionFilter === "ALL"
                    ? "bg-white text-slate-950 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                All (50)
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter("NB")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  directionFilter === "NB"
                    ? "bg-sky-600 text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-sky-700"
                }`}
              >
                <span>↑ NB (25)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter("SB")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  directionFilter === "SB"
                    ? "bg-indigo-600 text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-indigo-700"
                }`}
              >
                <span>↓ SB (25)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAvailFilter(availFilter === "available" ? "all" : "available")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                availFilter === "available"
                  ? "bg-emerald-600 text-white border-emerald-700 font-bold shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              Free Guns Only ({days.filter((d) => d.slots[slot].gunsFree > 0).length})
            </button>

            <button
              type="button"
              onClick={() => setAvailFilter(availFilter === "fast" ? "all" : "fast")}
              className={`hidden sm:inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                availFilter === "fast"
                  ? "bg-amber-600 text-white border-amber-700 font-bold shadow-2xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              ⚡ 120 kW Fast
            </button>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "km-asc" | "free-desc" | "power-desc")}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 cursor-pointer focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="km-asc">Chainage (km 0 → 245)</option>
              <option value="free-desc">Most Available Guns</option>
              <option value="power-desc">Highest Power (kW)</option>
            </select>
          </div>
        </div>

        {/* Highway Sector Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
          <span className="text-slate-400 font-bold mr-1 shrink-0 uppercase text-[10px]">Sector:</span>
          {HIGHWAY_SECTORS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSectorFilter(sec.id)}
              className={`px-2.5 py-1 rounded-md shrink-0 transition-all cursor-pointer font-semibold ${
                sectorFilter === sec.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sec.shortLabel}
            </button>
          ))}
        </div>

        {/* Station-by-Station Charger Availability Cards List */}
        <div className="flex-1 min-h-[380px] max-h-[660px] overflow-y-auto pr-1.5 space-y-3 custom-scrollbar">
          {filteredStations.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-800">No charging hubs match this filter</p>
              <p className="text-xs text-slate-500 mt-1">
                Try resetting your sector, direction, or search query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDirectionFilter("ALL");
                  setAvailFilter("all");
                  setSectorFilter("all");
                  setSearchQuery("");
                }}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredStations.map((d) => {
              const h = d.slots[slot];
              const guns = d.station.guns;
              const free = h.gunsFree;
              const busy = h.gunsBusy;
              const isSelected = selectedStationId === d.station.id;
              const isOffline = h.ubcStatus === "offline";
              const freePct = guns > 0 ? Math.round((free / guns) * 100) : 0;

              return (
                <div
                  key={d.station.id}
                  onClick={() => {
                    setSelectedStationId(isSelected ? null : d.station.id);
                    if (onSelectStation) onSelectStation(d.station.id);
                  }}
                  className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/30 shadow-md ring-2 ring-emerald-400/30"
                      : free > 0
                      ? "border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-xs"
                      : "border-slate-200/70 bg-slate-50/60 hover:border-slate-300"
                  }`}
                >
                  {/* Top row: Name, Direction, Chainage, Operator, Available pill */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10.5px] font-extrabold shrink-0 ${
                          d.station.side === "NB"
                            ? "bg-sky-100 text-sky-900 border border-sky-300"
                            : "bg-indigo-100 text-indigo-900 border border-indigo-300"
                        }`}
                      >
                        {d.station.side === "NB" ? "↑ NB" : "↓ SB"}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-950 text-[14px] leading-snug group-hover:text-emerald-900">
                            {d.station.name}
                          </h4>
                          <span className="font-mono text-xs font-semibold text-slate-500">
                            km {d.station.km}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-700">{d.station.operator}</span>
                          <span>·</span>
                          <span className="font-mono font-semibold text-amber-800">{d.station.powerKw} kW</span>
                          <span>·</span>
                          <span className="text-slate-500">{guns} Total Guns</span>
                        </div>
                      </div>
                    </div>

                    {/* Prominent Charger Availability Pill */}
                    <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                      <div
                        className={`px-3 py-1 rounded-lg border text-right font-mono transition-all ${
                          isOffline
                            ? "bg-slate-100 border-slate-300 text-slate-600 font-semibold"
                            : free > 0
                            ? "bg-emerald-100/90 border-emerald-300 text-emerald-950 font-bold shadow-2xs"
                            : "bg-amber-100/80 border-amber-300 text-amber-950 font-bold"
                        }`}
                      >
                        <div className="text-[13px] font-extrabold flex items-center gap-1.5 justify-end">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isOffline ? "bg-slate-400" : free > 0 ? "bg-emerald-600 animate-pulse" : "bg-amber-500"
                            }`}
                          />
                          <span>
                            {isOffline ? "Offline" : `${free} / ${guns} Free`}
                          </span>
                        </div>
                        <div className="text-[10px] font-sans font-medium text-slate-600 text-right">
                          {isOffline
                            ? "Maintenance"
                            : free > 0
                            ? `${freePct}% Available`
                            : `Full (Queue: ${Math.round(h.turnedAway)})`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual Gun Segment Blocks (Clear & Visual) */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-[10.5px]">
                      <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                        Live Charger Bay Availability:
                      </span>
                      <span className="font-mono text-slate-500">
                        {free} Free · {busy} In Use · {guns - free - busy} Inactive
                      </span>
                    </div>

                    {/* Segmented Charger Bay Blocks */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Array.from({ length: guns }).map((_, gunIdx) => {
                        const isFreeGun = gunIdx < free;
                        const isBusyGun = !isFreeGun && gunIdx < free + busy;
                        const isInactive = !isFreeGun && !isBusyGun;

                        return (
                          <div
                            key={gunIdx}
                            title={
                              isFreeGun
                                ? `Charger Gun #${gunIdx + 1} is FREE & READY`
                                : isBusyGun
                                ? `Charger Gun #${gunIdx + 1} is BUSY in session`
                                : `Charger Gun #${gunIdx + 1} is offline`
                            }
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-bold transition-all shadow-2xs ${
                              isFreeGun
                                ? "bg-emerald-500 text-white border border-emerald-600"
                                : isBusyGun
                                ? "bg-amber-300 text-amber-950 border border-amber-400"
                                : "bg-slate-200 text-slate-600 border border-slate-300"
                            }`}
                          >
                            <Zap className={`h-3 w-3 ${isFreeGun ? "fill-current" : ""}`} />
                            <span>G{gunIdx + 1}</span>
                            {isFreeGun ? (
                              <span className="text-[9px] font-sans font-semibold uppercase bg-emerald-600/60 px-1 rounded-xs">
                                Free
                              </span>
                            ) : isBusyGun ? (
                              <span className="text-[9px] font-sans font-semibold uppercase bg-amber-400/60 px-1 rounded-xs">
                                Busy
                              </span>
                            ) : (
                              <span className="text-[9px] font-sans font-medium uppercase text-slate-500">
                                Off
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Micro telemetry footer */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 bg-slate-50/80 rounded-lg px-2.5 py-1.5 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span>
                        Flow: <strong className="font-mono text-slate-900">{Math.round(h.arrivals)}</strong> EVs/15m
                      </span>
                      <span>·</span>
                      <span>
                        Queue: <strong className={`font-mono ${h.turnedAway > 0 ? "text-rose-700 font-bold" : "text-slate-800"}`}>{Math.round(h.turnedAway)}</strong> cars
                      </span>
                      <span>·</span>
                      <span>
                        Utilization: <strong className="font-mono text-slate-900">{h.utilizationPct}%</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {d.upstreamGapKm > RED_MIN_KM ? (
                        <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
                          ⚠️ {d.upstreamGapKm}km gap behind
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">
                          {d.upstreamGapKm}km from prev hub
                        </span>
                      )}
                      <span className="text-emerald-700 font-semibold text-[10.5px] hover:underline flex items-center gap-0.5">
                        Inspect telemetry <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer summary bar */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">
              Showing {filteredStations.length} of {days.length} corridor hubs
            </span>
            <span>·</span>
            <span>
              {filteredStations.reduce((acc, curr) => acc + curr.slots[slot].gunsFree, 0)} live free chargers displayed
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Source: Universal Bharat Charge (UBC)
          </div>
        </div>
      </div>
    </div>
  );
}
