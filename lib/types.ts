export type AreaCategory = "residential" | "commercial" | "highway" | "industrial";
export type CityTier = 1 | 2 | 3;

export type ChargerRecommendation =
  | "DC fast charger (CCS2)"
  | "AC slow charger or battery swap"
  | "Mixed AC and DC hub";

export type EvDensity = "Low" | "Medium" | "High";

// Percentage shares (sums to ~100). Kept alongside SegmentCounts for chart
// code that only needs proportions, but SegmentCounts is the source of truth.
export interface SegmentMix {
  twoWheeler: number;
  threeWheeler: number;
  fourWheeler: number;
  fleet: number;
}

// Absolute EV counts by vehicle segment. Always sums exactly to the point's
// evRegistrations. See DATA_ASSUMPTIONS.md for how these are derived.
export interface SegmentCounts {
  twoWheeler: number;
  threeWheeler: number;
  fourWheeler: number;
  fleet: number;
}

export interface DataPoint {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  category: AreaCategory;
  // Undefined for highway corridor points, which have no city tier.
  cityTier?: CityTier;
  // Registered EVs for urban points; estimated daily transiting EVs for
  // highway corridor points (there's no resident population at a highway
  // stop). See DATA_ASSUMPTIONS.md.
  evRegistrations: number;
  segmentCounts: SegmentCounts;
  segmentMix: SegmentMix;
  demandScore: number;
  existingChargers: number;
  gapScore: number;
  footfallEstimate: number;
  distanceToNearestChargerKm: number;
  isCorridor: boolean;
  corridorName?: string;
  recommendedChargerType: ChargerRecommendation;
  // Toll-to-toll corridor fields below are only populated for highway
  // corridor points (isCorridor === true); undefined for urban points.
  existingChargingLocations?: number;
  estimatedDailyTransactions?: number;
  needScore?: number;
  evDensity?: EvDensity;
}

export interface StateAggregate {
  state: string;
  districtsCovered: number;
  urbanCoveragePct: number;
  ruralCoveragePct: number;
  currentChargers: number;
  targetChargers: number;
  evRegistrations: number;
  avgGapScore: number;
}

export type Role = "operator" | "government" | "fleet";
