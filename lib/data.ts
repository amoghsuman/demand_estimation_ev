import { AreaCategory, DataPoint, SegmentMix, StateAggregate } from "./types";

// Seeded RNG so the demo dataset looks the same on every load.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const between = (min: number, max: number) => min + rand() * (max - min);
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

interface Hub {
  city: string;
  state: string;
  lat: number;
  lng: number;
  tier: 1 | 2 | 3;
  subLocations: { name: string; category: AreaCategory }[];
}

const HUBS: Hub[] = [
  {
    city: "Delhi NCR",
    state: "Delhi",
    lat: 28.6139,
    lng: 77.209,
    tier: 1,
    subLocations: [
      { name: "Connaught Place", category: "commercial" },
      { name: "Dwarka Sector 21", category: "residential" },
      { name: "Gurugram Cyber Hub", category: "commercial" },
      { name: "Noida Sector 62", category: "industrial" },
      { name: "Rohini", category: "residential" },
    ],
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    lat: 19.076,
    lng: 72.8777,
    tier: 1,
    subLocations: [
      { name: "Bandra Kurla Complex", category: "commercial" },
      { name: "Andheri East", category: "commercial" },
      { name: "Navi Mumbai", category: "residential" },
      { name: "Thane", category: "residential" },
    ],
  },
  {
    city: "Bengaluru",
    state: "Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    tier: 1,
    subLocations: [
      { name: "Whitefield", category: "commercial" },
      { name: "Electronic City", category: "industrial" },
      { name: "Koramangala", category: "residential" },
      { name: "Hebbal", category: "residential" },
    ],
  },
  {
    city: "Pune",
    state: "Maharashtra",
    lat: 18.5204,
    lng: 73.8567,
    tier: 2,
    subLocations: [
      { name: "Hinjawadi", category: "industrial" },
      { name: "Kothrud", category: "residential" },
      { name: "Viman Nagar", category: "commercial" },
    ],
  },
  {
    city: "Hyderabad",
    state: "Telangana",
    lat: 17.385,
    lng: 78.4867,
    tier: 1,
    subLocations: [
      { name: "HITEC City", category: "commercial" },
      { name: "Gachibowli", category: "residential" },
      { name: "Secunderabad", category: "residential" },
    ],
  },
  {
    city: "Chennai",
    state: "Tamil Nadu",
    lat: 13.0827,
    lng: 80.2707,
    tier: 1,
    subLocations: [
      { name: "OMR IT Corridor", category: "commercial" },
      { name: "T. Nagar", category: "residential" },
      { name: "Ambattur", category: "industrial" },
    ],
  },
  {
    city: "Kolkata",
    state: "West Bengal",
    lat: 22.5726,
    lng: 88.3639,
    tier: 2,
    subLocations: [
      { name: "Salt Lake Sector V", category: "commercial" },
      { name: "New Town", category: "residential" },
    ],
  },
  {
    city: "Ahmedabad",
    state: "Gujarat",
    lat: 23.0225,
    lng: 72.5714,
    tier: 2,
    subLocations: [
      { name: "SG Highway", category: "commercial" },
      { name: "Bopal", category: "residential" },
    ],
  },
  {
    city: "Jaipur",
    state: "Rajasthan",
    lat: 26.9124,
    lng: 75.7873,
    tier: 2,
    subLocations: [
      { name: "Malviya Nagar", category: "residential" },
      { name: "Sitapura Industrial Area", category: "industrial" },
    ],
  },
  {
    city: "Surat",
    state: "Gujarat",
    lat: 21.1702,
    lng: 72.8311,
    tier: 3,
    subLocations: [{ name: "Vesu", category: "residential" }],
  },
];

interface Corridor {
  name: string;
  state: string;
  waypoints: { name: string; lat: number; lng: number }[];
}

const CORRIDORS: Corridor[] = [
  {
    name: "Delhi – Jaipur (NH48)",
    state: "Rajasthan",
    waypoints: [
      { name: "Gurugram Toll Plaza", lat: 28.4211, lng: 76.9877 },
      { name: "Kotputli Junction", lat: 27.7, lng: 76.2 },
      { name: "Shahpura Bypass", lat: 27.4, lng: 75.97 },
      { name: "Jaipur Outskirts", lat: 26.98, lng: 75.85 },
    ],
  },
  {
    name: "Mumbai – Pune Expressway",
    state: "Maharashtra",
    waypoints: [
      { name: "Panvel Junction", lat: 18.99, lng: 73.12 },
      { name: "Lonavala Ghat Section", lat: 18.75, lng: 73.4 },
      { name: "Talegaon", lat: 18.73, lng: 73.67 },
      { name: "Pune Entry Point", lat: 18.58, lng: 73.79 },
    ],
  },
  {
    name: "Bengaluru – Chennai (NH48/NH716)",
    state: "Tamil Nadu",
    waypoints: [
      { name: "Hosur Junction", lat: 12.74, lng: 77.83 },
      { name: "Krishnagiri Bypass", lat: 12.52, lng: 78.21 },
      { name: "Vellore Corridor", lat: 12.92, lng: 79.13 },
      { name: "Chennai Approach", lat: 13.0, lng: 79.9 },
    ],
  },
];

function segmentMixFor(category: AreaCategory): SegmentMix {
  switch (category) {
    case "residential":
      return { twoWheeler: 55, threeWheeler: 15, fourWheeler: 25, fleet: 5 };
    case "commercial":
      return { twoWheeler: 30, threeWheeler: 10, fourWheeler: 45, fleet: 15 };
    case "industrial":
      return { twoWheeler: 20, threeWheeler: 25, fourWheeler: 20, fleet: 35 };
    case "highway":
      return { twoWheeler: 5, threeWheeler: 5, fourWheeler: 45, fleet: 45 };
  }
}

