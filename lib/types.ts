export type AreaCategory = "residential" | "commercial" | "highway" | "industrial";

export interface SegmentMix {
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
  demandScore: number;
  existingChargers: number;
  gapScore: number;
  footfallEstimate: number;
  segmentMix: SegmentMix;
  distanceToNearestChargerKm: number;
  isCorridor: boolean;
  corridorName?: string;
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
