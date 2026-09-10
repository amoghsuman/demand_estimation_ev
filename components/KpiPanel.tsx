export interface Kpi {
  label: string;
  value: string;
}

export default function KpiPanel({ kpis }: { kpis: Kpi[] }) {
  const cols = kpis.length === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <div className={`grid ${cols} gap-4`}>
      {kpis.map((kpi) => (
        <div key={kpi.label} className="pt-3 border-t border-line">
          <div className="font-display text-2xl text-ink leading-tight">
            {kpi.value}
          </div>
          <div className="text-[11px] text-muted mt-1">{kpi.label}</div>
        </div>
      ))}
    </div>
  );
}
