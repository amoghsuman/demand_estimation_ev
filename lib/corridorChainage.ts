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
  // Spacing is deliberate: 16 to 18 km gaps Delhi to Murthal and Panipat to
  // Karnal (green), 22 and 24 km gaps around Samalkha (amber), an 80 km hole
  // Karnal to Ambala and a 33 km hole Ambala to Zirakpur (red).
  stations: [
    { id: "st-alipur", name: "Alipur Highway Hub", km: 8, operator: "Statiq", guns: 6, powerKw: 60, attraction: 0.7, uptimePct: 96 },
    { id: "st-kundli", name: "Kundli Border Plaza", km: 26, operator: "Tata Power EZ", guns: 8, powerKw: 60, attraction: 0.9, uptimePct: 95 },
    { id: "st-murthal", name: "Murthal Dhaba Cluster", km: 44, operator: "Jio-bp pulse", guns: 12, powerKw: 120, attraction: 1.6, uptimePct: 97 },
    { id: "st-samalkha", name: "Samalkha Midway Plaza", km: 66, operator: "Statiq", guns: 4, powerKw: 60, attraction: 0.8, uptimePct: 93 },
    { id: "st-panipat", name: "Panipat Bypass Hub", km: 90, operator: "Tata Power EZ", guns: 8, powerKw: 120, attraction: 1.1, uptimePct: 96 },
    { id: "st-gharaunda", name: "Gharaunda Fuel Court", km: 106, operator: "IOCL", guns: 2, powerKw: 60, attraction: 0.6, uptimePct: 88 },
    { id: "st-karnal", name: "Karnal Lake Oasis", km: 123, operator: "ChargeZone", guns: 8, powerKw: 120, attraction: 1.3, uptimePct: 96 },
    { id: "st-ambala", name: "Ambala Cantt Junction", km: 203, operator: "Statiq", guns: 6, powerKw: 60, attraction: 1.2, uptimePct: 94 },
    { id: "st-zirakpur", name: "Zirakpur Gateway", km: 236, operator: "Jio-bp pulse", guns: 10, powerKw: 120, attraction: 1.0, uptimePct: 97 },
  ],
  tolls: [
    { tollId: "toll-murthal", km: 40 },
    { tollId: "toll-panipat-elevated", km: 86 },
    { tollId: "toll-gharaunda", km: 108 }, // Karnal (Bastara)
    { tollId: "toll-dappar", km: 226 },
  ],
};

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

// EV flow at a chainage for an hour: distance-weighted blend of the two
// toll plazas that bracket the point.
function flowAtKm(c: ChainageCorridor, km: number, hour: number): HourlyTollFlow {
  const tolls = c.tolls
    .map((t) => ({ km: t.km, plaza: TOLL_PLAZAS.find((p) => p.id === t.tollId)! }))
    .filter((t) => t.plaza)
    .sort((a, b) => a.km - b.km);
  const before = [...tolls].reverse().find((t) => t.km <= km);
  const after = tolls.find((t) => t.km > km);
  const a = (before ?? after)!.plaza.hourlyFlow[hour];
  const b = (after ?? before)!.plaza.hourlyFlow[hour];
  const w = before && after ? (km - before.km) / (after.km - before.km) : 0;
  const mix = (x: number, y: number) => Math.round(x + (y - x) * w);
  return {
    ...a,
    totalEvs: mix(a.totalEvs, b.totalEvs),
    fourWheeler: mix(a.fourWheeler, b.fourWheeler),
    fleetCommercial: mix(a.fleetCommercial, b.fleetCommercial),
    evBusesTrucks: mix(a.evBusesTrucks, b.evBusesTrucks),
    totalVehiclesAllFuel: mix(a.totalVehiclesAllFuel, b.totalVehiclesAllFuel),
  };
}

// ---------- Station level simulation ----------
export interface StationHour {
  hour: number;
  evsPassing: number;
  arrivals: number; // EVs that stop to charge this hour
  queueCarriedIn: number; // still waiting from the previous hour
  capacityPerHour: number; // sessions the site can start in an hour
  served: number; // found a charger
  waiting: number; // queued into the next hour
  turnedAway: number; // stopped, found every gun busy, drove on
  utilizationPct: number;
  gunsBusy: number;
  gunsFree: number;
  available: boolean; // at least one gun realistically free
}

export interface StationDay {
  station: ChainageStation;
  upstreamGapKm: number;
  installedMw: number;
  hours: StationHour[];
  dailyArrivals: number;
  dailyServed: number;
  dailyTurnedAway: number;
  foundChargerPct: number;
  avgUtilizationPct: number;
  peakUtilizationPct: number;
  peakHour: number;
  peakArrivals: number;
  requiredGuns: number;
  requiredMw: number;
  gunShortfall: number;
}

