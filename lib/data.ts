import {
  AreaCategory,
  ChargerRecommendation,
  CityTier,
  DataPoint,
  EvDensity,
  SegmentCounts,
  SegmentMix,
  StateAggregate,
} from "./types";

// Seeded RNG so the dataset stays consistent across reloads.
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
  tier: CityTier;
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

export interface Corridor {
  id: string;
  name: string;
  highwayCode: string;
  state: string;
  color: string;
  lengthKm: number;
  evCorridorReadinessPct: number;
  priorityStatus: "critical" | "high" | "moderate";
  waypoints: { name: string; lat: number; lng: number }[];
}

export const CORRIDORS: Corridor[] = [
  {
    id: "delhi-jaipur-nh48",
    name: "Delhi – Jaipur (NH48)",
    highwayCode: "NH-48",
    state: "Rajasthan",
    color: "#EA580C",
    lengthKm: 280,
    evCorridorReadinessPct: 85,
    priorityStatus: "critical",
    waypoints: [
      { name: "Gurugram Toll Plaza", lat: 28.4211, lng: 76.9877 },
      { name: "Kotputli Junction", lat: 27.7, lng: 76.2 },
      { name: "Shahpura Bypass", lat: 27.4, lng: 75.97 },
      { name: "Jaipur Outskirts", lat: 26.98, lng: 75.85 },
    ],
  },
  {
    id: "mumbai-pune-expressway",
    name: "Mumbai – Pune Expressway",
    highwayCode: "MPEW / NE-1",
    state: "Maharashtra",
    color: "#2563EB",
    lengthKm: 94,
    evCorridorReadinessPct: 92,
    priorityStatus: "high",
    waypoints: [
      { name: "Panvel Junction", lat: 18.99, lng: 73.12 },
      { name: "Lonavala Ghat Section", lat: 18.75, lng: 73.4 },
      { name: "Talegaon", lat: 18.73, lng: 73.67 },
      { name: "Pune Entry Point", lat: 18.58, lng: 73.79 },
    ],
  },
  {
    id: "bengaluru-chennai-nh48",
    name: "Bengaluru – Chennai (NH48/NH716)",
    highwayCode: "NH-48",
    state: "Tamil Nadu",
    color: "#059669",
    lengthKm: 340,
    evCorridorReadinessPct: 78,
    priorityStatus: "critical",
    waypoints: [
      { name: "Hosur Junction", lat: 12.74, lng: 77.83 },
      { name: "Krishnagiri Bypass", lat: 12.52, lng: 78.21 },
      { name: "Vellore Corridor", lat: 12.92, lng: 79.13 },
      { name: "Chennai Approach", lat: 13.0, lng: 79.9 },
    ],
  },
  {
    id: "delhi-chandigarh-nh44",
    name: "Delhi – Chandigarh (NH44)",
    highwayCode: "NH-44",
    state: "Haryana",
    color: "#0284C7",
    lengthKm: 245,
    evCorridorReadinessPct: 88,
    priorityStatus: "high",
    waypoints: [
      { name: "Sonipat", lat: 28.99, lng: 77.01 },
      { name: "Panipat", lat: 29.39, lng: 76.97 },
      { name: "Karnal", lat: 29.68, lng: 76.99 },
      { name: "Ambala Cantt", lat: 30.38, lng: 76.78 },
      { name: "Zirakpur", lat: 30.64, lng: 76.82 },
      { name: "Chandigarh Approach", lat: 30.72, lng: 76.78 },
    ],
  },
  {
    id: "mumbai-ahmedabad-nh48",
    name: "Mumbai – Ahmedabad (NH48)",
    highwayCode: "NH-48",
    state: "Gujarat",
    color: "#7C3AED",
    lengthKm: 530,
    evCorridorReadinessPct: 74,
    priorityStatus: "critical",
    waypoints: [
      { name: "Bhiwandi Bypass", lat: 19.3, lng: 73.06 },
      { name: "Vapi", lat: 20.37, lng: 72.91 },
      { name: "Valsad", lat: 20.6, lng: 72.93 },
      { name: "Surat Bypass", lat: 21.17, lng: 72.83 },
      { name: "Vadodara", lat: 22.31, lng: 73.18 },
      { name: "Ahmedabad Approach", lat: 22.99, lng: 72.6 },
    ],
  },
  {
    id: "kolkata-bhubaneswar-nh16",
    name: "Kolkata – Bhubaneswar (NH16)",
    highwayCode: "NH-16",
    state: "Odisha",
    color: "#D97706",
    lengthKm: 440,
    evCorridorReadinessPct: 62,
    priorityStatus: "moderate",
    waypoints: [
      { name: "Kharagpur", lat: 22.35, lng: 87.23 },
      { name: "Balasore", lat: 21.49, lng: 86.93 },
      { name: "Bhadrak", lat: 21.06, lng: 86.52 },
      { name: "Cuttack", lat: 20.46, lng: 85.88 },
      { name: "Bhubaneswar Approach", lat: 20.3, lng: 85.82 },
    ],
  },
  {
    id: "hyderabad-bengaluru-nh44",
    name: "Hyderabad – Bengaluru (NH44)",
    highwayCode: "NH-44",
    state: "Karnataka",
    color: "#E11D48",
    lengthKm: 570,
    evCorridorReadinessPct: 69,
    priorityStatus: "critical",
    waypoints: [
      { name: "Jadcherla", lat: 16.76, lng: 78.16 },
      { name: "Shadnagar", lat: 17.06, lng: 78.19 },
      { name: "Kurnool", lat: 15.83, lng: 78.04 },
      { name: "Anantapur", lat: 14.68, lng: 77.6 },
      { name: "Chikkaballapur", lat: 13.43, lng: 77.73 },
      { name: "Bengaluru Approach", lat: 13.05, lng: 77.59 },
    ],
  },
  {
    id: "chennai-coimbatore-nh544",
    name: "Chennai – Coimbatore (NH544)",
    highwayCode: "NH-544",
    state: "Tamil Nadu",
    color: "#0D9488",
    lengthKm: 510,
    evCorridorReadinessPct: 72,
    priorityStatus: "high",
    waypoints: [
      { name: "Sriperumbudur", lat: 12.97, lng: 79.94 },
      { name: "Kanchipuram", lat: 12.84, lng: 79.7 },
      { name: "Salem", lat: 11.66, lng: 78.15 },
      { name: "Erode", lat: 11.34, lng: 77.73 },
      { name: "Coimbatore Approach", lat: 11.02, lng: 76.97 },
    ],
  },
];

