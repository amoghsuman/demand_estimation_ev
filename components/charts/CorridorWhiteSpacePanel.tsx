"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Pause } from "lucide-react";
import {
  ChainageCorridor,
  GREEN_MAX_KM,
  RED_MIN_KM,
  SIDES,
  SIDE_LABEL,
  SLOTS_PER_DAY,
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

const ASPHALT = "#1F2A37";
export const CORRIDOR_CARD = "rounded-lg border border-line bg-white overflow-hidden";
export const CORRIDOR_CARD_HEAD = "flex items-center justify-between gap-3 border-b border-line px-4 py-2.5";

// Short plaza names for tags on the strip and the map.
export function tollShortName(tollId: string): string {
  const name = TOLL_PLAZAS.find((t) => t.id === tollId)?.name ?? tollId;
  return name.replace(/ Toll Plaza.*$/i, "").replace(/\s*\(.*\)/, "").trim().split(" ")[0];
}

// Peak slots: flow at or above 85% of the daily maximum, used to shade the timeline.
function usePeakSlots(corridor: ChainageCorridor): boolean[] {
  return useMemo(() => Array.from({ length: SLOTS_PER_DAY }, (_, t) => corridorSnapshot(corridor, t).isPeak), [corridor]);
}

/* ---------------- Time bar ---------------- */
export function CorridorTimeBar({ corridor, slot, onSlotChange }: { corridor: ChainageCorridor; slot: number; onSlotChange: (s: number) => void }) {
  const [playing, setPlaying] = useState(false);
  const peaks = usePeakSlots(corridor);
  const snap = useMemo(() => corridorSnapshot(corridor, slot), [corridor, slot]);
  const peakSlot = useMemo(() => {
    let best = 0;
    for (let t = 0; t < SLOTS_PER_DAY; t++) if (corridorSnapshot(corridor, t).evsPerSlot > corridorSnapshot(corridor, best).evsPerSlot) best = t;
    return best;
  }, [corridor]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => onSlotChange((slot + 1) % SLOTS_PER_DAY), 300);
    return () => clearInterval(t);
  }, [playing, slot, onSlotChange]);

  // Group consecutive peak slots into bands for the timeline background.
  const bands: { start: number; end: number }[] = [];
  peaks.forEach((p, i) => {
    if (!p) return;
    const last = bands[bands.length - 1];
    if (last && last.end === i) last.end = i + 1;
    else bands.push({ start: i, end: i + 1 });
  });
  const pct = (t: number) => `${(t / SLOTS_PER_DAY) * 100}%`;

  return (
    <div className="grid items-center gap-5 px-5 py-3 text-white" style={{ background: ASPHALT, gridTemplateColumns: "auto auto 1fr auto" }}>
      <div>
        <div className="font-display text-[17px] font-medium leading-tight">{corridor.name.replace(" – ", " to ").replace(/\s*\(NH44\)/, ", NH44")}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          {corridor.lengthKm} km · {corridor.stations.length} charging stations · {corridor.tolls.length} toll plazas
        </div>
      </div>
      <div className="flex items-baseline gap-2 border-l border-slate-600 pl-5">
        <span className="font-mono text-[26px] font-semibold leading-none tracking-tight">{snap.label}</span>
        <span className="text-[11px] text-slate-400">to {slotLabel((slot + 1) % SLOTS_PER_DAY)}</span>
        <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${snap.isPeak ? "bg-[#B43424]" : "bg-slate-600"}`}>{snap.isPeak ? "Peak" : "Off peak"}</span>
      </div>
      <div className="relative h-10">
        <div className="absolute left-0 right-0 top-[15px] h-1 rounded bg-slate-600" />
        {bands.map((b) => (
          <div key={b.start} className="absolute top-[15px] h-1 rounded bg-[#6B4A2A]" style={{ left: pct(b.start), width: pct(b.end - b.start) }} />
        ))}
        <div className="absolute left-0 top-[15px] h-1 rounded bg-copper" style={{ width: pct(slot) }} />
        <input
          type="range"
          min={0}
          max={SLOTS_PER_DAY - 1}
          value={slot}
          onChange={(e) => onSlotChange(Number(e.target.value))}
          aria-label="15 minute slot of the day"
          className="corridor-range absolute left-0 right-0 top-0 h-9 w-full cursor-pointer appearance-none bg-transparent"
        />
        <div className="pointer-events-none absolute left-0 right-0 top-[27px] flex justify-between text-[10px] text-slate-400">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setPlaying((p) => !p)} className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100">
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Pause" : "Play the day"}
        </button>
        <button onClick={() => { setPlaying(false); onSlotChange(peakSlot); }} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700">
          Jump to peak
        </button>
      </div>
      <style jsx global>{`
        .corridor-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid #C9A227; margin-top: -1px; }
        .corridor-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid #C9A227; }
        .corridor-range::-webkit-slider-runnable-track { height: 4px; background: transparent; margin-top: 15px; }
        .corridor-range::-moz-range-track { height: 4px; background: transparent; }
      `}</style>
    </div>
  );
}

/* ---------------- Readout band ---------------- */
function Dir({ side, value }: { side: Side; value: number | string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <b className="font-bold">{side === "NB" ? "↑" : "↓"}</b>
      {value}
    </span>
  );
}

export function CorridorReadout({ corridor, slot }: { corridor: ChainageCorridor; slot: number }) {
  const snap = useMemo(() => corridorSnapshot(corridor, slot), [corridor, slot]);
  const cells = [
    {
      k: "EVs on the corridor this slot",
      v: snap.evsPerSlot.toLocaleString("en-IN"),
      tone: "",
      s: (
        <>
          <Dir side="NB" value={`${snap.sides.NB.evsPerSlot} to Chandigarh`} /> &nbsp; <Dir side="SB" value={`${snap.sides.SB.evsPerSlot} to Delhi`} />
          <span className="text-slate-500"> · about {snap.evsPerHourEquivalent.toLocaleString("en-IN")} an hour</span>
        </>
      ),
    },
    {
      k: "Stopping to charge",
      v: String(snap.stopping),
      tone: "",
      s: (
        <>
          <Dir side="NB" value={snap.sides.NB.stopping} /> &nbsp; <Dir side="SB" value={snap.sides.SB.stopping} />
          <span className="text-slate-500"> · EVs pulling into any station in this slot</span>
        </>
      ),
    },
    {
      k: "Found a charger",
      v: `${snap.foundChargerPct}%`,
      tone: snap.foundChargerPct >= 95 ? "text-[#2C6E52]" : snap.foundChargerPct >= 85 ? "text-[#D98A1B]" : "text-[#B43424]",
      s: (
        <>
          {snap.served} served · {snap.waiting} queued · <b className={snap.turnedAway ? "text-[#B43424]" : ""}>{snap.turnedAway} turned away</b>
        </>
      ),
    },
    {
      k: "White spaces",
      v: (
        <>
          {snap.whiteSpaceCount} <small className="text-sm font-medium text-slate-500">· {snap.whiteSpaceKm} km</small>
        </>
      ),
      tone: snap.whiteSpaceCount ? "text-[#B43424]" : "text-[#2C6E52]",
      s: (
        <>
          {snap.sides.NB.whiteSpaces.length} to Chandigarh, {snap.sides.SB.whiteSpaces.length} to Delhi; stretches over {RED_MIN_KM} km with no charger
        </>
      ),
    },
  ];
  return (
    <div className={`${CORRIDOR_CARD} grid grid-cols-2 lg:grid-cols-4`}>
      {cells.map((c, i) => (
        <div key={c.k} className={`px-4 py-3 ${i < cells.length - 1 ? "border-r border-line" : ""}`}>
          <div className="text-[11px] font-medium text-slate-500">{c.k}</div>
          <div className={`mt-0.5 font-mono text-[26px] font-semibold leading-tight tracking-tight ${c.tone}`}>{c.v}</div>
          <div className="mt-1 text-[11px] text-slate-700">{c.s}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Kilometre strip ---------------- */
export function CorridorStrip({ corridor, slot, onSelectToll }: { corridor: ChainageCorridor; slot: number; onSelectToll?: (tollId: string) => void }) {
  const [hover, setHover] = useState<{ side: Side; km: number } | null>(null);
  const snap = useMemo(() => corridorSnapshot(corridor, slot), [corridor, slot]);
  const segs = useMemo(() => ({ NB: segmentsForSlot(corridor, slot, "NB"), SB: segmentsForSlot(corridor, slot, "SB") }), [corridor, slot]);
  const days = useMemo(() => simulateCorridor(corridor), [corridor]);
  const pct = (km: number) => `${(km / corridor.lengthKm) * 100}%`;
  const hovered = hover ? segs[hover.side].find((s) => hover.km >= s.startKm && hover.km < s.endKm) : null;

  return (
    <div className={`${CORRIDOR_CARD} flex-1 overflow-auto`}>
      <div className="px-4 pt-3.5">
        <div className="font-display text-base font-medium text-slate-900">Charger presence by kilometre</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-5 rounded-sm" style={{ background: STATUS_COLORS.green }} />under {GREEN_MAX_KM} km apart, gun free</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-5 rounded-sm" style={{ background: STATUS_COLORS.amber }} />{GREEN_MAX_KM} to {RED_MIN_KM} km, or all guns busy</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-5 rounded-sm" style={{ background: STATUS_COLORS.red }} />over {RED_MIN_KM} km with no charger</span>
          <span className="ml-auto">Badges: free guns / total guns, {UBC_SOURCE.code} feed</span>
        </div>
      </div>

      <div className="px-4 pb-3 pt-4">
        {SIDES.map((side) => {
          const sideDays = days.filter((d) => d.station.side === side).sort((a, b) => a.station.km - b.station.km);
          return (
            <div key={side} className="mb-4">
              <div className="mb-1.5 flex items-baseline gap-2.5">
                <span className="text-base font-bold leading-none" style={{ color: ASPHALT }}>{side === "NB" ? "→" : "←"}</span>
                <b className="text-[13px] text-slate-900">{side === "NB" ? "Left carriageway" : "Right carriageway"}</b>
                <span className="text-[11px] text-slate-500">
                  {SIDE_LABEL[side].long}, {sideDays.length} stations, traffic runs {side === "NB" ? "left to right" : "right to left"}
                </span>
              </div>
              <div className="relative h-[46px]">
                {sideDays.map((d, i) => {
                  const h = d.slots[slot];
                  const color = UBC_STATUS_META[h.ubcStatus].color;
                  const low = i % 2 === 1;
                  return (
                    <div
                      key={d.station.id}
                      className="absolute flex -translate-x-1/2 flex-col items-center"
                      style={{ left: pct(d.station.km), top: low ? 20 : 0 }}
                      title={`${d.station.name} · km ${d.station.km} · ${d.station.guns} guns × ${d.station.powerKw} kW · ${UBC_STATUS_META[h.ubcStatus].label} · ${h.gunsFree} free · ${h.utilizationPct}% utilised`}
                    >
                      <span className="rounded px-[5px] py-[2px] font-mono text-[10.5px] font-bold leading-[1.4] text-white ring-[1.5px] ring-white" style={{ background: color }}>
                        {h.gunsFree}/{d.station.guns}
                      </span>
                      <span className="w-px" style={{ background: color, height: low ? 8 : 28 }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex h-[18px] w-full overflow-hidden rounded-[3px] border border-[#C9C4B8]">
                {segs[side].map((s) => (
                  <div
                    key={s.startKm}
                    className="h-full cursor-crosshair border-r border-white/35 hover:opacity-80"
                    style={{ width: pct(s.endKm - s.startKm), background: STATUS_COLORS[s.status] }}
                    onMouseEnter={() => setHover({ side, km: s.startKm })}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </div>
              <div className="relative h-[26px]">
                {corridor.tolls.map((t) => (
                  <button
                    key={t.tollId}
                    onClick={() => onSelectToll?.(t.tollId)}
                    className="absolute top-[5px] -translate-x-1/2 whitespace-nowrap rounded-[3px] px-2 py-[3px] text-[11px] font-semibold text-white hover:bg-copperSoft"
                    style={{ left: pct(t.km), background: ASPHALT }}
                    title={`${tollShortName(t.tollId)}: ${tollFlowAtSlot(t.tollId, slot, side)} EVs in this 15 min slot, ${SIDE_LABEL[side].long}`}
                  >
                    {side === "NB" ? "↑" : "↓"} {tollFlowAtSlot(t.tollId, slot, side)} <span className="font-medium text-slate-400">{tollShortName(t.tollId)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex justify-between text-[11px] text-slate-500">
          <span>km 0 · Delhi</span><span>km 60</span><span>km 120</span><span>km 180</span><span>km {corridor.lengthKm} · Chandigarh</span>
        </div>

        <div className="mt-2 min-h-[18px] text-[11px] text-slate-700">
          {hovered ? (
            <span>
              <b>{SIDE_LABEL[hovered.side].short}, km {hovered.startKm} to {hovered.endKm}:</b> {hovered.reason} · {hovered.evsPassing} EVs passing this slot
            </span>
          ) : (
            <span className="text-slate-500">Hover a lane to see why a stretch is green, amber or red.</span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {SIDES.flatMap((side) => [
            ...snap.sides[side].whiteSpaces.map((r) => (
              <span key={`${side}-r-${r.startKm}`} className="rounded border border-[#E7C4BE] bg-[#FBF1EF] px-2 py-[3px] text-[11px] font-semibold text-[#B43424]">
                {side === "NB" ? "To Chandigarh" : "To Delhi"}: no charger km {r.startKm} to {r.endKm} ({r.lengthKm} km)
              </span>
            )),
            ...snap.sides[side].amberStretches.filter((r) => r.lengthKm >= 15).map((r) => (
              <span key={`${side}-a-${r.startKm}`} className="rounded border border-[#EBD3AE] bg-[#FBF4E8] px-2 py-[3px] text-[11px] font-semibold text-[#8A5A12]">
                {side === "NB" ? "To Chandigarh" : "To Delhi"}: stretched km {r.startKm} to {r.endKm}
              </span>
            )),
          ])}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Station table ---------------- */
export function CorridorStationTable({ corridor, slot }: { corridor: ChainageCorridor; slot: number }) {
  const [tableSide, setTableSide] = useState<Side | "both">("both");
  const days = useMemo(() => simulateCorridor(corridor), [corridor]);
  const rows = days
    .filter((d) => tableSide === "both" || d.station.side === tableSide)
    .sort((a, b) => (a.station.side === b.station.side ? a.station.km - b.station.km : a.station.side === "NB" ? -1 : 1));

  return (
    <div className={CORRIDOR_CARD}>
      <div className={CORRIDOR_CARD_HEAD}>
        <b className="font-display text-[15px] font-medium text-slate-900">Stations at {slotLabel(slot)}</b>
        <div className="flex gap-0.5 rounded-md bg-panel2 p-0.5 text-[11px] font-semibold">
          {(["both", "NB", "SB"] as const).map((k) => (
            <button key={k} onClick={() => setTableSide(k)} className={`rounded px-2.5 py-1 ${tableSide === k ? "text-white" : "text-slate-700 hover:bg-white"}`} style={tableSide === k ? { background: ASPHALT } : undefined}>
              {k === "both" ? "Both" : k === "NB" ? "To Chandigarh" : "To Delhi"}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[440px] overflow-auto">
        <table className="w-full text-[11.5px]">
          <thead className="sticky top-0 bg-white text-left text-[11px] font-medium text-slate-500">
            <tr className="border-b border-line">
              <th className="px-3 py-2">Station</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2 text-right">km</th>
              <th className="px-3 py-2 text-right">Gap behind</th>
              <th className="px-3 py-2">{UBC_SOURCE.code} status</th>
              <th className="px-3 py-2 text-right">Guns free</th>
              <th className="px-3 py-2 text-right">Passing</th>
              <th className="px-3 py-2 text-right">Stop</th>
              <th className="px-3 py-2 text-right">Turned away</th>
              <th className="px-3 py-2">Utilisation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const h = d.slots[slot];
              const meta = UBC_STATUS_META[h.ubcStatus];
              return (
                <tr key={d.station.id} className="border-b border-[#EFECE5] hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-1.5 font-semibold text-slate-900">{d.station.name}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-700">{d.station.side === "NB" ? "→ Chd" : "← Del"}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{d.station.km}</td>
                  <td className={`px-3 py-1.5 text-right font-mono ${d.upstreamGapKm > RED_MIN_KM ? "font-bold text-[#B43424]" : d.upstreamGapKm >= GREEN_MAX_KM ? "text-[#8A5A12]" : ""}`}>{d.upstreamGapKm} km</td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold" style={{ color: meta.color }}>
                      <i className="h-[7px] w-[7px] rounded-full" style={{ background: meta.color }} />{meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{h.gunsFree} / {d.station.guns}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{h.evsPassing}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{Math.round(h.arrivals)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono ${h.turnedAway >= 0.5 ? "font-bold text-[#B43424]" : "text-slate-400"}`}>{Math.round(h.turnedAway)}</td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <b className="inline-block h-[5px] w-12 overflow-hidden rounded bg-[#E6E2D9]">
                        <span className="block h-full" style={{ width: `${h.utilizationPct}%`, background: h.ubcStatus === "offline" ? "#8A8F98" : h.utilizationPct >= 90 ? STATUS_COLORS.amber : STATUS_COLORS.green }} />
                      </b>
                      <span className="font-mono">{h.ubcStatus === "offline" ? "—" : `${h.utilizationPct}%`}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 text-[11px] text-slate-500">Gap behind is measured in the direction of travel on the same carriageway.</div>
    </div>
  );
}

