// ============================================================
// CORRIDOR CHAINAGE MODEL (dummy data, fully deterministic)
//
// One linked model for a highway corridor, replacing the three
// disconnected datasets used earlier:
//
//   toll hourly EV flow  ->  EVs that stop to charge  ->  guns free or busy
//        ->  served vs turned away  ->  utilization  ->  white space colour
//
// Every station sits at a kilometre marker (chainage) along the
// route, so gaps such as "charger every 20 km" or "80 km hole"
// are visible by construction. See DATA_ASSUMPTIONS.md section 8.
// ============================================================

import { TOLL_PLAZAS } from "./tollAndGridData";
import { HourlyTollFlow } from "./types";

// ---------- Thresholds (single source of truth) ----------
export const GREEN_MAX_KM = 20; // nearest usable charger under 20 km
export const RED_MIN_KM = 30; // nearest physical charger beyond 30 km
export const SEGMENT_KM = 5; // resolution of the white space strip
export const FULL_UTILIZATION = 0.9; // at or above this a station counts as occupied
export const TARGET_UTILIZATION = 0.75; // sizing target for the requirement
export const TOLL_CATCHMENT_KM = 15;

// ---------- Time resolution: 15 minute slots ----------
export const SLOTS_PER_HOUR = 4;
export const SLOTS_PER_DAY = 96;
export function slotLabel(slot: number): string {
  const h = Math.floor(slot / SLOTS_PER_HOUR);
  const m = (slot % SLOTS_PER_HOUR) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export function slotToHour(slot: number): number {
  return Math.floor(slot / SLOTS_PER_HOUR);
}

// ---------- Carriageway (side of the road) ----------
// India drives on the left. Delhi to Chandigarh bound traffic (northbound)
// uses the left carriageway; Chandigarh to Delhi bound (southbound) the right.
export type Side = "NB" | "SB";
export const SIDES: Side[] = ["NB", "SB"];
export const SIDE_LABEL: Record<Side, { short: string; long: string; road: string }> = {
  NB: { short: "Delhi → Chandigarh", long: "Delhi to Chandigarh bound", road: "left carriageway" },
  SB: { short: "Chandigarh → Delhi", long: "Chandigarh to Delhi bound", road: "right carriageway" },
};

// ---------- Real time availability source ----------
// Live charger status is attributed to Unified Bharat eCharge (UBC). The
// demo simulates the feed; the label tells viewers where production data
// would come from.
export const UBC_SOURCE = {
  code: "UBC",
  name: "Unified Bharat eCharge",
  note: "simulated feed, 15 minute refresh",
};
export type UbcStatus = "available" | "busy" | "offline";
export const UBC_STATUS_META: Record<UbcStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "#2C6E52" },
  busy: { label: "All guns busy", color: "#D97706" },
  offline: { label: "Offline", color: "#64748b" },
};

export type SegmentStatus = "green" | "amber" | "red";

export const STATUS_COLORS: Record<SegmentStatus, string> = {
  green: "#2C6E52",
  amber: "#D97706",
  red: "#B43424",
};

// ---------- Route geometry ----------
export interface RouteNode {
  name: string;
  km: number;
  lat: number;
  lng: number;
}

export interface ChainageStation {
  id: string;
  name: string;
  km: number;
  side: Side;
  operator: string;
  guns: number;
  powerKw: number;
  // Relative pull of the site (food courts and dhabas attract more stops)
  attraction: number;
  uptimePct: number;
}

export interface ChainageToll {
  tollId: string; // id in TOLL_PLAZAS
  km: number;
}

export interface ChainageCorridor {
  id: string; // matches CORRIDORS[].id in lib/data.ts
  name: string;
  lengthKm: number;
  nodes: RouteNode[];
  stations: ChainageStation[];
  tolls: ChainageToll[];
}