function buildUrbanPoints(): DataPoint[] {
  const points: DataPoint[] = [];
  HUBS.forEach((hub) => {
    const tierMultiplier = hub.tier === 1 ? 1 : hub.tier === 2 ? 0.75 : 0.55;
    hub.subLocations.forEach((sub, i) => {
      const latOffset = between(-0.06, 0.06);
      const lngOffset = between(-0.06, 0.06);
      const baseDemand = between(45, 95) * tierMultiplier;
      const demandScore = round(Math.min(99, baseDemand));
      const supplyFactor = between(0.15, 0.75);
      const existingChargers = Math.max(0, Math.round((demandScore / 12) * supplyFactor));
      const gapScore = round(Math.max(5, Math.min(99, demandScore - existingChargers * 6 + between(-5, 5))));
      const footfallEstimate = Math.round(demandScore * between(35, 90));
      points.push({
        id: `${hub.city}-${i}`.replace(/\s+/g, "-").toLowerCase(),
        name: sub.name,
        city: hub.city,
        state: hub.state,
        lat: round(hub.lat + latOffset, 4),
        lng: round(hub.lng + lngOffset, 4),
        category: sub.category,
        demandScore,
        existingChargers,
        gapScore,
        footfallEstimate,
        segmentMix: segmentMixFor(sub.category),
        distanceToNearestChargerKm: round(between(0.5, 6), 1),
        isCorridor: false,
      });
    });
  });
  return points;
}

function buildCorridorPoints(): DataPoint[] {
  const points: DataPoint[] = [];
  CORRIDORS.forEach((corridor) => {
    corridor.waypoints.forEach((wp, i) => {
      const demandScore = round(between(50, 90));
      const existingChargers = Math.round(between(0, 3));
      const gapScore = round(Math.max(10, Math.min(99, demandScore - existingChargers * 10 + between(-5, 10))));
      points.push({
        id: `${corridor.name}-${i}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
        name: wp.name,
        city: corridor.name,
        state: corridor.state,
        lat: wp.lat,
        lng: wp.lng,
        category: "highway",
        demandScore,
        existingChargers,
        gapScore,
        footfallEstimate: Math.round(demandScore * between(60, 140)),
        segmentMix: segmentMixFor("highway"),
        distanceToNearestChargerKm: round(between(8, 45), 1),
        isCorridor: true,
        corridorName: corridor.name,
      });
    });
  });
  return points;
}

export const URBAN_POINTS = buildUrbanPoints();
export const CORRIDOR_POINTS = buildCorridorPoints();
export const ALL_POINTS: DataPoint[] = [...URBAN_POINTS, ...CORRIDOR_POINTS];

export function buildStateAggregates(): StateAggregate[] {
  const states = Array.from(new Set(URBAN_POINTS.map((p) => p.state)));
  return states.map((state) => {
    const pts = URBAN_POINTS.filter((p) => p.state === state);
    const currentChargers = pts.reduce((s, p) => s + p.existingChargers, 0);
    const avgGapScore = round(pts.reduce((s, p) => s + p.gapScore, 0) / pts.length);
    const targetChargers = Math.round(currentChargers * between(2.2, 3.4) + 20);
    return {
      state,
      districtsCovered: pts.length,
      urbanCoveragePct: round(between(35, 75)),
      ruralCoveragePct: round(between(5, 30)),
      currentChargers,
      targetChargers,
      evRegistrations: Math.round(currentChargers * between(180, 420)),
      avgGapScore,
    };
  });
}

export const STATE_AGGREGATES = buildStateAggregates();

// --- Role-specific view helpers ---

export function operatorRows() {
  return [...URBAN_POINTS].sort((a, b) => b.gapScore - a.gapScore);
}

export function governmentRows() {
  return [...STATE_AGGREGATES].sort((a, b) => b.avgGapScore - a.avgGapScore);
}

export function fleetRows() {
  return [...CORRIDOR_POINTS].sort((a, b) => b.gapScore - a.gapScore);
}

export function operatorKpis() {
  const rows = operatorRows();
  const highOpportunity = rows.filter((r) => r.gapScore >= 60).length;
  const avgDemand = round(rows.reduce((s, r) => s + r.demandScore, 0) / rows.length);
  const cities = new Set(rows.map((r) => r.city)).size;
  return [
    { label: "High opportunity sites", value: String(highOpportunity) },
    { label: "Average demand score", value: String(avgDemand) },
    { label: "Cities covered", value: String(cities) },
  ];
}

export function governmentKpis() {
  const rows = governmentRows();
  const statesAnalyzed = rows.length;
  const nationalGap = round(rows.reduce((s, r) => s + r.avgGapScore, 0) / rows.length);
  const totalRegistrations = rows.reduce((s, r) => s + r.evRegistrations, 0);
  return [
    { label: "States analyzed", value: String(statesAnalyzed) },
    { label: "National avg. gap score", value: String(nationalGap) },
    { label: "Est. EV registrations", value: totalRegistrations.toLocaleString("en-IN") },
  ];
}

export function fleetKpis() {
  const rows = fleetRows();
  const corridors = new Set(rows.map((r) => r.corridorName)).size;
  const avgDistance = round(rows.reduce((s, r) => s + r.distanceToNearestChargerKm, 0) / rows.length, 1);
  const highPriority = rows.filter((r) => r.gapScore >= 55).length;
  return [
    { label: "Corridors analyzed", value: String(corridors) },
    { label: "Avg. gap distance (km)", value: String(avgDistance) },
    { label: "High-priority stops", value: String(highPriority) },
  ];
}
