export const SEGMENT_KEYS = ["twoWheeler", "threeWheeler", "fourWheeler", "fleet"] as const;
export type SegmentKey = (typeof SEGMENT_KEYS)[number];

export const SEGMENT_LABELS: Record<SegmentKey, string> = {
  twoWheeler: "2-wheeler",
  threeWheeler: "3-wheeler",
  fourWheeler: "4-wheeler",
  fleet: "Fleet & Bus",
};

export const SEGMENT_CHARGER_HINT: Record<SegmentKey, string> = {
  twoWheeler: "AC slow (3.3kW) & Battery Swap",
  threeWheeler: "Depot AC / Rapid Swap",
  fourWheeler: "DC Fast (CCS2) & AC Type 2",
  fleet: "High-power DC (60–150kW+)",
};

export const SEGMENT_DESCRIPTIONS: Record<SegmentKey, string> = {
  twoWheeler: "Personal scooters & motorbikes · High volume, low kW draw",
  threeWheeler: "Commercial auto-rickshaws & cargo · High daily utilization",
  fourWheeler: "Passenger cars · Requires standardized CCS2 fast connectors",
  fleet: "Commercial logistics, cabs & buses · High energy throughput",
};

// Distinct, high-contrast, accessible editorial palette for vehicle segments
export const SEGMENT_COLORS: Record<SegmentKey, string> = {
  twoWheeler: "#2C6E52", // Deep emerald green
  threeWheeler: "#2563EB", // Vibrant cobalt slate
  fourWheeler: "#C9A227", // Warm copper / amber
  fleet: "#B43424", // Rich terracotta / crimson
};

// Severity scale for gap scores & shortfalls:
// Low gap (<35) = #2C6E52 (Well served / balanced)
// Moderate gap (35-65) = #C9A227 (Emerging deficit / moderate opportunity)
// High gap (65-85) = #D97706 (High deficit / prime build target)
// Critical deficit (>85) = #B43424 (Acute under-supply / urgent need)
export function colorForSeverity(value: number, max = 99): string {
  const t = Math.max(0, Math.min(1, value / max));
  if (t <= 0.35) {
    // #2C6E52 (44, 110, 82) to #C9A227 (201, 162, 39)
    const factor = t / 0.35;
    const r = Math.round(44 + (201 - 44) * factor);
    const g = Math.round(110 + (162 - 110) * factor);
    const b = Math.round(82 + (39 - 82) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (t <= 0.7) {
    // #C9A227 (201, 162, 39) to #D97706 (217, 119, 6)
    const factor = (t - 0.35) / 0.35;
    const r = Math.round(201 + (217 - 201) * factor);
    const g = Math.round(162 + (119 - 162) * factor);
    const b = Math.round(39 + (6 - 39) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // #D97706 (217, 119, 6) to #B43424 (180, 52, 36)
    const factor = (t - 0.7) / 0.3;
    const r = Math.round(217 + (180 - 217) * factor);
    const g = Math.round(119 + (52 - 119) * factor);
    const b = Math.round(6 + (36 - 6) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function severityBadge(value: number, max = 99): { label: string; bg: string; text: string } {
  const t = value / max;
  if (t < 0.35) return { label: "Balanced", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800" };
  if (t < 0.65) return { label: "Moderate Gap", bg: "bg-amber-50 border-amber-200", text: "text-amber-800" };
  if (t < 0.85) return { label: "High Deficit", bg: "bg-orange-50 border-orange-200", text: "text-orange-800" };
  return { label: "Critical Need", bg: "bg-rose-50 border-rose-200", text: "text-rose-800" };
}

export const CHART_COPPER = "#C9A227";
export const CHART_SIGNAL = "#2C6E52";
export const CHART_MUTED = "#6B6F76";
export const CHART_INK = "#1B1D22";
export const CHART_LINE = "#E2DFD6";
export const CHART_BG_SUBTLE = "#F0EEE7";

// Shared light-theme styling for recharts <Tooltip>
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#FFFFFF",
    border: "1px solid #E2DFD6",
    borderRadius: 8,
    fontSize: 12,
    padding: "8px 12px",
    boxShadow: "0 4px 16px rgba(27,29,34,0.12)",
    fontFamily: "Inter, sans-serif",
  },
  labelStyle: { color: CHART_INK, marginBottom: 4, fontWeight: 600, fontSize: 13 },
  itemStyle: { color: CHART_MUTED, padding: "2px 0" },
  cursor: { fill: "rgba(27,29,34,0.04)" },
} as const;