// --- Assumptions (documented in DATA_ASSUMPTIONS.md) ---

const CITY_EV_BASE_RANGE: Record<CityTier, [number, number]> = {
  1: [40000, 90000],
  2: [15000, 35000],
  3: [5000, 12000],
};

export const CHARGER_RATIO_BENCHMARK: Record<CityTier, [number, number]> = {
  1: [500, 800],
  2: [900, 1400],
  3: [900, 1400],
};

export const HIGHWAY_CHARGER_RATIO_BENCHMARK: [number, number] = [1500, 3000];
const HIGHWAY_TRAFFIC_RANGE: [number, number] = [800, 4000];

// Relative charging frequency per vehicle segment: a fleet vehicle or
// shared 3-wheeler visits a charger far more often per day than a
// privately owned 2-wheeler or 4-wheeler, so it contributes more to
// charging demand than its raw count alone would suggest.
const DEMAND_WEIGHT: SegmentCounts = {
  twoWheeler: 1.0,
  threeWheeler: 1.3,
  fourWheeler: 1.1,
  fleet: 3.5,
};

function segmentMixFor(category: AreaCategory, tier: CityTier): SegmentMix {
  if (category === "residential") {
    if (tier === 1) return { twoWheeler: 58, threeWheeler: 12, fourWheeler: 24, fleet: 6 };
    if (tier === 2) return { twoWheeler: 64, threeWheeler: 12, fourWheeler: 18, fleet: 6 };
    return { twoWheeler: 70, threeWheeler: 10, fourWheeler: 15, fleet: 5 };
  }
  if (category === "commercial") {
    if (tier === 1) return { twoWheeler: 32, threeWheeler: 18, fourWheeler: 35, fleet: 15 };
    if (tier === 2) return { twoWheeler: 38, threeWheeler: 20, fourWheeler: 28, fleet: 14 };
    return { twoWheeler: 44, threeWheeler: 20, fourWheeler: 22, fleet: 14 };
  }
  if (category === "industrial") {
    if (tier === 1) return { twoWheeler: 20, threeWheeler: 24, fourWheeler: 20, fleet: 36 };
    if (tier === 2) return { twoWheeler: 23, threeWheeler: 23, fourWheeler: 17, fleet: 37 };
    return { twoWheeler: 26, threeWheeler: 22, fourWheeler: 14, fleet: 38 };
  }
  // highway corridor stops: fleet + 4-wheeler dominant, minimal 2W/3W
  return { twoWheeler: 5, threeWheeler: 5, fourWheeler: 45, fleet: 45 };
}

// Nudges a category/tier baseline with a small seeded jitter per location,
// so two sites of the same category never render identical mixes, then
// renormalizes back to 100 so shares always add up cleanly.
function jitterSegmentMix(base: SegmentMix): SegmentMix {
  const jitter = () => between(-6, 6);
  const raw = {
    twoWheeler: Math.max(2, base.twoWheeler + jitter()),
    threeWheeler: Math.max(2, base.threeWheeler + jitter()),
    fourWheeler: Math.max(2, base.fourWheeler + jitter()),
    fleet: Math.max(2, base.fleet + jitter()),
  };
  return normalizeShareTo100(raw);
}

