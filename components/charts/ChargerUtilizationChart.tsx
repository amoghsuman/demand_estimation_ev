"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import {
  NETWORK_CHARGER_UTILIZATIONS,
  HOURLY_UTILIZATION_CURVES,
  getChargerUtilizationsForPoint,
} from "@/lib/tollAndGridData";
import { ChargerTypeUtilization, DataPoint } from "@/lib/types";
import { Zap, Clock, AlertTriangle, CheckCircle, Hourglass, BatteryCharging } from "lucide-react";

interface Props {
  customUtilizations?: ChargerTypeUtilization[];
  siteName?: string;
  locationPoint?: DataPoint | null;
}

export default function ChargerUtilizationChart({
  customUtilizations,
  siteName,
  locationPoint,
}: Props) {
  const [viewMode, setViewMode] = useState<"overview" | "hourly" | "dwell">("overview");

  const effectiveSiteName = siteName || (locationPoint ? locationPoint.name : undefined);
  const utilizations =
    customUtilizations ||
    (locationPoint ? getChargerUtilizationsForPoint(locationPoint) : NETWORK_CHARGER_UTILIZATIONS);

  return (
    <div className="space-y-3.5">
      {/* View Switcher & Context Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <span className="font-bold text-slate-900">Telemetry View:</span>
          {[
            { key: "overview" as const, label: "Utilization Rates & Status" },
            { key: "hourly" as const, label: "24-Hour Utilization Curves" },
            { key: "dwell" as const, label: "Dwell Time & Queue Delays" },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setViewMode(btn.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === btn.key
                  ? "bg-slate-900 text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-950 border border-amber-300">
            {effectiveSiteName ? `Site: ${effectiveSiteName}` : "National Network Benchmarks"}
          </span>
        </div>
      </div>

      {/* OVERVIEW VIEW */}
      {viewMode === "overview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {utilizations.map((cu) => {
              const isOvercapacity = cu.status === "overcapacity";
              const isUnderutilized = cu.status === "underutilized";

              return (
                <div
                  key={cu.chargerType}
                  className="rounded-lg border border-line bg-panel p-3 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-950">{cu.chargerType}</div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        {cu.connector} · {cu.powerKw} kW Rating
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOvercapacity
                          ? "bg-rose-100 text-rose-900 border border-rose-300"
                          : isUnderutilized
                          ? "bg-slate-100 text-slate-700 border border-slate-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {isOvercapacity ? (
                        <>
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          Bottleneck (&gt;75%)
                        </>
                      ) : isUnderutilized ? (
                        <>
                          <Hourglass className="h-3 w-3 text-slate-500" />
                          Low Usage (&lt;35%)
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          Optimal Band
                        </>
                      )}
                    </span>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-700">Average Daily Utilization</span>
                      <span className="font-mono font-bold text-slate-950">{cu.avgUtilizationPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOvercapacity
                            ? "bg-rose-600"
                            : isUnderutilized
                            ? "bg-slate-400"
                            : "bg-emerald-600"
                        }`}
                        style={{ width: `${Math.min(100, cu.avgUtilizationPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Micro stats grid */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 text-[10px]">
                    <div>
                      <span className="text-slate-500">Peak Surge:</span>{" "}
                      <strong className="text-slate-900 font-mono">{cu.peakUtilizationPct}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Sessions/Gun:</span>{" "}
                      <strong className="text-slate-900 font-mono">{cu.avgSessionsPerDayPerGun}/day</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Avg Dwell:</span>{" "}
                      <strong className="text-slate-900 font-mono">{cu.avgDwellMinutes} min</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Queue Wait:</span>{" "}
                      <strong className={cu.avgQueueWaitMinutes > 10 ? "text-rose-700 font-mono font-bold" : "text-slate-900 font-mono"}>
                        {cu.avgQueueWaitMinutes} min
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 flex items-center justify-between">
            <span>
              💡 <strong>Industry Rule of Thumb:</strong> DC Fast chargers with &gt;70% average daily utilization suffer peak queues exceeding 15 minutes, signaling an immediate need for supplementary gun expansion.
            </span>
          </div>
        </div>
      )}

      {/* HOURLY CURVES VIEW */}
      {viewMode === "hourly" && (
        <div className="rounded-lg border border-line bg-panel p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
            <span>24-Hour Diurnal Utilization Profiles (% Plug-in Occupancy)</span>
            <span className="text-[11px] font-medium text-slate-600">Peak hours 17:00 – 21:00</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={HOURLY_UTILIZATION_CURVES} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={10} interval={1} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} unit="%" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-slate-300 bg-white p-2.5 text-xs shadow-md">
                        <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5">
                          Time: {data.timeLabel}
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="text-red-700 flex justify-between gap-3">
                            <span>120 kW Dual DC:</span> <strong>{data.dc120kW}%</strong>
                          </div>
                          <div className="text-amber-700 flex justify-between gap-3">
                            <span>240 kW Ultra DC:</span> <strong>{data.dc240kW}%</strong>
                          </div>
                          <div className="text-emerald-700 flex justify-between gap-3">
                            <span>60 kW Fast DC:</span> <strong>{data.dc60kW}%</strong>
                          </div>
                          <div className="text-sky-700 flex justify-between gap-3">
                            <span>22 kW Type-2 AC:</span> <strong>{data.ac22kW}%</strong>
                          </div>
                          <div className="text-indigo-700 flex justify-between gap-3">
                            <span>Slow AC (Overnight):</span> <strong>{data.acSlow}%</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  formatter={(val) => {
                    const map: Record<string, string> = {
                      dc120kW: "120 kW Dual DC",
                      dc240kW: "240 kW Ultra DC",
                      dc60kW: "60 kW Fast DC",
                      ac22kW: "22 kW Type-2 AC",
                      acSlow: "Slow AC (Overnight)",
                    };
                    return map[val] || val;
                  }}
                />
                <Line type="monotone" dataKey="dc120kW" stroke="#dc2626" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="dc240kW" stroke="#b45309" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="dc60kW" stroke="#047857" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ac22kW" stroke="#0284c7" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="acSlow" stroke="#4f46e5" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* DWELL & QUEUE DELAYS VIEW */}
      {viewMode === "dwell" && (
        <div className="rounded-lg border border-line bg-panel p-3.5 shadow-2xs space-y-3">
          <div className="text-xs font-bold text-slate-900">
            Average Session Duration (Dwell Time) vs. Peak Queue Delays
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={utilizations.map((u) => ({
                  name: u.chargerType.replace(" Charger", ""),
                  dwellMinutes: u.avgDwellMinutes,
                  queueMinutes: u.avgQueueWaitMinutes,
                  energyDispensed: u.avgEnergyDispensedKwhPerDay,
                }))}
                margin={{ top: 8, right: 12, left: -10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="m" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-slate-300 bg-white p-2.5 text-xs shadow-md">
                        <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">
                          {d.name}
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="text-slate-900 flex justify-between gap-4">
                            <span>Average Dwell:</span> <strong>{d.dwellMinutes} mins</strong>
                          </div>
                          <div className="text-rose-700 flex justify-between gap-4">
                            <span>Peak Queue Delay:</span> <strong>{d.queueMinutes} mins</strong>
                          </div>
                          <div className="text-emerald-700 flex justify-between gap-4">
                            <span>Daily Energy Dispensed:</span> <strong>{d.energyDispensed} kWh/gun</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="dwellMinutes" fill="#047857" name="Avg Dwell (min)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="queueMinutes" fill="#dc2626" name="Peak Queue (min)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