// Delhi to Chandigarh. Nodes pass through the same waypoints as the map
// ribbon in lib/data.ts so the coloured overlay sits exactly on top of it.
export const NH44_DELHI_CHANDIGARH: ChainageCorridor = {
  id: "delhi-chandigarh-nh44",
  name: "Delhi – Chandigarh (NH44)",
  lengthKm: 245,
  nodes: [
    { name: "Delhi (Mukarba Chowk)", km: 0, lat: 28.74, lng: 77.15 },
    { name: "Sonipat / Murthal", km: 44, lat: 28.99, lng: 77.01 },
    { name: "Panipat", km: 90, lat: 29.39, lng: 76.97 },
    { name: "Karnal", km: 123, lat: 29.68, lng: 76.99 },
    { name: "Ambala Cantt", km: 203, lat: 30.38, lng: 76.78 },
    { name: "Zirakpur", km: 236, lat: 30.64, lng: 76.82 },
    { name: "Chandigarh", km: 245, lat: 30.72, lng: 76.78 },
  ],
  // 50 stations, 25 per carriageway, clustered near towns (Murthal, Panipat,
  // Karnal, Ambala, Zirakpur) and thin between Karnal and Ambala. Each side
  // keeps one white space over 30 km and one or two 20 to 30 km stretches,
  // so every colour in the rule still appears. Built by buildStations below.
  stations: [],
  tolls: [
    { tollId: "toll-murthal", km: 40 },
    { tollId: "toll-panipat-elevated", km: 86 },
    { tollId: "toll-gharaunda", km: 108 }, // Karnal (Bastara)
    { tollId: "toll-dappar", km: 226 },
  ],
};

// [km, locality, operator, guns, kW, attraction, uptime %]
type StationSeed = [number, string, string, number, number, number, number];

const NB_SEEDS: StationSeed[] = [
  [6, "Alipur", "Statiq", 2, 60, 0.7, 96],
  [11, "Kundli Border", "Tata Power EZ", 6, 60, 0.9, 95],
  [17, "Rai Industrial", "ChargeZone", 4, 120, 0.8, 94],
  [24, "Bahalgarh", "Statiq", 2, 60, 0.8, 93],
  [31, "Sonipat Bypass", "Jio-bp pulse", 8, 120, 1.0, 97],
  [38, "Murthal Toll Approach", "IOCL", 4, 60, 0.9, 92],
  [44, "Murthal Dhaba Cluster", "Jio-bp pulse", 12, 120, 1.6, 97],
  [49, "Bhigan", "Tata Power EZ", 2, 60, 0.7, 94],
  [58, "Gannaur", "Statiq", 4, 120, 0.8, 95],
  [67, "Samalkha", "ChargeZone", 6, 120, 0.9, 94],
  [80, "Panipat South", "IOCL", 2, 60, 0.7, 91],
  [90, "Panipat Bypass Hub", "Tata Power EZ", 8, 120, 1.1, 96],
  [97, "Panipat North", "Statiq", 2, 60, 0.7, 93],
  [106, "Gharaunda Fuel Court", "IOCL", 2, 60, 0.6, 88],
  [115, "Madhuban", "ChargeZone", 4, 120, 0.8, 95],
  [123, "Karnal Lake Oasis", "ChargeZone", 8, 120, 1.3, 96],
  [130, "Karnal North", "Statiq", 2, 60, 0.7, 94],
  [141, "Nilokheri", "Jio-bp pulse", 4, 120, 0.9, 95],
  [162, "Pipli / Kurukshetra", "Tata Power EZ", 6, 120, 1.2, 96],
  [168, "Kurukshetra Bypass", "IOCL", 2, 60, 0.7, 90],
  [200, "Ambala Cantt Junction", "Statiq", 6, 60, 1.3, 94],
  [211, "Ambala City", "ChargeZone", 6, 120, 1.0, 95],
  [222, "Dappar Toll Approach", "IOCL", 2, 60, 0.8, 92],
  [236, "Zirakpur Gateway", "Jio-bp pulse", 10, 120, 1.0, 97],
  [243, "Chandigarh Entry", "Tata Power EZ", 6, 120, 0.9, 96],
];