function normalizeShareTo100(raw: SegmentMix): SegmentMix {
  const total = raw.twoWheeler + raw.threeWheeler + raw.fourWheeler + raw.fleet;
  const scale = 100 / total;
  const mix = {
    twoWheeler: Math.round(raw.twoWheeler * scale),
    threeWheeler: Math.round(raw.threeWheeler * scale),
    fourWheeler: Math.round(raw.fourWheeler * scale),
    fleet: Math.round(raw.fleet * scale),
  };
  const drift = 100 - (mix.twoWheeler + mix.threeWheeler + mix.fourWheeler + mix.fleet);
  const largest = (Object.keys(mix) as (keyof SegmentMix)[]).reduce((a, b) =>
    mix[a] >= mix[b] ? a : b
  );
  mix[largest] += drift;
  return mix;
}

// Converts a percentage mix into absolute counts that sum exactly to
// `total`, correcting rounding drift on the largest segment.
function segmentCountsFromMix(mix: SegmentMix, total: number): SegmentCounts {
  const raw = {
    twoWheeler: Math.round((mix.twoWheeler / 100) * total),
    threeWheeler: Math.round((mix.threeWheeler / 100) * total),
    fourWheeler: Math.round((mix.fourWheeler / 100) * total),
    fleet: Math.round((mix.fleet / 100) * total),
  };
  const drift = total - (raw.twoWheeler + raw.threeWheeler + raw.fourWheeler + raw.fleet);
  const largest = (Object.keys(raw) as (keyof SegmentCounts)[]).reduce((a, b) =>
    raw[a] >= raw[b] ? a : b
  );
  raw[largest] += drift;
  return raw;
}

// Derives a percentage mix back from absolute counts, so displayed
// percentages always exactly agree with displayed counts.
export function mixFromCounts(counts: SegmentCounts): SegmentMix {
  const total = counts.twoWheeler + counts.threeWheeler + counts.fourWheeler + counts.fleet;
  if (total === 0) return { twoWheeler: 0, threeWheeler: 0, fourWheeler: 0, fleet: 0 };
  return normalizeShareTo100({
    twoWheeler: (counts.twoWheeler / total) * 100,
    threeWheeler: (counts.threeWheeler / total) * 100,
    fourWheeler: (counts.fourWheeler / total) * 100,
    fleet: (counts.fleet / total) * 100,
  });
}

// Recommends a charger type from a location's vehicle segment mix: a
// 4-wheeler/fleet-heavy mix favors DC fast charging, a 2-wheeler/3-wheeler
// heavy mix favors slower AC or battery swap, otherwise a mixed hub.
function recommendChargerType(mix: SegmentMix): ChargerRecommendation {
  const heavyDuty = mix.fourWheeler + mix.fleet;
  const lightDuty = mix.twoWheeler + mix.threeWheeler;
  if (heavyDuty > 55) return "DC fast charger (CCS2)";
  if (lightDuty > 55) return "AC slow charger or battery swap";
  return "Mixed AC and DC hub";
}

function demandRawFor(counts: SegmentCounts): number {
  return (
    counts.twoWheeler * DEMAND_WEIGHT.twoWheeler +
    counts.threeWheeler * DEMAND_WEIGHT.threeWheeler +
    counts.fourWheeler * DEMAND_WEIGHT.fourWheeler +
    counts.fleet * DEMAND_WEIGHT.fleet
  );
}

// Min-max normalizes a set of raw values to a 0-99 scale so locations of
// very different absolute size become comparable at a glance.
function normalizeTo99(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => Math.round(((v - min) / (max - min)) * 99));
}

// --- Pincode-level point generation (documented in DATA_ASSUMPTIONS.md) ---

// How many generated pincode-style points to scatter per city, on top of
// the named landmark sub-locations, by tier.
const TIER_PINCODE_COUNT_RANGE: Record<CityTier, [number, number]> = {
  1: [12, 18],
  2: [8, 12],
  3: [5, 8],
};

// Scatter radius in km from the city center, by tier.
const TIER_PINCODE_RADIUS_KM: Record<CityTier, [number, number]> = {
  1: [3, 25],
  2: [2, 15],
  3: [2, 15],
};

