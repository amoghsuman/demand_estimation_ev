import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Building2,
  Car,
  Gauge,
  MapPin,
  ShieldCheck,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

export interface Kpi {
  label: string;
  value: string;
}

function getKpiVisuals(label: string) {
  const l = label.toLowerCase();
  if (l.includes("gap")) {
    return {
      icon: Gauge,
      accent: "text-amber-800 bg-amber-100/80 border-amber-300",
      indicator: "bg-amber-500",
    };
  }
  if (l.includes("shortfall") || l.includes("unserved")) {
    return {
      icon: AlertTriangle,
      accent: "text-rose-800 bg-rose-100/80 border-rose-300",
      indicator: "bg-rose-500",
    };
  }
  if (l.includes("charger") || l.includes("public")) {
    return {
      icon: Zap,
      accent: "text-emerald-800 bg-emerald-100/80 border-emerald-300",
      indicator: "bg-emerald-500",
    };
  }
  if (l.includes("ev") || l.includes("traffic") || l.includes("vehicle")) {
    return {
      icon: Car,
      accent: "text-sky-800 bg-sky-100/80 border-sky-300",
      indicator: "bg-sky-500",
    };
  }
  if (l.includes("target") || l.includes("progress")) {
    return {
      icon: Target,
      accent: "text-indigo-800 bg-indigo-100/80 border-indigo-300",
      indicator: "bg-indigo-500",
    };
  }
  if (l.includes("state") || l.includes("site") || l.includes("stop")) {
    return {
      icon: MapPin,
      accent: "text-slate-800 bg-slate-100 border-slate-300",
      indicator: "bg-slate-500",
    };
  }
  return {
    icon: Activity,
    accent: "text-slate-800 bg-slate-100 border-slate-300",
    indicator: "bg-copper",
  };
}

export default function KpiPanel({ kpis }: { kpis: Kpi[] }) {
  const cols = kpis.length === 4 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-3";
  return (
    <div className={`grid ${cols} gap-2.5`}>
      {kpis.map((kpi) => {
        const { icon: Icon, accent, indicator } = getKpiVisuals(kpi.label);
        return (
          <div
            key={kpi.label}
            className="group relative rounded-xl border border-line bg-panel p-3 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
          >
            {/* Subtle top indicator line for visual identity */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${indicator} opacity-70`} />

            <div className="flex items-start justify-between gap-1.5 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 leading-tight">
                {kpi.label}
              </span>
              <span
                className={`shrink-0 p-1 rounded-md border text-xs ${accent}`}
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <div className="font-display text-2xl font-bold text-slate-950 tracking-tight leading-none">
                {kpi.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