function simulateStation(c: ChainageCorridor, s: ChainageStation): StationDay {
  const sorted = [...c.stations].sort((a, b) => a.km - b.km);
  const idx = sorted.findIndex((x) => x.id === s.id);
  const gapUp = idx === 0 ? s.km : s.km - sorted[idx - 1].km;
  const gapDown = idx === sorted.length - 1 ? c.lengthKm - s.km : sorted[idx + 1].km - s.km;
  // Traffic runs both ways, so a long gap on either side pushes more
  // drivers to stop here. 40 km is the neutral spacing.
  const gapFactor = Math.max(0.7, Math.min(2.0, (gapUp + gapDown) / 2 / 40 + 0.35));

  const capacity = (s.guns * 60 * (s.uptimePct / 100)) / sessionMinutes(s.powerKw);
  const hours: StationHour[] = [];

  // Two passes so the queue at 23:00 rolls into 00:00 (steady state day).
  let carry = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let h = 0; h < 24; h++) {
      const f = flowAtKm(c, s.km, h);
      const arrivals =
        (f.fourWheeler * STOP_RATE.fourWheeler +
          f.fleetCommercial * STOP_RATE.fleetCommercial +
          f.evBusesTrucks * STOP_RATE.evBusesTrucks) *
        s.attraction *
        gapFactor;
      const demand = arrivals + carry;
      const served = Math.min(demand, capacity);
      const unserved = demand - served;
      // Drivers tolerate a queue worth about 30 minutes of throughput.
      const waiting = Math.min(unserved, capacity * 0.5);
      const turnedAway = unserved - waiting;
      const util = Math.min(1, demand / capacity);
      if (pass === 1) {
        const busy = Math.min(s.guns, Math.round(util * s.guns));
        hours.push({
          hour: h,
          evsPassing: f.totalEvs,
          arrivals: Math.round(arrivals),
          queueCarriedIn: Math.round(carry),
          capacityPerHour: Math.round(capacity * 10) / 10,
          served: Math.round(served),
          waiting: Math.round(waiting),
          turnedAway: Math.round(turnedAway),
          utilizationPct: Math.round(util * 100),
          gunsBusy: busy,
          gunsFree: s.guns - busy,
          available: util < FULL_UTILIZATION,
        });
      }
      carry = waiting;
    }
  }

  const sum = (k: keyof StationHour) => hours.reduce((t, x) => t + (x[k] as number), 0);
  const dailyArrivals = sum("arrivals");
  const dailyTurnedAway = sum("turnedAway");
  const peak = hours.reduce((a, b) => (b.arrivals > a.arrivals ? b : a));
  const perGunPerHour = (60 / sessionMinutes(s.powerKw)) * (s.uptimePct / 100);
  const requiredGuns = Math.ceil(peak.arrivals / (perGunPerHour * TARGET_UTILIZATION));

  return {
    station: s,
    upstreamGapKm: gapUp,
    installedMw: Math.round(((s.guns * s.powerKw) / 1000) * 100) / 100,
    hours,
    dailyArrivals,
    dailyServed: dailyArrivals - dailyTurnedAway,
    dailyTurnedAway,
    foundChargerPct: dailyArrivals ? Math.round(((dailyArrivals - dailyTurnedAway) / dailyArrivals) * 100) : 100,
    avgUtilizationPct: Math.round(sum("utilizationPct") / 24),
    peakUtilizationPct: Math.max(...hours.map((x) => x.utilizationPct)),
    peakHour: peak.hour,
    peakArrivals: peak.arrivals,
    requiredGuns,
    requiredMw: Math.round(((requiredGuns * s.powerKw) / 1000) * 100) / 100,
    gunShortfall: Math.max(0, requiredGuns - s.guns),
  };
}

const dayCache = new Map<string, StationDay[]>();
export function simulateCorridor(c: ChainageCorridor): StationDay[] {
  if (!dayCache.has(c.id)) {
    dayCache.set(
      c.id,
      [...c.stations].sort((a, b) => a.km - b.km).map((s) => simulateStation(c, s))
    );
  }
  return dayCache.get(c.id)!;
}

// ---------- White space segments ----------
export interface CorridorSegment {
  startKm: number;
  endKm: number;
  midKm: number;
  status: SegmentStatus;
  reason: string;
  nearestStation: string;
  nearestStationKm: number; // distance to nearest physical charger
  nearestAvailableKm: number | null; // distance to nearest charger with a free gun
  from: [number, number];
  to: [number, number];
}