// Real first-3-digit PIN code prefixes for each hub city, so generated
// pincode labels are plausible. Delhi NCR spans several distinct postal
// circles, so it draws from all of them.
const PINCODE_PREFIXES: Record<string, string[]> = {
  "Delhi NCR": ["110", "122", "201", "121"],
  Mumbai: ["400"],
  Bengaluru: ["560"],
  Pune: ["411"],
  Hyderabad: ["500"],
  Chennai: ["600"],
  Kolkata: ["700"],
  Ahmedabad: ["380"],
  Jaipur: ["302"],
  Surat: ["395"],
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Weights area category by how far from the city center a generated point
// falls: closer in skews commercial and residential, further out skews
// industrial, residential, and highway-adjacent.
function categoryForDistanceFraction(t: number): AreaCategory {
  const weights: Record<AreaCategory, number> = {
    commercial: lerp(34, 8, t),
    residential: lerp(40, 42, t),
    industrial: lerp(11, 35, t),
    highway: lerp(5, 15, t),
  };
  const order: AreaCategory[] = ["commercial", "residential", "industrial", "highway"];
  const total = order.reduce((s, cat) => s + weights[cat], 0);
  let r = rand() * total;
  for (const cat of order) {
    if (r < weights[cat]) return cat;
    r -= weights[cat];
  }
  return "residential";
}

function randomPincode(prefixes: string[]): string {
  const prefix = prefixes[Math.floor(rand() * prefixes.length)];
  const suffix = String(Math.round(between(1, 999))).padStart(3, "0");
  return `${prefix}${suffix}`;
}

interface GeneratedLocation {
  name: string;
  category: AreaCategory;
  lat: number;
  lng: number;
}

// Scatters pincode-style points around a hub's center within a realistic
// radius, each carrying a plausible "Sector N, Pincode XXXXXX" label.
function generatePincodePoints(hub: Hub): GeneratedLocation[] {
  const [minCount, maxCount] = TIER_PINCODE_COUNT_RANGE[hub.tier];
  const count = Math.round(between(minCount, maxCount));
  const [minRadiusKm, maxRadiusKm] = TIER_PINCODE_RADIUS_KM[hub.tier];
  const prefixes = PINCODE_PREFIXES[hub.city] ?? ["110"];
  const kmPerLngDegree = 111 * Math.cos((hub.lat * Math.PI) / 180);

  const points: GeneratedLocation[] = [];
  for (let i = 0; i < count; i++) {
    const distanceKm = between(minRadiusKm, maxRadiusKm);
    const distanceFraction = (distanceKm - minRadiusKm) / (maxRadiusKm - minRadiusKm || 1);
    const bearingRad = (between(0, 360) * Math.PI) / 180;
    const category = categoryForDistanceFraction(distanceFraction);
    const latOffset = (distanceKm / 111) * Math.cos(bearingRad);
    const lngOffset = (distanceKm / kmPerLngDegree) * Math.sin(bearingRad);
    const sectorNum = Math.round(between(1, 150));

    points.push({
      name: `Sector ${sectorNum}, Pincode ${randomPincode(prefixes)}`,
      category,
      lat: round(hub.lat + latOffset, 4),
      lng: round(hub.lng + lngOffset, 4),
    });
  }
  return points;
}

interface UrbanDraft {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  category: AreaCategory;
  cityTier: CityTier;
  evRegistrations: number;
  segmentCounts: SegmentCounts;
  segmentMix: SegmentMix;
  existingChargers: number;
  footfallEstimate: number;
  distanceToNearestChargerKm: number;
  demandRaw: number;
  gapRaw: number;
}

function buildUrbanDrafts(): UrbanDraft[] {
  const drafts: UrbanDraft[] = [];
  HUBS.forEach((hub) => {
    const [baseMin, baseMax] = CITY_EV_BASE_RANGE[hub.tier];
    const cityEvTotal = Math.round(between(baseMin, baseMax));

    // Landmarks keep a tight offset around their named location; pincode
    // points scatter across a realistic city-wide radius, weighted toward
    // commercial/residential near the center and industrial/residential/
    // highway further out (see generatePincodePoints).
    const landmarkEntries: GeneratedLocation[] = hub.subLocations.map((sub) => ({
      name: sub.name,
      category: sub.category,
      lat: round(hub.lat + between(-0.06, 0.06), 4),
      lng: round(hub.lng + between(-0.06, 0.06), 4),
    }));
    const allEntries = [...landmarkEntries, ...generatePincodePoints(hub)];

    // Split the city total unevenly across all of its locations.
    const weights = allEntries.map(() => between(0.6, 1.6));
    const weightSum = weights.reduce((s, w) => s + w, 0);

    allEntries.forEach((entry, i) => {
      const evRegistrations = Math.max(50, Math.round((weights[i] / weightSum) * cityEvTotal));

      const mix = jitterSegmentMix(segmentMixFor(entry.category, hub.tier));
      const segmentCounts = segmentCountsFromMix(mix, evRegistrations);
      const segmentMix = mixFromCounts(segmentCounts);

      const [ratioMin, ratioMax] = CHARGER_RATIO_BENCHMARK[hub.tier];
      const evsPerCharger = between(ratioMin, ratioMax);
      const existingChargers = Math.max(0, Math.round(evRegistrations / evsPerCharger));

      const demandRaw = demandRawFor(segmentCounts);
      const gapRaw = evRegistrations / (existingChargers + 1);

      const footfallEstimate = Math.round(evRegistrations * between(1.2, 2.4));

      drafts.push({
        id: `${hub.city}-${i}`.replace(/\s+/g, "-").toLowerCase(),
        name: entry.name,
        city: hub.city,
        state: hub.state,
        lat: entry.lat,
        lng: entry.lng,
        category: entry.category,
        cityTier: hub.tier,
        evRegistrations,
        segmentCounts,
        segmentMix,
        existingChargers,
        footfallEstimate,
        distanceToNearestChargerKm: round(between(0.5, 6), 1),
        demandRaw,
        gapRaw,
      });
    });
  });
  return drafts;
}

interface CorridorDraft {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  evRegistrations: number;
  segmentCounts: SegmentCounts;
  segmentMix: SegmentMix;
  existingChargers: number;
  existingChargingLocations: number;
  footfallEstimate: number;
  distanceToNearestChargerKm: number;
  corridorName: string;
  demandRaw: number;
  gapRaw: number;
}

// Below 40 the corridor's demand score reads as light transit traffic,
// above 70 as heavy transit traffic, and Medium in between.
function evDensityFor(demandScore: number): EvDensity {
  if (demandScore < 40) return "Low";
  if (demandScore <= 70) return "Medium";
  return "High";
}

function buildCorridorDrafts(): CorridorDraft[] {
  const drafts: CorridorDraft[] = [];
  CORRIDORS.forEach((corridor) => {
    corridor.waypoints.forEach((wp, i) => {
      const evRegistrations = Math.round(between(...HIGHWAY_TRAFFIC_RANGE));

      const mix = jitterSegmentMix(segmentMixFor("highway", 1));
      const segmentCounts = segmentCountsFromMix(mix, evRegistrations);
      const segmentMix = mixFromCounts(segmentCounts);

      const evsPerCharger = between(...HIGHWAY_CHARGER_RATIO_BENCHMARK);
      const existingChargers = Math.max(0, Math.round(evRegistrations / evsPerCharger));
      // A charging location can host more than one charger, so the number
      // of distinct locations is at or below the charger count.
      const existingChargingLocations =
        existingChargers > 0 ? Math.max(1, Math.round(existingChargers * between(0.5, 1))) : 0;

      const demandRaw = demandRawFor(segmentCounts);
      const gapRaw = evRegistrations / (existingChargers + 1);

      drafts.push({
        id: `${corridor.name}-${i}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
        name: wp.name,
        city: corridor.name,
        state: corridor.state,
        lat: wp.lat,
        lng: wp.lng,
        evRegistrations,
        segmentCounts,
        segmentMix,
        existingChargers,
        existingChargingLocations,
        footfallEstimate: Math.round(evRegistrations * between(2, 4)),
        distanceToNearestChargerKm: round(between(8, 45), 1),
        corridorName: corridor.name,
        demandRaw,
        gapRaw,
      });
    });
  });
  return drafts;
}

function buildUrbanPoints(): DataPoint[] {
  const drafts = buildUrbanDrafts();
  const demandScores = normalizeTo99(drafts.map((d) => d.demandRaw));
  const gapScores = normalizeTo99(drafts.map((d) => d.gapRaw));
  return drafts.map((d, i) => {
    // Chargers needed to hit the best-observed (tier-1 of that tier's
    // band) benchmark density, vs. what the site actually has today.
    const bestRatio = CHARGER_RATIO_BENCHMARK[d.cityTier][0];
    const chargersNeeded = Math.round(d.evRegistrations / bestRatio);
    const shortfall = Math.max(0, chargersNeeded - d.existingChargers);
    return {
      id: d.id,
      name: d.name,
      city: d.city,
      state: d.state,
      lat: d.lat,
      lng: d.lng,
      category: d.category,
      cityTier: d.cityTier,
      evRegistrations: d.evRegistrations,
      segmentCounts: d.segmentCounts,
      segmentMix: d.segmentMix,
      demandScore: demandScores[i],
      existingChargers: d.existingChargers,
      gapScore: gapScores[i],
      chargersNeeded,
      shortfall,
      footfallEstimate: d.footfallEstimate,
      distanceToNearestChargerKm: d.distanceToNearestChargerKm,
      isCorridor: false,
      recommendedChargerType: recommendChargerType(d.segmentMix),
    };
  });
}

function buildCorridorPoints(): DataPoint[] {
  const drafts = buildCorridorDrafts();
  const demandScores = normalizeTo99(drafts.map((d) => d.demandRaw));
  const gapScores = normalizeTo99(drafts.map((d) => d.gapRaw));
  const bestRatio = HIGHWAY_CHARGER_RATIO_BENCHMARK[0];
  return drafts.map((d, i) => {
    const chargersNeeded = Math.round(d.evRegistrations / bestRatio);
    const shortfall = Math.max(0, chargersNeeded - d.existingChargers);
    return {
      id: d.id,
      name: d.name,
      city: d.city,
      state: d.state,
      lat: d.lat,
      lng: d.lng,
      category: "highway" as const,
      evRegistrations: d.evRegistrations,
      segmentCounts: d.segmentCounts,
      segmentMix: d.segmentMix,
      demandScore: demandScores[i],
      existingChargers: d.existingChargers,
      gapScore: gapScores[i],
      chargersNeeded,
      shortfall,
      footfallEstimate: d.footfallEstimate,
      distanceToNearestChargerKm: d.distanceToNearestChargerKm,
      isCorridor: true,
      corridorName: d.corridorName,
      recommendedChargerType: recommendChargerType(d.segmentMix),
      existingChargingLocations: d.existingChargingLocations,
      estimatedDailyTransactions: Math.round(demandScores[i] * between(1.5, 3.5)),
      needScore: gapScores[i],
      evDensity: evDensityFor(demandScores[i]),
    };
  });
}

export const URBAN_POINTS = buildUrbanPoints();
export const CORRIDOR_POINTS = buildCorridorPoints();
export const ALL_POINTS: DataPoint[] = [...URBAN_POINTS, ...CORRIDOR_POINTS];

export function getTopDemandHotspots(limit = 5): DataPoint[] {
  return [...ALL_POINTS]
    .sort((a, b) => {
      if (b.demandScore !== a.demandScore) return b.demandScore - a.demandScore;
      return b.evRegistrations - a.evRegistrations;
    })
    .slice(0, limit);
}

export function buildStateAggregates(): StateAggregate[] {
  const states = Array.from(new Set(URBAN_POINTS.map((p) => p.state)));
  return states.map((state) => {
    const pts = URBAN_POINTS.filter((p) => p.state === state);
    const currentChargers = pts.reduce((s, p) => s + p.existingChargers, 0);
    const evRegistrations = pts.reduce((s, p) => s + p.evRegistrations, 0);
    const avgGapScore = round(pts.reduce((s, p) => s + p.gapScore, 0) / pts.length);
    const totalShortfall = pts.reduce((s, p) => s + p.shortfall, 0);
    // Aspirational target: what full coverage would need at the
    // best-observed (tier-1) benchmark density of 1 charger per 500 EVs.
    const targetChargers = Math.max(currentChargers + 5, Math.round(evRegistrations / 500));
    return {
      state,
      districtsCovered: pts.length,
      urbanCoveragePct: round(between(35, 75)),
      ruralCoveragePct: round(between(5, 30)),
      currentChargers,
      targetChargers,
      evRegistrations,
      avgGapScore,
      totalShortfall,
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

// Sums absolute EV counts by segment across whatever points are currently
// visible, for the sidebar's aggregate segment mix chart.
export function aggregateSegmentCounts(points: DataPoint[]): SegmentCounts {
  return points.reduce(
    (totals, p) => ({
      twoWheeler: totals.twoWheeler + p.segmentCounts.twoWheeler,
      threeWheeler: totals.threeWheeler + p.segmentCounts.threeWheeler,
      fourWheeler: totals.fourWheeler + p.segmentCounts.fourWheeler,
      fleet: totals.fleet + p.segmentCounts.fleet,
    }),
    { twoWheeler: 0, threeWheeler: 0, fourWheeler: 0, fleet: 0 }
  );
}

// Plain-language trace from a point's chargersNeeded/existingChargers back
// to its shortfall, so the on-screen number is never opaque.
export function formatShortfall(needed: number, existing: number, shortfall: number): string {
  return `Needs ${needed}, has ${existing}, short by ${shortfall}`;
}

export interface CityShortfallSummary {
  city: string;
  shortfall: number;
  sitesCount: number;
  totalEvs: number;
  existingChargers: number;
  chargersNeeded: number;
  avgGapScore: number;
  topDeficitSite: { name: string; shortfall: number; gapScore: number };
}

// Total shortfall (chargersNeeded - existingChargers, already floored at
// zero per point) summed by city, for the operator "which city needs the
// most attention" chart, enriched with precise city aggregates.
export function cityShortfalls(points: DataPoint[]): CityShortfallSummary[] {
  const map = new Map<string, {
    shortfall: number;
    sitesCount: number;
    totalEvs: number;
    existingChargers: number;
    chargersNeeded: number;
    gapScores: number[];
    topDeficitSite: { name: string; shortfall: number; gapScore: number };
  }>();

  points.forEach((p) => {
    const existing = map.get(p.city);
    if (!existing) {
      map.set(p.city, {
        shortfall: p.shortfall,
        sitesCount: 1,
        totalEvs: p.evRegistrations,
        existingChargers: p.existingChargingLocations ?? 0,
        chargersNeeded: p.chargersNeeded,
        gapScores: [p.gapScore],
        topDeficitSite: { name: p.name, shortfall: p.shortfall, gapScore: p.gapScore },
      });
    } else {
      existing.shortfall += p.shortfall;
      existing.sitesCount += 1;
      existing.totalEvs += p.evRegistrations;
      existing.existingChargers += p.existingChargingLocations ?? 0;
      existing.chargersNeeded += p.chargersNeeded;
      existing.gapScores.push(p.gapScore);
      if (p.shortfall > existing.topDeficitSite.shortfall) {
        existing.topDeficitSite = { name: p.name, shortfall: p.shortfall, gapScore: p.gapScore };
      }
    }
  });

  return Array.from(map, ([city, d]) => ({
    city,
    shortfall: d.shortfall,
    sitesCount: d.sitesCount,
    totalEvs: d.totalEvs,
    existingChargers: d.existingChargers,
    chargersNeeded: d.chargersNeeded,
    avgGapScore: round(d.gapScores.reduce((a, b) => a + b, 0) / d.gapScores.length),
    topDeficitSite: d.topDeficitSite,
  })).sort((a, b) => b.shortfall - a.shortfall);
}

export interface CategoryGapSummary {
  category: AreaCategory;
  avgGapScore: number;
  sitesCount: number;
  totalShortfall: number;
  totalEvs: number;
  existingChargers: number;
  chargersNeeded: number;
}

const CATEGORY_ORDER: AreaCategory[] = ["residential", "commercial", "industrial", "highway"];

// Average gap score and precise aggregates per area category across whatever points are passed
// in, so patterns by area type are visible independent of location or state.
export function categoryGapBreakdown(
  points: DataPoint[]
): CategoryGapSummary[] {
  return CATEGORY_ORDER.map((category) => {
    const pts = points.filter((p) => p.category === category);
    const sitesCount = pts.length;
    const avgGapScore = sitesCount > 0 ? round(pts.reduce((s, p) => s + p.gapScore, 0) / sitesCount) : 0;
    const totalShortfall = pts.reduce((s, p) => s + p.shortfall, 0);
    const totalEvs = pts.reduce((s, p) => s + p.evRegistrations, 0);
    const existingChargers = pts.reduce((s, p) => s + (p.existingChargingLocations ?? 0), 0);
    const chargersNeeded = pts.reduce((s, p) => s + p.chargersNeeded, 0);

    return {
      category,
      avgGapScore,
      sitesCount,
      totalShortfall,
      totalEvs,
      existingChargers,
      chargersNeeded,
    };
  }).filter((row) => points.some((p) => p.category === row.category));
}

// =============================================================================
// 5-YEAR EV REGISTRATION GROWTH PROJECTION MODELS
// =============================================================================

export type GrowthScenario = "conservative" | "base" | "accelerated";

export interface GrowthYearData {
  year: number;
  label: string;
  totalEvs: number;
  twoWheeler: number;
  threeWheeler: number;
  fourWheeler: number;
  fleet: number;
  chargersNeeded: number;
  newAdditions: number;
  growthRatePct: number;
}

export interface GrowthProjectionResult {
  targetName: string;
  targetType: "region" | "corridor" | "site";
  baseYear: number;
  endYear: number;
  baseEvs: number;
  endEvs: number;
  cagrPct: number;
  totalMultiple: number;
  existingChargers: number;
  endChargersNeeded: number;
  newChargersRequired: number;
  years: GrowthYearData[];
}

const SEGMENT_ANNUAL_RATES = {
  // 5 annual growth rates for years 2027 through 2031
  twoWheeler: [0.38, 0.35, 0.32, 0.29, 0.26],
  threeWheeler: [0.34, 0.32, 0.29, 0.26, 0.23],
  fourWheeler: [0.48, 0.46, 0.42, 0.38, 0.34],
  fleet: [0.40, 0.38, 0.35, 0.31, 0.28],
};

const SCENARIO_MULTIPLIERS: Record<GrowthScenario, number> = {
  conservative: 0.75,
  base: 1.0,
  accelerated: 1.25,
};

export function calculateEvGrowthProjection(
  baseCounts: SegmentCounts,
  targetName: string,
  targetType: "region" | "corridor" | "site",
  existingChargers: number,
  isCorridor: boolean,
  scenario: GrowthScenario = "base",
  baseYear: number = 2026
): GrowthProjectionResult {
  const mult = SCENARIO_MULTIPLIERS[scenario];
  const baseTotal =
    baseCounts.twoWheeler +
    baseCounts.threeWheeler +
    baseCounts.fourWheeler +
    baseCounts.fleet;

  // Charger ratio benchmark: 1 per 500 for urban; 1 per 40 for highway corridor transit
  const benchmarkRatio = isCorridor ? 40 : 500;
  const initialNeeded = Math.round(baseTotal / benchmarkRatio);

  const years: GrowthYearData[] = [
    {
      year: baseYear,
      label: String(baseYear),
      totalEvs: baseTotal,
      twoWheeler: baseCounts.twoWheeler,
      threeWheeler: baseCounts.threeWheeler,
      fourWheeler: baseCounts.fourWheeler,
      fleet: baseCounts.fleet,
      chargersNeeded: initialNeeded,
      newAdditions: 0,
      growthRatePct: 0,
    },
  ];

  let curr2W = baseCounts.twoWheeler;
  let curr3W = baseCounts.threeWheeler;
  let curr4W = baseCounts.fourWheeler;
  let currFleet = baseCounts.fleet;
  let prevTotal = baseTotal;

  for (let i = 0; i < 5; i++) {
    const yr = baseYear + i + 1;
    curr2W = Math.round(curr2W * (1 + SEGMENT_ANNUAL_RATES.twoWheeler[i] * mult));
    curr3W = Math.round(curr3W * (1 + SEGMENT_ANNUAL_RATES.threeWheeler[i] * mult));
    curr4W = Math.round(curr4W * (1 + SEGMENT_ANNUAL_RATES.fourWheeler[i] * mult));
    currFleet = Math.round(currFleet * (1 + SEGMENT_ANNUAL_RATES.fleet[i] * mult));

    const totalEvs = curr2W + curr3W + curr4W + currFleet;
    const additions = totalEvs - prevTotal;
    const growthRatePct = round(((totalEvs - prevTotal) / prevTotal) * 100, 1);
    const chargersNeeded = Math.round(totalEvs / benchmarkRatio);

    years.push({
      year: yr,
      label: String(yr),
      totalEvs,
      twoWheeler: curr2W,
      threeWheeler: curr3W,
      fourWheeler: curr4W,
      fleet: currFleet,
      chargersNeeded,
      newAdditions: additions,
      growthRatePct,
    });

    prevTotal = totalEvs;
  }

  const endEvs = years[years.length - 1].totalEvs;
  const endChargersNeeded = years[years.length - 1].chargersNeeded;
  const cagrPct = round((Math.pow(endEvs / Math.max(baseTotal, 1), 1 / 5) - 1) * 100, 1);
  const totalMultiple = round(endEvs / Math.max(baseTotal, 1), 1);
  const newChargersRequired = Math.max(0, endChargersNeeded - existingChargers);

  return {
    targetName,
    targetType,
    baseYear,
    endYear: baseYear + 5,
    baseEvs: baseTotal,
    endEvs,
    cagrPct,
    totalMultiple,
    existingChargers,
    endChargersNeeded,
    newChargersRequired,
    years,
  };
}

export function getGrowthProjectionForPoint(
  point: DataPoint,
  scenario: GrowthScenario = "base"
): GrowthProjectionResult {
  return calculateEvGrowthProjection(
    point.segmentCounts,
    point.name,
    "site",
    point.existingChargers,
    point.isCorridor,
    scenario
  );
}

export function getGrowthProjectionForRegion(
  cityName: string,
  scenario: GrowthScenario = "base"
): GrowthProjectionResult {
  const pts = URBAN_POINTS.filter((p) => p.city.toLowerCase() === cityName.toLowerCase());
  const counts = aggregateSegmentCounts(pts.length > 0 ? pts : URBAN_POINTS);
  const existingChargers = pts.reduce((s, p) => s + p.existingChargers, 0);

  return calculateEvGrowthProjection(
    counts,
    cityName,
    "region",
    existingChargers,
    false,
    scenario
  );
}

export function getGrowthProjectionForCorridor(
  corridorName: string,
  scenario: GrowthScenario = "base"
): GrowthProjectionResult {
  const pts = CORRIDOR_POINTS.filter(
    (p) => p.corridorName?.toLowerCase() === corridorName.toLowerCase()
  );
  const counts = aggregateSegmentCounts(pts.length > 0 ? pts : CORRIDOR_POINTS);
  const existingChargers = pts.reduce((s, p) => s + p.existingChargers, 0);

  return calculateEvGrowthProjection(
    counts,
    corridorName,
    "corridor",
    existingChargers,
    true,
    scenario
  );
}

export interface SelectableRegionOrCorridor {
  id: string;
  name: string;
  type: "region" | "corridor";
  evCount: number;
  pointCount: number;
  stateOrSpan: string;
}

export function getAllSelectableRegionsAndCorridors(): SelectableRegionOrCorridor[] {
  const regionsMap = new Map<string, { evs: number; count: number; state: string }>();
  URBAN_POINTS.forEach((p) => {
    const prev = regionsMap.get(p.city);
    if (!prev) {
      regionsMap.set(p.city, { evs: p.evRegistrations, count: 1, state: p.state });
    } else {
      prev.evs += p.evRegistrations;
      prev.count += 1;
    }
  });

  const regions: SelectableRegionOrCorridor[] = Array.from(regionsMap, ([city, d]) => ({
    id: `reg-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: city,
    type: "region" as const,
    evCount: d.evs,
    pointCount: d.count,
    stateOrSpan: d.state,
  })).sort((a, b) => b.evCount - a.evCount);

  const corridorMap = new Map<string, { evs: number; count: number; state: string }>();
  CORRIDOR_POINTS.forEach((p) => {
    const cName = p.corridorName ?? "Highway";
    const prev = corridorMap.get(cName);
    if (!prev) {
      corridorMap.set(cName, { evs: p.evRegistrations, count: 1, state: p.state });
    } else {
      prev.evs += p.evRegistrations;
      prev.count += 1;
    }
  });

  const corridors: SelectableRegionOrCorridor[] = Array.from(corridorMap, ([corridor, d]) => ({
    id: `cor-${corridor.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: corridor,
    type: "corridor" as const,
    evCount: d.evs,
    pointCount: d.count,
    stateOrSpan: d.state,
  })).sort((a, b) => b.evCount - a.evCount);

  return [...regions, ...corridors];
}
