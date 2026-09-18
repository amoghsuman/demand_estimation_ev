"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Pause, Zap, Car, MapPin, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import {
  ChainageCorridor,
  GREEN_MAX_KM,
  RED_MIN_KM,
  STATUS_COLORS,
  corridorSnapshot,
  segmentsForHour,
  simulateCorridor,
  tollCapacityRows,
} from "@/lib/corridorChainage";
import { TOLL_PLAZAS } from "@/lib/tollAndGridData";

interface Props {
  corridor: ChainageCorridor;
  hour: number;
  onHourChange: (hour: number) => void;
  onSelectToll?: (tollId: string) => void;
}

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

function Kpi({
  label,
  value,
  sub,
  tone = "text-slate-950",
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-1 font-mono text-lg font-bold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-medium text-slate-600">{sub}</div>
    </div>
  );
}

export default function CorridorWhiteSpacePanel({ corridor, hour, onHourChange, onSelectToll }: Props) {
  const [playing, setPlaying] = useState(false);
  const [hoverKm, setHoverKm] = useState<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => onHourChange((hour + 1) % 24), 900);
    return () => clearInterval(t);
  }, [playing, hour, onHourChange]);

  const snap = useMemo(() => corridorSnapshot(corridor, hour), [corridor, hour]);
  const segments = useMemo(() => segmentsForHour(corridor, hour), [corridor, hour]);
  const days = useMemo(() => simulateCorridor(corridor), [corridor]);
  const tollRows = useMemo(() => tollCapacityRows(corridor), [corridor]);

  const pct = (km: number) => `${(km / corridor.lengthKm) * 100}%`;
  const hovered = hoverKm === null ? null : segments.find((s) => hoverKm >= s.startKm && hoverKm < s.endKm);

  return (
    <div className="space-y-4">
      {/* Hour control */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2.5">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play 24 hours"}
        </button>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <Clock className="h-3.5 w-3.5 text-amber-700" />
          <span className="font-mono text-sm">
            {hh(hour)} to {hh((hour + 1) % 24)}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              snap.isPeakHour ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {snap.isPeakHour ? "Peak hour" : "Off peak"}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={23}
          value={hour}
          onChange={(e) => onHourChange(Number(e.target.value))}
          className="flex-1 min-w-[180px] accent-amber-600"
          aria-label="Hour of day"
        />
        <span className="text-[10px] font-medium text-slate-600">Drives the map overlay and every number below</span>
      </div>

      {/* Dynamic traffic KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="EVs on corridor"
          value={`${snap.evsOnCorridor.toLocaleString("en-IN")} / hr`}
          sub="Average across the corridor toll plazas"
          icon={<Car className="h-3.5 w-3.5 text-amber-600" />}
        />
        <Kpi
          label="Stopping to charge"
          value={`${snap.stopping} EVs`}
          sub={`${snap.evsOnCorridor ? Math.round((snap.stopping / (snap.evsOnCorridor * snap.stationsTotal)) * 1000) / 10 : 0}% stop rate per station passed`}
          icon={<Zap className="h-3.5 w-3.5 text-amber-600" />}
        />
        <Kpi
          label="Found a charger"
          value={`${snap.foundChargerPct}%`}
          sub={`${snap.served} served · ${snap.waiting} queued · ${snap.turnedAway} turned away`}
          tone={snap.foundChargerPct >= 95 ? "text-emerald-700" : snap.foundChargerPct >= 85 ? "text-amber-700" : "text-rose-700"}
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
        />
        <Kpi
          label="Stations with a free gun"
          value={`${snap.stationsAvailable} of ${snap.stationsTotal}`}
          sub={`${snap.gunsFree} of ${snap.gunsTotal} guns free right now`}
          tone={snap.stationsAvailable <= snap.stationsTotal / 2 ? "text-amber-700" : "text-slate-950"}
          icon={<MapPin className="h-3.5 w-3.5 text-sky-600" />}
        />
        <Kpi
          label="White spaces"
          value={`${snap.whiteSpaces.length} ${snap.whiteSpaces.length === 1 ? "stretch" : "stretches"} · ${snap.kmRed} km`}
          sub={`${snap.kmAmber} km amber · ${snap.kmGreen} km green`}
          tone="text-rose-700"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
        />
      </div>

      {/* Chainage strip */}
      <div className="rounded-lg border border-line bg-panel p-3.5 shadow-2xs">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-900">
            {corridor.name}: charger coverage by kilometre ({corridor.lengthKm} km)
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-700">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: STATUS_COLORS.green }} /> Chargers under {GREEN_MAX_KM} km apart, gun free
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: STATUS_COLORS.amber }} /> {GREEN_MAX_KM} to {RED_MIN_KM} km, or present but busy
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: STATUS_COLORS.red }} /> Over {RED_MIN_KM} km with zero chargers: white space
            </span>
          </div>
        </div>

        <div className="relative mx-2 pt-14 pb-12">
          {/* Station pins above the strip */}
          {days.map((d) => {
            const h = d.hours[hour];
            return (
              <div
                key={d.station.id}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                style={{ left: pct(d.station.km) }}
                title={`${d.station.name} · km ${d.station.km} · ${d.station.guns} guns × ${d.station.powerKw} kW · ${h.utilizationPct}% utilized · ${h.gunsFree} free`}
              >
                <span className="whitespace-nowrap text-[9px] font-bold text-slate-800">{d.station.name.split(" ")[0]}</span>
                <span
                  className="mt-0.5 rounded px-1 font-mono text-[9px] font-bold text-white"
                  style={{ background: h.available ? STATUS_COLORS.green : STATUS_COLORS.amber }}
                >
                  {h.gunsFree}/{d.station.guns}
                </span>
                <span className="h-4 w-px bg-slate-500" />
              </div>
            );
          })}

          {/* Coloured segments */}
          <div className="flex h-6 w-full overflow-hidden rounded" onMouseLeave={() => setHoverKm(null)}>
            {segments.map((s) => (
              <div
                key={s.startKm}
                onMouseEnter={() => setHoverKm(s.midKm)}
                className="h-full border-r border-white/40 transition-colors duration-500"
                style={{ width: pct(s.endKm - s.startKm), background: STATUS_COLORS[s.status] }}
              />
            ))}
          </div>

          {/* Toll plazas and city nodes below */}
          {corridor.tolls.map((t) => {
            const plaza = TOLL_PLAZAS.find((p) => p.id === t.tollId);
            return (
              <button
                key={t.tollId}
                onClick={() => onSelectToll?.(t.tollId)}
                className="absolute -translate-x-1/2 flex flex-col items-center"
                style={{ left: pct(t.km), top: "5rem" }}
                title={`${plaza?.name}: ${plaza?.hourlyFlow[hour].totalEvs} EVs this hour. Click for the toll flow chart.`}
              >
                <span className="h-2 w-px bg-slate-500" />
                <span className="rounded bg-slate-900 px-1 text-[8px] font-bold text-white">TOLL</span>
                <span className="font-mono text-[9px] font-bold text-slate-700">{plaza?.hourlyFlow[hour].totalEvs}/h</span>
              </button>
            );
          })}
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] font-semibold text-slate-500">
            <span>km 0 · Delhi</span>
            <span>km {corridor.lengthKm} · Chandigarh</span>
          </div>
        </div>

        <div className="mt-1 min-h-[18px] text-[11px] font-medium text-slate-700">
          {hovered ? (
            <>
              <strong>
                km {hovered.startKm} to {hovered.endKm}:
              </strong>{" "}
              {hovered.reason} (nearest site: {hovered.nearestStation})
            </>
          ) : (
            <span className="text-slate-500">Hover the strip to see why a stretch is green, amber or red.</span>
          )}
        </div>

        {snap.whiteSpaces.length + snap.amberStretches.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {snap.whiteSpaces.map((r) => (
              <span key={`r${r.startKm}`} className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                White space km {r.startKm} to {r.endKm} ({r.lengthKm} km)
              </span>
            ))}
            {snap.amberStretches.map((r) => (
              <span key={`a${r.startKm}`} className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                Amber km {r.startKm} to {r.endKm}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Station table for the selected hour */}
      <div className="overflow-x-auto rounded-lg border border-line bg-panel shadow-2xs">
        <table className="w-full text-[11px]">
          <thead className="bg-panel2 text-left text-[10px] uppercase tracking-wider text-slate-600">
            <tr>
              {["Station", "km", "Gap before", "Installed", "EVs passing", "Stop to charge", "Served", "Turned away", "Utilization", "Guns free", "Daily found charger", "Guns needed"].map((h) => (
                <th key={h} className="px-2.5 py-2 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const h = d.hours[hour];
              return (
                <tr key={d.station.id} className="border-t border-line">
                  <td className="px-2.5 py-1.5 font-semibold text-slate-900">
                    {d.station.name}
                    <span className="ml-1 font-normal text-slate-500">{d.station.operator}</span>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono">{d.station.km}</td>
                  <td className={`px-2.5 py-1.5 font-mono ${d.upstreamGapKm > 60 ? "font-bold text-rose-700" : d.upstreamGapKm > 40 ? "text-amber-700" : ""}`}>
                    {d.upstreamGapKm} km
                  </td>
                  <td className="px-2.5 py-1.5 font-mono">
                    {d.station.guns} × {d.station.powerKw} kW
                  </td>
                  <td className="px-2.5 py-1.5 font-mono">{h.evsPassing}</td>
                  <td className="px-2.5 py-1.5 font-mono font-bold">{h.arrivals}</td>
                  <td className="px-2.5 py-1.5 font-mono text-emerald-700">{h.served}</td>
                  <td className={`px-2.5 py-1.5 font-mono ${h.turnedAway > 0 ? "font-bold text-rose-700" : "text-slate-400"}`}>{h.turnedAway}</td>
                  <td className="px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-14 overflow-hidden rounded bg-slate-200">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${h.utilizationPct}%`,
                            background: h.utilizationPct >= 90 ? STATUS_COLORS.red : h.utilizationPct >= 70 ? STATUS_COLORS.amber : STATUS_COLORS.green,
                          }}
                        />
                      </div>
                      <span className="font-mono">{h.utilizationPct}%</span>
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono">{h.gunsFree}</td>
                  <td className={`px-2.5 py-1.5 font-mono ${d.foundChargerPct < 90 ? "font-bold text-rose-700" : ""}`}>{d.foundChargerPct}%</td>
                  <td className="px-2.5 py-1.5 font-mono">
                    {d.requiredGuns}
                    {d.gunShortfall > 0 && <span className="ml-1 font-bold text-rose-700">(+{d.gunShortfall})</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Toll plaza capacity */}
      <div>
        <div className="mb-1.5 text-xs font-bold text-slate-900">
          Toll plaza catchment (15 km either side): current charging capacity against requirement
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {tollRows.map((r) => (
            <button
              key={r.tollId}
              onClick={() => onSelectToll?.(r.tollId)}
              className="rounded-lg border border-line bg-panel p-3 text-left shadow-2xs hover:border-copper"
            >
              <div className="text-[11px] font-bold text-slate-900">{r.tollName}</div>
              <div className="text-[10px] text-slate-500">
                km {r.km} · {r.dailyEvs.toLocaleString("en-IN")} EVs a day · peak {r.peakHourEvs}/h at {r.peakHourLabel.slice(0, 5)}
              </div>
              <div className="mt-2 flex items-baseline justify-between font-mono">
                <span className="text-base font-bold text-slate-950">{r.currentMw} MW</span>
                <span className="text-[10px] text-slate-500">of</span>
                <span className="text-base font-bold text-emerald-700">{r.requiredMw} MW</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-slate-200">
                <div
                  className="h-full"
                  style={{ width: `${Math.min(100, r.coveragePct)}%`, background: r.coveragePct >= 90 ? STATUS_COLORS.green : r.coveragePct >= 55 ? STATUS_COLORS.amber : STATUS_COLORS.red }}
                />
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-x-2 text-[10px] text-slate-600">
                <span>Guns: <strong className="text-slate-900">{r.currentGuns}</strong> of {r.requiredGuns}</span>
                <span>Gap: <strong className={r.gapMw > 0 ? "text-rose-700" : "text-emerald-700"}>{r.gapMw > 0 ? `${r.gapMw} MW` : "Covered"}</strong></span>
                <span>Peak utilization: <strong className="text-slate-900">{r.peakUtilizationPct}%</strong></span>
                <span>Off peak: <strong className="text-slate-900">{r.offPeakUtilizationPct}%</strong></span>
                <span className="col-span-2">Stopping at peak: <strong className="text-slate-900">{r.peakStopping} EVs/h</strong> · {r.stationsInCatchment.join(", ") || "zero stations"}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
