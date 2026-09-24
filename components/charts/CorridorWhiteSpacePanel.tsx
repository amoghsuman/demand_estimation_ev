"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Pause, Zap, Car, AlertTriangle, CheckCircle2, Clock, Radio } from "lucide-react";
import {
  ChainageCorridor,
  GREEN_MAX_KM,
  RED_MIN_KM,
  SIDES,
  SIDE_LABEL,
  SLOTS_PER_DAY,
  SLOTS_PER_HOUR,
  STATUS_COLORS,
  Side,
  UBC_SOURCE,
  UBC_STATUS_META,
  corridorSnapshot,
  segmentsForSlot,
  simulateCorridor,
  slotLabel,
  tollFlowAtSlot,
} from "@/lib/corridorChainage";
import { TOLL_PLAZAS } from "@/lib/tollAndGridData";

interface Props {
  corridor: ChainageCorridor;
  slot: number;
  onSlotChange: (slot: number) => void;
  onSelectToll?: (tollId: string) => void;
}

function Kpi({ label, value, sub, tone = "text-slate-950", icon }: { label: string; value: string; sub: string; tone?: string; icon: React.ReactNode }) {
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

export default function CorridorWhiteSpacePanel({ corridor, slot, onSlotChange, onSelectToll }: Props) {
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<{ side: Side; km: number } | null>(null);
  const [tableSide, setTableSide] = useState<Side | "both">("both");

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => onSlotChange((slot + 1) % SLOTS_PER_DAY), 350);
    return () => clearInterval(t);
  }, [playing, slot, onSlotChange]);

  const snap = useMemo(() => corridorSnapshot(corridor, slot), [corridor, slot]);
  const segs = useMemo(
    () => ({ NB: segmentsForSlot(corridor, slot, "NB"), SB: segmentsForSlot(corridor, slot, "SB") }),
    [corridor, slot]
  );
  const days = useMemo(() => simulateCorridor(corridor), [corridor]);

  const pct = (km: number) => `${(km / corridor.lengthKm) * 100}%`;
  const hovered = hover ? segs[hover.side].find((s) => hover.km >= s.startKm && hover.km < s.endKm) : null;
  const nextLabel = slotLabel((slot + 1) % SLOTS_PER_DAY);

  const tableRows = days
    .filter((d) => tableSide === "both" || d.station.side === tableSide)
    .sort((a, b) => (a.station.side === b.station.side ? a.station.km - b.station.km : a.station.side === "NB" ? -1 : 1));

  return (
    <div className="space-y-4">
      {/* Slot control */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel2 px-3 py-2.5">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play the day"}
        </button>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <Clock className="h-3.5 w-3.5 text-amber-700" />
          <span className="font-mono text-sm">
            {snap.label} to {nextLabel}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              snap.isPeak ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {snap.isPeak ? "Peak" : "Off peak"}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={SLOTS_PER_DAY - 1}
          value={slot}
          onChange={(e) => onSlotChange(Number(e.target.value))}
          className="flex-1 min-w-[180px] accent-amber-600"
          aria-label="15 minute slot of the day"
        />
        <span className="text-[10px] font-medium text-slate-600">96 slots of 15 min · drives the map and every number below</span>
      </div>

      {/* KPIs, trimmed to the four questions asked */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="EVs on corridor, this slot"
          value={`${snap.evsPerSlot.toLocaleString("en-IN")}`}
          sub={`${snap.sides.NB.evsPerSlot} ${SIDE_LABEL.NB.short} · ${snap.sides.SB.evsPerSlot} ${SIDE_LABEL.SB.short} · ≈ ${snap.evsPerHourEquivalent}/hr`}
          icon={<Car className="h-3.5 w-3.5 text-amber-600" />}
        />
        <Kpi
          label="Stopping to charge"
          value={`${snap.stopping} EVs`}
          sub={`${snap.sides.NB.stopping} on the left carriageway · ${snap.sides.SB.stopping} on the right`}
          icon={<Zap className="h-3.5 w-3.5 text-amber-600" />}
        />
        <Kpi
          label="Found a charger"
          value={`${snap.foundChargerPct}%`}
          sub={`${snap.served} served · ${snap.waiting} queued · ${snap.turnedAway} turned away · ${snap.stationsAvailable} of ${snap.stationsTotal} stations free`}
          tone={snap.foundChargerPct >= 95 ? "text-emerald-700" : snap.foundChargerPct >= 85 ? "text-amber-700" : "text-rose-700"}
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
        />
        <Kpi
          label="White spaces"
          value={`${snap.whiteSpaceCount} ${snap.whiteSpaceCount === 1 ? "stretch" : "stretches"} · ${snap.whiteSpaceKm} km`}
          sub={`${snap.sides.NB.whiteSpaces.length} ${SIDE_LABEL.NB.short} · ${snap.sides.SB.whiteSpaces.length} ${SIDE_LABEL.SB.short}`}
          tone={snap.whiteSpaceCount ? "text-rose-700" : "text-emerald-700"}
          icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
        />
      </div>

      {/* Two lane strip */}
      <div className="rounded-lg border border-line bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-900">
            {corridor.name}: charger presence by kilometre and carriageway ({corridor.lengthKm} km)
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium text-slate-700">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: STATUS_COLORS.green }} /> Chargers under {GREEN_MAX_KM} km apart, gun free</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: STATUS_COLORS.amber }} /> {GREEN_MAX_KM} to {RED_MIN_KM} km, or present but busy</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: STATUS_COLORS.red }} /> Over {RED_MIN_KM} km with zero chargers: white space</span>
            <span className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5">
              <Radio className="h-3 w-3 text-emerald-700" /> Live status source: {UBC_SOURCE.name} ({UBC_SOURCE.code}) · {UBC_SOURCE.note}
            </span>
          </div>
        </div>
        <div className="mt-1 text-[10px] text-slate-600">
          Station badges show free guns / total guns from the {UBC_SOURCE.code} feed. Left lane carries Delhi to Chandigarh traffic, right lane Chandigarh to Delhi, as driven on the road.
        </div>

        <div className="relative mt-3 space-y-1">
          {SIDES.map((side) => {
            const sideDays = days.filter((d) => d.station.side === side).sort((a, b) => a.station.km - b.station.km);
            return (
              <div key={side} className="relative">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-800">
                  <span className="rounded bg-slate-900 px-1.5 py-0.5 text-white">{side === "NB" ? "LEFT" : "RIGHT"}</span>
                  <span>{SIDE_LABEL[side].short} {side === "NB" ? "→" : "←"}</span>
                  <span className="font-medium text-slate-500">{SIDE_LABEL[side].road} · {sideDays.length} stations · same km axis, traffic runs {side === "NB" ? "left to right" : "right to left"}</span>
                </div>
                {/* station badges */}
                <div className="relative h-9">
                  {sideDays.map((d) => {
                    const h = d.slots[slot];
                    const color = UBC_STATUS_META[h.ubcStatus].color;
                    return (
                      <div
                        key={d.station.id}
                        className="absolute -translate-x-1/2"
                        style={{ left: pct(d.station.km), top: 0 }}
                        title={`${d.station.name} · km ${d.station.km} · ${d.station.guns} guns × ${d.station.powerKw} kW · ${UBC_STATUS_META[h.ubcStatus].label} · ${h.gunsFree} free · ${h.utilizationPct}% utilized`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="rounded px-1 font-mono text-[8px] font-bold text-white" style={{ background: color }}>
                            {h.gunsFree}/{d.station.guns}
                          </span>
                          <span className="h-3 w-px" style={{ background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* coloured lane */}
                <div className="flex h-5 w-full overflow-hidden rounded-sm border border-slate-300">
                  {segs[side].map((s) => (
                    <div
                      key={s.startKm}
                      className="h-full cursor-crosshair border-r border-white/40 transition-opacity hover:opacity-80"
                      style={{ width: pct(s.endKm - s.startKm), background: STATUS_COLORS[s.status] }}
                      onMouseEnter={() => setHover({ side, km: s.startKm })}
                      onMouseLeave={() => setHover(null)}
                    />
                  ))}
                </div>
                {/* flow arrows at tolls */}
                <div className="relative h-6">
                  {corridor.tolls.map((t) => {
                    const plaza = TOLL_PLAZAS.find((p) => p.id === t.tollId);
                    if (!plaza) return null;
                    const flow = tollFlowAtSlot(t.tollId, slot, side);
                    return (
                      <button
                        key={t.tollId}
                        onClick={() => onSelectToll?.(t.tollId)}
                        className="absolute top-0.5 flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white hover:bg-amber-700"
                        style={{ left: pct(t.km), transform: "translateX(-50%)" }}
                        title={`${plaza.name} · ${flow} EVs in this 15 min slot, ${SIDE_LABEL[side].long}`}
                      >
                        <span>{side === "NB" ? "→" : "←"}</span>
                        <span>{flow}</span>
                        <span className="font-medium text-slate-300">TOLL</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex justify-between text-[10px] font-semibold text-slate-600">
            <span>km 0 · Delhi</span>
            <span>km {corridor.lengthKm} · Chandigarh</span>
          </div>
        </div>

        <div className="mt-2 min-h-[18px] text-[11px] text-slate-800">
          {hovered ? (
            <span>
              <strong>{SIDE_LABEL[hovered.side].short}, km {hovered.startKm} to {hovered.endKm}:</strong> {hovered.reason} · {hovered.evsPassing} EVs passing this slot
            </span>
          ) : (
            <span className="text-slate-500">Hover a lane to see why a stretch is green, amber or red. Toll tags show EVs per 15 minutes by direction.</span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SIDES.flatMap((side) => [
            ...snap.sides[side].whiteSpaces.map((r) => (
              <span key={`${side}-r-${r.startKm}`} className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-900">
                {SIDE_LABEL[side].short}: white space km {r.startKm} to {r.endKm} ({r.lengthKm} km)
              </span>
            )),
            ...snap.sides[side].amberStretches.map((r) => (
              <span key={`${side}-a-${r.startKm}`} className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                {SIDE_LABEL[side].short}: amber km {r.startKm} to {r.endKm}
              </span>
            )),
          ])}
        </div>
      </div>

      {/* Station table, trimmed */}
      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
          <span className="text-xs font-bold text-slate-900">Stations at {snap.label}: presence, live status and who found a charger</span>
          <div className="flex items-center gap-1 text-[10px] font-semibold">
            {(["both", "NB", "SB"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTableSide(k)}
                className={`rounded px-2 py-0.5 ${tableSide === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {k === "both" ? "Both sides" : SIDE_LABEL[k].short}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-2.5 py-1.5">Station</th>
                <th className="px-2.5 py-1.5">Side</th>
                <th className="px-2.5 py-1.5">km</th>
                <th className="px-2.5 py-1.5">Gap behind</th>
                <th className="px-2.5 py-1.5">{UBC_SOURCE.code} status</th>
                <th className="px-2.5 py-1.5">Guns free</th>
                <th className="px-2.5 py-1.5">EVs passing</th>
                <th className="px-2.5 py-1.5">Stop to charge</th>
                <th className="px-2.5 py-1.5">Turned away</th>
                <th className="px-2.5 py-1.5">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((d) => {
                const h = d.slots[slot];
                const meta = UBC_STATUS_META[h.ubcStatus];
                return (
                  <tr key={d.station.id} className="border-t border-line hover:bg-slate-50">
                    <td className="px-2.5 py-1.5 font-semibold text-slate-900">{d.station.name}</td>
                    <td className="px-2.5 py-1.5 text-slate-700">{d.station.side === "NB" ? "Left · D→C" : "Right · C→D"}</td>
                    <td className="px-2.5 py-1.5 font-mono">{d.station.km}</td>
                    <td className={`px-2.5 py-1.5 font-mono ${d.upstreamGapKm > RED_MIN_KM ? "font-bold text-rose-700" : d.upstreamGapKm >= GREEN_MAX_KM ? "text-amber-700" : ""}`}>{d.upstreamGapKm} km</td>
                    <td className="px-2.5 py-1.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: meta.color }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 font-mono">{h.gunsFree} / {d.station.guns}</td>
                    <td className="px-2.5 py-1.5 font-mono">{h.evsPassing}</td>
                    <td className="px-2.5 py-1.5 font-mono">{Math.round(h.arrivals)}</td>
                    <td className={`px-2.5 py-1.5 font-mono ${h.turnedAway >= 0.5 ? "font-bold text-rose-700" : "text-slate-400"}`}>{Math.round(h.turnedAway)}</td>
                    <td className="px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 overflow-hidden rounded bg-slate-200">
                          <div className="h-full" style={{ width: `${h.utilizationPct}%`, background: h.utilizationPct >= 90 ? STATUS_COLORS.amber : STATUS_COLORS.green }} />
                        </div>
                        <span className="font-mono">{h.utilizationPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