const SB_SEEDS: StationSeed[] = [
  [241, "Chandigarh Exit", "Statiq", 6, 120, 0.9, 96],
  [235, "Zirakpur Flyover", "Jio-bp pulse", 8, 120, 1.0, 97],
  [228, "Dera Bassi", "ChargeZone", 2, 60, 0.8, 94],
  [220, "Lalru", "IOCL", 2, 60, 0.7, 92],
  [209, "Ambala City South", "Tata Power EZ", 6, 120, 1.0, 95],
  [201, "Ambala Cantt Plaza", "Statiq", 6, 60, 1.3, 94],
  [190, "Shahabad Markanda", "ChargeZone", 4, 120, 0.9, 94],
  [165, "Kurukshetra Gate", "Tata Power EZ", 6, 120, 1.2, 96],
  [158, "Kurukshetra South", "IOCL", 2, 60, 0.7, 90],
  [127, "Karnal Highway Plaza", "ChargeZone", 8, 120, 1.3, 96],
  [118, "Karnal South", "Statiq", 2, 60, 0.7, 94],
  [109, "Bastara Toll Approach", "IOCL", 2, 60, 0.8, 92],
  [100, "Gharaunda South", "Jio-bp pulse", 4, 120, 0.8, 95],
  [92, "Panipat Elevated Exit", "Tata Power EZ", 8, 120, 1.1, 96],
  [84, "Panipat Refinery Road", "IOCL", 2, 60, 0.7, 91],
  [71, "Samalkha South", "ChargeZone", 4, 120, 0.8, 94],
  [61, "Gannaur South", "Statiq", 2, 60, 0.8, 93],
  [50, "Bhigan Fuel Stop", "IOCL", 2, 60, 0.7, 92],
  [45, "Murthal Dhaba Row", "Jio-bp pulse", 12, 120, 1.6, 97],
  [36, "Sonipat Exit", "Tata Power EZ", 6, 120, 1.0, 96],
  [28, "Bahalgarh South", "Statiq", 2, 60, 0.8, 93],
  [20, "Rai Toll Approach", "ChargeZone", 4, 120, 0.8, 94],
  [13, "Kundli Border South", "Tata Power EZ", 6, 60, 0.9, 95],
  [7, "Alipur South", "Statiq", 2, 60, 0.7, 96],
  [3, "Mukarba Chowk", "IOCL", 2, 60, 0.6, 90],
];

function buildStations(side: Side, seeds: StationSeed[]): ChainageStation[] {
  return seeds.map(([km, name, operator, guns, powerKw, attraction, uptimePct]) => ({
    id: `st-${side.toLowerCase()}-${km}`,
    name,
    km,
    side,
    operator,
    guns,
    powerKw,
    attraction,
    uptimePct,
  }));
}
NH44_DELHI_CHANDIGARH.stations = [...buildStations("NB", NB_SEEDS), ...buildStations("SB", SB_SEEDS)];

export function stationsOnSide(c: ChainageCorridor, side: Side): ChainageStation[] {
  return c.stations.filter((s) => s.side === side).sort((a, b) => a.km - b.km);
}

export const CHAINAGE_CORRIDORS: ChainageCorridor[] = [NH44_DELHI_CHANDIGARH];

export function getChainageCorridor(corridorId?: string | null): ChainageCorridor | null {
  return CHAINAGE_CORRIDORS.find((c) => c.id === corridorId) ?? null;
}

// ---------- Behavioural assumptions ----------
// Share of passing EVs that pull in to charge at an average station.
export const STOP_RATE = { fourWheeler: 0.017, fleetCommercial: 0.034, evBusesTrucks: 0.045 };

// Typical session length by charger power (minutes, plug in to plug out).
export function sessionMinutes(powerKw: number): number {
  if (powerKw >= 200) return 22;
  if (powerKw >= 100) return 32;
  if (powerKw >= 50) return 48;
  return 120;
}

export function latLngAtKm(c: ChainageCorridor, km: number): [number, number] {
  const n = c.nodes;
  const k = Math.max(0, Math.min(c.lengthKm, km));
  for (let i = 0; i < n.length - 1; i++) {
    if (k <= n[i + 1].km) {
      const t = (k - n[i].km) / (n[i + 1].km - n[i].km || 1);
      return [n[i].lat + (n[i + 1].lat - n[i].lat) * t, n[i].lng + (n[i + 1].lng - n[i].lng) * t];
    }
  }
  const last = n[n.length - 1];
  return [last.lat, last.lng];
}

// Directional split of the toll flow. Morning traffic leans towards Delhi
// (SB), evening traffic towards Chandigarh (NB); the swing is about 7 points.
export function nbShare(slot: number): number {
  const h = slot / SLOTS_PER_HOUR;
  return 0.5 + 0.07 * Math.sin(((h - 10) * Math.PI) / 12);
}