export function segmentsForHour(c: ChainageCorridor, hour: number): CorridorSegment[] {
  const days = simulateCorridor(c);
  const out: CorridorSegment[] = [];
  for (let start = 0; start < c.lengthKm; start += SEGMENT_KM) {
    const end = Math.min(c.lengthKm, start + SEGMENT_KM);
    const mid = (start + end) / 2;
    let nearest = days[0];
    let dPhys = Infinity;
    let dAvail: number | null = null;
    for (const d of days) {
      const dist = Math.abs(d.station.km - mid);
      if (dist < dPhys) {
        dPhys = dist;
        nearest = d;
      }
      if (d.hours[hour].available && (dAvail === null || dist < dAvail)) dAvail = dist;
    }

    // Bounding chargers of the stretch this segment sits in. The rule follows
    // the spacing between consecutive chargers, which is what a driver on the
    // road experiences: over 30 km is a white space, 20 to 30 km is stretched,
    // under 20 km is healthy unless every gun at both ends is busy this hour.
    const prev = [...days].reverse().find((d) => d.station.km <= mid);
    const next = days.find((d) => d.station.km > mid);
    const gapKm = (next ? next.station.km : c.lengthKm) - (prev ? prev.station.km : 0);
    const ends = [prev, next].filter(Boolean) as StationDay[];
    const anyFree = ends.some((d) => d.hours[hour].available);
    const label =
      prev && next
        ? `between ${prev.station.name} and ${next.station.name}`
        : `near ${(prev ?? next)!.station.name}`;

    let status: SegmentStatus;
    let reason: string;
    if (gapKm > RED_MIN_KM) {
      status = "red";
      reason = `White space: ${gapKm} km with zero chargers ${label}`;
    } else if (gapKm >= GREEN_MAX_KM) {
      status = "amber";
      reason = `Stretched spacing: ${gapKm} km ${label}`;
    } else if (!anyFree) {
      status = "amber";
      reason = `Charger present within ${gapKm} km but every gun is busy this hour`;
    } else {
      status = "green";
      reason = `Chargers ${gapKm} km apart with a free gun this hour`;
    }

    out.push({
      startKm: start,
      endKm: end,
      midKm: mid,
      status,
      reason,
      nearestStation: nearest.station.name,
      nearestStationKm: Math.round(dPhys),
      nearestAvailableKm: dAvail === null ? null : Math.round(dAvail),
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

// Merges neighbouring segments of one colour into continuous stretches.
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

// ---------- Corridor snapshot for one hour ----------
export interface CorridorHourSnapshot {
  hour: number;
  evsOnCorridor: number; // average hourly EV flow across the corridor's tolls
  stopping: number;
  served: number;
  waiting: number;
  turnedAway: number;
  foundChargerPct: number;
  stationsTotal: number;
  stationsAvailable: number;
  gunsTotal: number;
  gunsFree: number;
  kmGreen: number;
  kmAmber: number;
  kmRed: number;
  whiteSpaces: StatusRun[];
  amberStretches: StatusRun[];
  isPeakHour: boolean;
}

export function corridorSnapshot(c: ChainageCorridor, hour: number): CorridorHourSnapshot {
  const days = simulateCorridor(c);
  const segs = segmentsForHour(c, hour);
  const runs = statusRuns(segs);
  const hs = days.map((d) => d.hours[hour]);
  const tot = (k: keyof StationHour) => hs.reduce((t, x) => t + (x[k] as number), 0);
  const plazas = c.tolls.map((t) => TOLL_PLAZAS.find((p) => p.id === t.tollId)!).filter(Boolean);
  const flowByHour = (h: number) =>
    Math.round(plazas.reduce((t, p) => t + p.hourlyFlow[h].totalEvs, 0) / Math.max(1, plazas.length));
  const flows = Array.from({ length: 24 }, (_, h) => flowByHour(h));
  const stopping = tot("arrivals");
  const turnedAway = tot("turnedAway");
  const km = (st: SegmentStatus) => segs.filter((s) => s.status === st).reduce((t, s) => t + (s.endKm - s.startKm), 0);

  return {
    hour,
    evsOnCorridor: flows[hour],
    stopping,
    served: tot("served"),
    waiting: tot("waiting"),
    turnedAway,
    foundChargerPct: stopping ? Math.round(((stopping - turnedAway) / stopping) * 100) : 100,
    stationsTotal: days.length,
    stationsAvailable: hs.filter((h) => h.available).length,
    gunsTotal: days.reduce((t, d) => t + d.station.guns, 0),
    gunsFree: tot("gunsFree"),
    kmGreen: km("green"),
    kmAmber: km("amber"),
    kmRed: km("red"),
    // Counted from the charger spacing itself, so two holes that touch at a
    // station (Karnal to Ambala, Ambala to Zirakpur) stay two white spaces.
    whiteSpaces: [0, ...days.map((d) => d.station.km), c.lengthKm]
      .map((km, i, arr) => ({ startKm: km, endKm: arr[i + 1] ?? km }))
      .filter((g) => g.endKm - g.startKm > RED_MIN_KM)
      .map((g) => ({ status: "red" as SegmentStatus, ...g, lengthKm: g.endKm - g.startKm })),
    amberStretches: runs.filter((r) => r.status === "amber"),
    isPeakHour: flows[hour] >= Math.max(...flows) * 0.85,
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
      return guns ? Math.round(s((d) => d.hours[hour].utilizationPct * d.station.guns) / guns) : 0;
    };
    return {
      tollId: t.tollId,
      tollName: plaza.name,
      km: t.km,
      dailyEvs: plaza.totalDailyEvs,
      peakHourLabel: plaza.peakHourTimeLabel,
      peakHourEvs: plaza.peakHourEvVolume,
      peakStopping: s((d) => d.hours[plaza.peakHour].arrivals),
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
