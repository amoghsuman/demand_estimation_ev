export const SEGMENT_KEYS = ["twoWheeler", "threeWheeler", "fourWheeler", "fleet"] as const;
export type SegmentKey = (typeof SEGMENT_KEYS)[number];

export const SEGMENT_LABELS: Record<SegmentKey, string> = {
  twoWheeler: "2-wheeler",
  threeWheeler: "3-wheeler",
  fourWheeler: "4-wheeler",
  fleet: "Fleet",
};

// Same jade -> brass interpolation the map uses for its metric coloring,
// so every chart stays inside the app's two accent hues.
function interpolate(t: number) {
  const low = { r: 44, g: 110, b: 82 };
  const high = { r: 201, g: 162, b: 39 };
  const r = Math.round(low.r + (high.r - low.r) * t);
  const g = Math.round(low.g + (high.g - low.g) * t);
  const b = Math.round(low.b + (high.b - low.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export const SEGMENT_COLORS: Record<SegmentKey, string> = {
  twoWheeler: interpolate(0),
  threeWheeler: interpolate(1 / 3),
  fourWheeler: interpolate(2 / 3),
  fleet: interpolate(1),
};

// Colors a value by severity on the same jade (low) -> brass (high) scale
// used everywhere else, e.g. for a gap score 0-99.
export function colorForSeverity(value: number, max = 99) {
  const t = Math.max(0, Math.min(1, value / max));
  return interpolate(t);
}

export const CHART_COPPER = "#C9A227";
export const CHART_SIGNAL = "#2C6E52";
export const CHART_MUTED = "#6B6F76";
export const CHART_INK = "#1B1D22";

// Shared light-theme styling for recharts <Tooltip>, so hover tooltips match
// the panel look instead of the library's default.
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#FFFFFF",
    border: "1px solid #E2DFD6",
    borderRadius: 6,
    fontSize: 11,
    padding: "6px 10px",
    boxShadow: "0 2px 8px rgba(27,29,34,0.08)",
  },
  labelStyle: { color: CHART_INK, marginBottom: 2, fontWeight: 500 },
  itemStyle: { color: CHART_MUTED, padding: 0 },
  cursor: { fill: "rgba(27,29,34,0.05)" },
} as const;