// Small deterministic wobble so the four slots of one hour differ a little.
function slotWobble(slot: number, salt: number): number {
  const x = Math.sin(slot * 12.9898 + salt * 78.233) * 43758.5453;
  return 1 + ((x - Math.floor(x)) - 0.5) * 0.12;
}

// Hourly toll curve resampled to 15 minute slots by linear interpolation
// between hour centres, so the four slots of an hour still sum to the hour.
function slotFlow(hourly: HourlyTollFlow[], slot: number): HourlyTollFlow {
  const t = (slot + 0.5) / SLOTS_PER_HOUR - 0.5; // position in hours
  const h0 = ((Math.floor(t) % 24) + 24) % 24;
  const h1 = (h0 + 1) % 24;
  const w = t - Math.floor(t);
  const a = hourly[h0];
  const b = hourly[h1];
  const mix = (x: number, y: number) => (x + (y - x) * w) / SLOTS_PER_HOUR;
  return {
    ...a,
    totalEvs: mix(a.totalEvs, b.totalEvs),
    fourWheeler: mix(a.fourWheeler, b.fourWheeler),
    fleetCommercial: mix(a.fleetCommercial, b.fleetCommercial),
    evBusesTrucks: mix(a.evBusesTrucks, b.evBusesTrucks),
    totalVehiclesAllFuel: mix(a.totalVehiclesAllFuel, b.totalVehiclesAllFuel),
  };
}

// EV flow on one carriageway at a chainage for a slot: distance weighted
// blend of the two toll plazas that bracket the point, split by direction.
export function flowAtKm(c: ChainageCorridor, km: number, slot: number, side: Side): HourlyTollFlow {
  const tolls = c.tolls
    .map((t) => ({ km: t.km, plaza: TOLL_PLAZAS.find((p) => p.id === t.tollId)! }))
    .filter((t) => t.plaza)
    .sort((a, b) => a.km - b.km);
  const before = [...tolls].reverse().find((t) => t.km <= km);
  const after = tolls.find((t) => t.km > km);
  const a = slotFlow((before ?? after)!.plaza.hourlyFlow, slot);
  const b = slotFlow((after ?? before)!.plaza.hourlyFlow, slot);
  const w = before && after ? (km - before.km) / (after.km - before.km) : 0;
  const share = side === "NB" ? nbShare(slot) : 1 - nbShare(slot);
  const wob = slotWobble(slot, Math.round(km));
  const mix = (x: number, y: number) => Math.round((x + (y - x) * w) * share * wob);
  return {
    ...a,
    totalEvs: mix(a.totalEvs, b.totalEvs),
    fourWheeler: mix(a.fourWheeler, b.fourWheeler),
    fleetCommercial: mix(a.fleetCommercial, b.fleetCommercial),
    evBusesTrucks: mix(a.evBusesTrucks, b.evBusesTrucks),
    totalVehiclesAllFuel: mix(a.totalVehiclesAllFuel, b.totalVehiclesAllFuel),
  };
}

// Flow past a toll plaza on one side for a slot (for map and strip labels).
export function tollFlowAtSlot(tollId: string, slot: number, side: Side): number {
  const plaza = TOLL_PLAZAS.find((p) => p.id === tollId);
  if (!plaza) return 0;
  const share = side === "NB" ? nbShare(slot) : 1 - nbShare(slot);
  return Math.round(slotFlow(plaza.hourlyFlow, slot).totalEvs * share);
}

// ---------- Station level simulation ----------
export interface StationSlot {
  slot: number;
  evsPassing: number; // EVs passing on this carriageway in the slot
  arrivals: number; // EVs that stop to charge this slot
  queueCarriedIn: number;
  capacityPerSlot: number;
  served: number;
  waiting: number;
  turnedAway: number;
  utilizationPct: number;
  gunsBusy: number;
  gunsFree: number;
  available: boolean;
  ubcStatus: UbcStatus; // what the live feed would report for this slot
}