/* Legend and chips for the map card overlay */
export function CorridorMapChips({ slot }: { slot: number }) {
  return (
    <>
      <div className="absolute left-3 top-3 z-[500] rounded-md border border-line bg-white/95 px-2.5 py-1.5 text-[11px] shadow-sm">
        <b>Toll tags</b> <span className="text-slate-500">EVs in the {slotLabel(slot)} slot, by direction</span>
      </div>
      <div className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-md border border-line bg-white/95 px-2.5 py-1.5 text-[11px] text-slate-700 shadow-sm">
        <i className="inline-block h-[7px] w-[7px] rounded-full bg-[#2C6E52] ring-[3px] ring-[#2C6E52]/20" />
        Live status: {UBC_SOURCE.name} ({UBC_SOURCE.code})
      </div>
      <div className="absolute bottom-3 left-3 z-[500] grid gap-1 rounded-md border border-line bg-white/95 px-2.5 py-2 text-[11px] text-slate-700 shadow-sm">
        <div className="flex items-center gap-2"><b className="w-[52px] text-slate-900">Ribbons</b>left lane to Chandigarh, right lane to Delhi</div>
        <div className="flex items-center gap-2"><b className="w-[52px]" /><i className="inline-block h-1.5 w-5 rounded-sm" style={{ background: STATUS_COLORS.green }} />chargers under {GREEN_MAX_KM} km, gun free</div>
        <div className="flex items-center gap-2"><b className="w-[52px]" /><i className="inline-block h-1.5 w-5 rounded-sm" style={{ background: STATUS_COLORS.amber }} />{GREEN_MAX_KM} to {RED_MIN_KM} km, or all guns busy</div>
        <div className="flex items-center gap-2"><b className="w-[52px]" /><i className="inline-block h-1.5 w-5 rounded-sm" style={{ background: STATUS_COLORS.red }} />over {RED_MIN_KM} km with no charger</div>
        <div className="flex items-center gap-2"><b className="w-[52px] text-slate-900">Pins</b>free guns / total
          <i className="inline-block h-3.5 w-3.5 rounded-[3px] ring-2 ring-white" style={{ background: UBC_STATUS_META.available.color }} />free
          <i className="inline-block h-3.5 w-3.5 rounded-[3px] ring-2 ring-white" style={{ background: UBC_STATUS_META.busy.color }} />busy
          <i className="inline-block h-3.5 w-3.5 rounded-[3px] ring-2 ring-white" style={{ background: UBC_STATUS_META.offline.color }} />offline
        </div>
      </div>
    </>
  );
}
