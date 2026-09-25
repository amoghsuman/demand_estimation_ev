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
      accent: "text-amber-800 bg-amber-50 border-amber-200",
      indicator: "bg-amber-500",
    };
  }
  if (l.includes("shortfall") || l.includes("unserved")) {
    return {
      icon: AlertTriangle,
      accent: "text-rose-800 bg-rose-50 border-rose-200",
      indicator: "bg-rose-500",
    };
  }
  if (l.includes("charger") || l.includes("public")) {
    return {
      icon: Zap,
      accent: "text-emerald-800 bg-emerald-50 border-emerald-200",
      indicator: "bg-emerald-500",
    };
  }
  if (l.includes("ev") || l.includes("traffic") || l.includes("vehicle")) {
    return {
      icon: Car,
      accent: "text-sky-800 bg-sky-50 border-sky-200",
      indicator: "bg-sky-500",
    };
  }
  if (l.includes("target") || l.includes("progress")) {
    return {
      icon: Target,
      accent: "text-indigo-800 bg-indigo-50 border-indigo-200",
      indicator: "bg-indigo-500",
    };
  }
  if (l.includes("state") || l.includes("site") || l.includes("stop")) {
    return {
      icon: MapPin,
      accent: "text-slate-800 bg-slate-50 border-slate-200",
      indicator: "bg-slate-500",
    };
  }
  return {
    icon: Activity,
    accent: "text-slate-800 bg-slate-50 border-slate-200",
    indicator: "bg-slate-500",
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
            className="group relative rounded-xl border border-line bg-white p-3 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
          >
            {/* Subtle top indicator line for visual identity */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${indicator} opacity-80`} />

            <div className="flex items-start justify-between gap-1.5 mb-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-600 leading-tight">
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
              <div className="font-mono text-2xl font-bold text-slate-950 tracking-tight leading-none tabular-nums">
                {kpi.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