export interface StationDay {
  station: ChainageStation;
  upstreamGapKm: number; // gap from the previous charger on the same side, in the direction of travel
  installedMw: number;
  slots: StationSlot[];
  dailyArrivals: number;
  dailyServed: number;
  dailyTurnedAway: number;
  foundChargerPct: number;
  avgUtilizationPct: number;
  peakUtilizationPct: number;
  peakSlot: number;
  peakArrivals: number; // arrivals in the busiest hour
  requiredGuns: number;
  requiredMw: number;
  gunShortfall: number;
}

// Deterministic outage window per station: low uptime sites drop offline
// for a couple of slots in the day, which the UBC feed would surface.
function offlineWindow(s: ChainageStation): [number, number] | null {
  if (s.uptimePct >= 95) return null;
  const start = (s.km * 7 + s.guns * 13) % SLOTS_PER_DAY;
  const len = s.uptimePct < 91 ? 6 : 3;
  return [start, start + len];
}

function simulateStation(c: ChainageCorridor, s: ChainageStation): StationDay {
  const sorted = stationsOnSide(c, s.side);
  const idx = sorted.findIndex((x) => x.id === s.id);
  const gapUp = idx === 0 ? s.km : s.km - sorted[idx - 1].km;
  const gapDown = idx === sorted.length - 1 ? c.lengthKm - s.km : sorted[idx + 1].km - s.km;
  // Distance since the previous charger in the direction of travel.
  const gapBehind = s.side === "NB" ? gapUp : gapDown;
  // A long gap behind pushes more drivers to stop here. 40 km is neutral.
  const gapFactor = Math.max(0.7, Math.min(2.0, (gapBehind * 0.7 + (gapUp + gapDown) / 2 * 0.3) / 40 + 0.35));

  const capacity = ((s.guns * 60 * (s.uptimePct / 100)) / sessionMinutes(s.powerKw)) / SLOTS_PER_HOUR;
  const outage = offlineWindow(s);
  const slots: StationSlot[] = [];

  let carry = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let t = 0; t < SLOTS_PER_DAY; t++) {
      const f = flowAtKm(c, s.km, t, s.side);
      const offline = !!outage && t >= outage[0] && t < outage[1];
      const arrivals =
        (f.fourWheeler * STOP_RATE.fourWheeler +
          f.fleetCommercial * STOP_RATE.fleetCommercial +
          f.evBusesTrucks * STOP_RATE.evBusesTrucks) *
        s.attraction *
        gapFactor;
      const cap = offline ? 0 : capacity;
      const demand = arrivals + carry;
      const served = Math.min(demand, cap);
      const unserved = demand - served;
      // Drivers tolerate a queue worth about 30 minutes of throughput.
      const waiting = Math.min(unserved, capacity * 2);
      const turnedAway = unserved - waiting;
      const util = offline ? 1 : Math.min(1, demand / capacity);
      if (pass === 1) {
        const busy = offline ? s.guns : Math.min(s.guns, Math.round(util * s.guns));
        const available = !offline && util < FULL_UTILIZATION;
        slots.push({
          slot: t,
          evsPassing: f.totalEvs,
          arrivals: Math.round(arrivals * 10) / 10,
          queueCarriedIn: Math.round(carry * 10) / 10,
          capacityPerSlot: Math.round(cap * 10) / 10,
          served: Math.round(served * 10) / 10,
          waiting: Math.round(waiting * 10) / 10,
          turnedAway: Math.round(turnedAway * 10) / 10,
          utilizationPct: Math.round(util * 100),
          gunsBusy: busy,
          gunsFree: s.guns - busy,
          available,
          ubcStatus: offline ? "offline" : available ? "available" : "busy",
        });
      }
      carry = waiting;
    }
  }

  const sum = (k: keyof StationSlot) => slots.reduce((t, x) => t + (x[k] as number), 0);
  const dailyArrivals = Math.round(sum("arrivals"));
  const dailyTurnedAway = Math.round(sum("turnedAway"));
  // Busiest hour = best window of four consecutive slots.
  let peakArrivals = 0;
  let peakSlot = 0;
  for (let t = 0; t < SLOTS_PER_DAY; t++) {
    let a = 0;
    for (let k = 0; k < SLOTS_PER_HOUR; k++) a += slots[(t + k) % SLOTS_PER_DAY].arrivals;
    if (a > peakArrivals) {
      peakArrivals = Math.round(a);
      peakSlot = t;
    }
  }
  const perGunPerHour = (60 / sessionMinutes(s.powerKw)) * (s.uptimePct / 100);
  const requiredGuns = Math.max(1, Math.ceil(peakArrivals / (perGunPerHour * TARGET_UTILIZATION)));

  return {
    station: s,
    upstreamGapKm: gapBehind,
    installedMw: Math.round(((s.guns * s.powerKw) / 1000) * 100) / 100,
    slots,
    dailyArrivals,
    dailyServed: dailyArrivals - dailyTurnedAway,
    dailyTurnedAway,
    foundChargerPct: dailyArrivals ? Math.round(((dailyArrivals - dailyTurnedAway) / dailyArrivals) * 100) : 100,
    avgUtilizationPct: Math.round(sum("utilizationPct") / SLOTS_PER_DAY),
    peakUtilizationPct: Math.max(...slots.map((x) => x.utilizationPct)),
    peakSlot,
    peakArrivals,
    requiredGuns,
    requiredMw: Math.round(((requiredGuns * s.powerKw) / 1000) * 100) / 100,
    gunShortfall: Math.max(0, requiredGuns - s.guns),
  };
}

