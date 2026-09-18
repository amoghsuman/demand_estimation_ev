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
  // Chargers this point would need to hit the best-observed (tier-1 /
  // highway) benchmark density, and how far existingChargers falls short
  // of that, floored at zero. See DATA_ASSUMPTIONS.md.
  chargersNeeded: number;
  shortfall: number;
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
  // Electrical Substation & Grid telemetry
  substation?: SubstationData;
  // Active charger utilization profile at site
  chargerUtilizations?: ChargerTypeUtilization[];
  // Nearest highway toll plaza if applicable
  nearestTollPlazaId?: string;
}

export interface HourlyTollFlow {
  hour: number; // 0 to 23
  timeLabel: string; // "00:00", "01:00", etc.
  totalEvs: number;
  fourWheeler: number; // Private EVs & fleet cabs
  fleetCommercial: number; // Light commercial vans & 3-wheelers
  evBusesTrucks: number; // Heavy electric buses & transport trucks
  totalVehiclesAllFuel: number; // Total traffic passing toll
  evSharePct: number;
}

export interface TollPlaza {
  id: string;
  name: string;
  highwayCode: string; // e.g. "NH48", "NE1", "NH44"
  corridorName: string;
  state: string;
  lat: number;
  lng: number;
  totalDailyVehicles: number;
  totalDailyEvs: number;
  evSharePct: number;
  peakHour: number; // e.g. 9 for 09:00 - 10:00
  peakHourEvVolume: number;
  peakHourTimeLabel: string;
  offPeakHour: number;
  offPeakEvVolume: number;
  fastTagLanes: number;
  dedicatedEvFastChargeLanes: boolean;
  hourlyFlow: HourlyTollFlow[];
  recommendedTollChargerCapacityMw: number;
  // Charging capacity already installed within the plaza's ~15 km catchment.
  currentInstalledCapacityMw?: number;
}

export interface ChargerTypeUtilization {
  chargerType: string; // e.g. "240 kW Ultra-Fast DC", "120 kW Dual-Gun DC", "60 kW Fast DC", "22 kW Type-2 AC", "3.3 kW Slow AC"
  category: "dc-ultra" | "dc-fast" | "ac-fast" | "ac-slow";
  powerKw: number;
  connector: string; // "CCS2", "Type-2", "Bharat DC-001", "GB/T"
  totalGunsDeployed: number;
  avgUtilizationPct: number; // 0 - 100%
  peakUtilizationPct: number;
  peakHours: string; // e.g. "17:00 - 21:00"
  avgSessionsPerDayPerGun: number;
  avgDwellMinutes: number;
  avgEnergyDispensedKwhPerDay: number;
  avgQueueWaitMinutes: number;
  uptimePct: number;
  status: "overcapacity" | "optimal" | "underutilized";
  estimatedMonthlyRevenueInr: number;
}

export interface SubstationData {
  id: string;
  name: string;
  discom: string; // e.g. "BESCOM", "MSEDCL", "DHBVN", "TANGEDCO", "Tata Power-DDL"
  voltageRating: string; // e.g. "66/11 kV", "33/11 kV", "132/33 kV"
  distanceKm: number;
  transformerCapacityMva: number;
  currentPeakLoadMva: number;
  availableHeadroomMva: number;
  loadUtilizationPct: number;
  dedicatedEvFeederAvailable: boolean;
  feederStatus: "Dedicated 11kV Available" | "Shared Feeder - High Capacity" | "Feeder Congested - Augmentation Required";
  energizationLeadTimeDays: number;
  powerCostPerUnitInr: number; // e.g. 6.85
  lat: number;
  lng: number;
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
  totalShortfall: number;
}

export type Role = "operator" | "government" | "fleet";