const dayCache = new Map<string, StationDay[]>();
export function simulateCorridor(c: ChainageCorridor, side?: Side): StationDay[] {
  if (!dayCache.has(c.id)) {
    dayCache.set(
      c.id,
      [...c.stations].sort((a, b) => a.km - b.km).map((s) => simulateStation(c, s))
    );
  }
  const all = dayCache.get(c.id)!;
  return side ? all.filter((d) => d.station.side === side) : all;
}

// ---------- White space segments (per carriageway) ----------
export interface CorridorSegment {
  side: Side;
  startKm: number;
  endKm: number;
  midKm: number;
  status: SegmentStatus;
  reason: string;
  gapKm: number;
  nearestStation: string;
  evsPassing: number; // flow on this carriageway in the slot
  from: [number, number];
  to: [number, number];
}

export function segmentsForSlot(c: ChainageCorridor, slot: number, side: Side): CorridorSegment[] {
  const days = simulateCorridor(c, side);
  const out: CorridorSegment[] = [];
  for (let start = 0; start < c.lengthKm; start += SEGMENT_KM) {
    const end = Math.min(c.lengthKm, start + SEGMENT_KM);
    const mid = (start + end) / 2;
    const prev = [...days].reverse().find((d) => d.station.km <= mid);
    const next = days.find((d) => d.station.km > mid);
    const gapKm = (next ? next.station.km : c.lengthKm) - (prev ? prev.station.km : 0);
    const ends = [prev, next].filter(Boolean) as StationDay[];
    const anyFree = ends.some((d) => d.slots[slot].available);
    const nearest = ends.reduce((a, b) => (Math.abs(b.station.km - mid) < Math.abs(a.station.km - mid) ? b : a));
    const label =
      prev && next ? `between ${prev.station.name} and ${next.station.name}` : `near ${nearest.station.name}`;

    let status: SegmentStatus;
    let reason: string;
    if (gapKm > RED_MIN_KM) {
      status = "red";
      reason = `White space: ${gapKm} km with zero chargers on this side ${label}`;
    } else if (gapKm >= GREEN_MAX_KM) {
      status = "amber";
      reason = `Stretched spacing: ${gapKm} km ${label}`;
    } else if (!anyFree) {
      status = "amber";
      reason = `Charger within ${gapKm} km but every gun busy or offline in this slot`;
    } else {
      status = "green";
      reason = `Chargers ${gapKm} km apart with a free gun in this slot`;
    }

    out.push({
      side,
      startKm: start,
      endKm: end,
      midKm: mid,
      status,
      reason,
      gapKm,
      nearestStation: nearest.station.name,
      evsPassing: flowAtKm(c, mid, slot, side).totalEvs,
      from: latLngAtKm(c, start),
      to: latLngAtKm(c, end),
    });
  }
  return out;
}

export interface StatusRun {
  status: SegmentStatus;
  startKm: number;
  endKm: number;
  lengthKm: number;
}

export function statusRuns(segments: CorridorSegment[]): StatusRun[] {
  const runs: StatusRun[] = [];
  for (const s of segments) {
    const last = runs[runs.length - 1];
    if (last && last.status === s.status) {
      last.endKm = s.endKm;
      last.lengthKm = last.endKm - last.startKm;
    } else {
      runs.push({ status: s.status, startKm: s.startKm, endKm: s.endKm, lengthKm: s.endKm - s.startKm });
    }
  }
  return runs;
}

// White spaces counted from charger spacing on one side.
export function whiteSpacesOnSide(c: ChainageCorridor, side: Side): StatusRun[] {
  const kms = stationsOnSide(c, side).map((s) => s.km);
  return [0, ...kms, c.lengthKm]
    .map((km, i, arr) => ({ startKm: km, endKm: arr[i + 1] ?? km }))
    .filter((g) => g.endKm - g.startKm > RED_MIN_KM)
    .map((g) => ({ status: "red" as SegmentStatus, ...g, lengthKm: g.endKm - g.startKm }));
}

// ---------- Corridor snapshot for one slot ----------
export interface SideSnapshot {
  side: Side;
  evsPerSlot: number; // average flow across the corridor's tolls, this side
  stopping: number;
  served: number;
  waiting: number;
  turnedAway: number;
  foundChargerPct: number;
  stationsTotal: number;
  stationsAvailable: number;
  stationsOffline: number;
  gunsTotal: number;
  gunsFree: number;
  kmGreen: number;
  kmAmber: number;
  kmRed: number;
  whiteSpaces: StatusRun[];
  amberStretches: StatusRun[];
}

export interface CorridorSlotSnapshot {
  slot: number;
  label: string;
  evsPerSlot: number;
  evsPerHourEquivalent: number;
  stopping: number;
  served: number;
  waiting: number;
  turnedAway: number;
  foundChargerPct: number;
  stationsTotal: number;
  stationsAvailable: number;
  stationsOffline: number;
  gunsTotal: number;
  gunsFree: number;
  whiteSpaceCount: number;
  whiteSpaceKm: number;
  sides: Record<Side, SideSnapshot>;
  isPeak: boolean;
}

function sideSnapshot(c: ChainageCorridor, slot: number, side: Side): SideSnapshot {
  const days = simulateCorridor(c, side);
  const segs = segmentsForSlot(c, slot, side);
  const runs = statusRuns(segs);
  const hs = days.map((d) => d.slots[slot]);
  const tot = (k: keyof StationSlot) => Math.round(hs.reduce((t, x) => t + (x[k] as number), 0));
  const evs = Math.round(c.tolls.reduce((t, x) => t + tollFlowAtSlot(x.tollId, slot, side), 0) / Math.max(1, c.tolls.length));
  const stopping = tot("arrivals");
  const turnedAway = tot("turnedAway");
  const km = (st: SegmentStatus) => segs.filter((s) => s.status === st).reduce((t, s) => t + (s.endKm - s.startKm), 0);
  return {
    side,
    evsPerSlot: evs,
    stopping,
    served: tot("served"),
    waiting: tot("waiting"),
    turnedAway,
    foundChargerPct: stopping ? Math.round(((stopping - turnedAway) / stopping) * 100) : 100,
    stationsTotal: days.length,
    stationsAvailable: hs.filter((h) => h.available).length,
    stationsOffline: hs.filter((h) => h.ubcStatus === "offline").length,
    gunsTotal: days.reduce((t, d) => t + d.station.guns, 0),
    gunsFree: tot("gunsFree"),
    kmGreen: km("green"),
    kmAmber: km("amber"),
    kmRed: km("red"),
    whiteSpaces: whiteSpacesOnSide(c, side),
    amberStretches: runs.filter((r) => r.status === "amber"),
  };
}

const peakCache = new Map<string, number>();
export function corridorSnapshot(c: ChainageCorridor, slot: number): CorridorSlotSnapshot {
  const nb = sideSnapshot(c, slot, "NB");
  const sb = sideSnapshot(c, slot, "SB");
  if (!peakCache.has(c.id)) {
    let mx = 0;
    for (let t = 0; t < SLOTS_PER_DAY; t++) {
      const v = c.tolls.reduce((s, x) => s + tollFlowAtSlot(x.tollId, t, "NB") + tollFlowAtSlot(x.tollId, t, "SB"), 0);
      mx = Math.max(mx, v);
    }
    peakCache.set(c.id, mx / Math.max(1, c.tolls.length));
  }
  const evs = nb.evsPerSlot + sb.evsPerSlot;
  const add = (k: keyof SideSnapshot) => (nb[k] as number) + (sb[k] as number);
  const stopping = add("stopping");
  const turnedAway = add("turnedAway");
  return {
    slot,
    label: slotLabel(slot),
    evsPerSlot: evs,
    evsPerHourEquivalent: evs * SLOTS_PER_HOUR,
    stopping,
    served: add("served"),
    waiting: add("waiting"),
    turnedAway,
    foundChargerPct: stopping ? Math.round(((stopping - turnedAway) / stopping) * 100) : 100,
    stationsTotal: add("stationsTotal"),
    stationsAvailable: add("stationsAvailable"),
    stationsOffline: add("stationsOffline"),
    gunsTotal: add("gunsTotal"),
    gunsFree: add("gunsFree"),
    whiteSpaceCount: nb.whiteSpaces.length + sb.whiteSpaces.length,
    whiteSpaceKm: [...nb.whiteSpaces, ...sb.whiteSpaces].reduce((t, r) => t + r.lengthKm, 0),
    sides: { NB: nb, SB: sb },
    isPeak: evs >= peakCache.get(c.id)! * 0.85,
  };
}

// ---------- Toll plaza capacity: current vs requirement ----------
export interface TollCapacityRow {
  tollId: string;
  tollName: string;
  km: number;
  dailyEvs: number;
  peakHourLabel: string;
  peakHourEvs: number;
  peakStopping: number; // EVs stopping per peak hour inside the catchment
  stationsInCatchment: string[];
  currentGuns: number;
  currentMw: number;
  requiredGuns: number;
  requiredMw: number;
  gapMw: number;
  coveragePct: number;
  peakUtilizationPct: number;
  offPeakUtilizationPct: number;
}

export function tollCapacityRows(c: ChainageCorridor): TollCapacityRow[] {
  const days = simulateCorridor(c);
  return c.tolls.map((t) => {
    const plaza = TOLL_PLAZAS.find((p) => p.id === t.tollId)!;
    const near = days.filter((d) => Math.abs(d.station.km - t.km) <= TOLL_CATCHMENT_KM);
    const s = (f: (d: StationDay) => number) => near.reduce((a, d) => a + f(d), 0);
    const currentMw = s((d) => d.installedMw);
    const requiredMw = s((d) => Math.max(d.requiredMw, d.installedMw));
    const wAvg = (hour: number) => {
      const guns = s((d) => d.station.guns);
      const slot = hour * SLOTS_PER_HOUR + 2;
      return guns ? Math.round(s((d) => d.slots[slot].utilizationPct * d.station.guns) / guns) : 0;
    };
    return {
      tollId: t.tollId,
      tollName: plaza.name,
      km: t.km,
      dailyEvs: plaza.totalDailyEvs,
      peakHourLabel: plaza.peakHourTimeLabel,
      peakHourEvs: plaza.peakHourEvVolume,
      peakStopping: s((d) => {
        let a = 0;
        for (let k = 0; k < SLOTS_PER_HOUR; k++) a += d.slots[plaza.peakHour * SLOTS_PER_HOUR + k].arrivals;
        return Math.round(a);
      }),
      stationsInCatchment: near.map((d) => d.station.name),
      currentGuns: s((d) => d.station.guns),
      currentMw: Math.round(currentMw * 100) / 100,
      requiredGuns: s((d) => Math.max(d.requiredGuns, d.station.guns)),
      requiredMw: Math.round(requiredMw * 100) / 100,
      gapMw: Math.round((requiredMw - currentMw) * 100) / 100,
      coveragePct: requiredMw ? Math.round((currentMw / requiredMw) * 100) : 100,
      peakUtilizationPct: wAvg(plaza.peakHour),
      offPeakUtilizationPct: wAvg(plaza.offPeakHour),
    };
  });
}

export function tollCapacityFor(tollId: string): TollCapacityRow | null {
  for (const c of CHAINAGE_CORRIDORS) {
    const row = tollCapacityRows(c).find((r) => r.tollId === tollId);
    if (row) return row;
  }
  return null;
}
