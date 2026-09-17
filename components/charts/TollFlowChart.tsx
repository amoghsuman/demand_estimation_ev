"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { TollPlaza } from "@/lib/types";
import { TOLL_PLAZAS } from "@/lib/tollAndGridData";
import { ShieldAlert, Zap, Clock, TrendingUp, Car, Truck, ChevronDown } from "lucide-react";

interface TollFlowChartProps {
  tollId?: string;
  initialTollId?: string;
  onSelectToll?: (toll: TollPlaza) => void;
}

export default function TollFlowChart({
  tollId,
  initialTollId,
  onSelectToll,
}: TollFlowChartProps) {
  const [selectedTollId, setSelectedTollId] = useState<string>(
    tollId || initialTollId || TOLL_PLAZAS[0].id
  );
  const [segmentFilter, setSegmentFilter] = useState<"total" | "fourWheeler" | "fleetCommercial" | "evBusesTrucks">("total");

  // Keep internal state in sync if parent changes tollId
  const activeTollId = tollId || selectedTollId;

  const currentToll = useMemo(() => {
    return TOLL_PLAZAS.find((t) => t.id === activeTollId) || TOLL_PLAZAS[0];
  }, [activeTollId]);

  // Chart data formatted for recharts
  const chartData = useMemo(() => {
    return currentToll.hourlyFlow.map((h) => ({
      hour: h.hour,
      timeLabel: h.timeLabel,
      totalEvs: h.totalEvs,
      fourWheeler: h.fourWheeler,
      fleetCommercial: h.fleetCommercial,
      evBusesTrucks: h.evBusesTrucks,
      displayValue:
        segmentFilter === "total"
          ? h.totalEvs
          : segmentFilter === "fourWheeler"
          ? h.fourWheeler
          : segmentFilter === "fleetCommercial"
          ? h.fleetCommercial
          : h.evBusesTrucks,
      totalVehiclesAllFuel: h.totalVehiclesAllFuel,
      evSharePct: h.evSharePct,
      isPeak: h.hour === currentToll.peakHour,
    }));
  }, [currentToll, segmentFilter]);

  const maxVal = Math.max(...chartData.map((d) => d.displayValue), 1);

  return (
    <div className="space-y-4">
      {/* Top Selector & Corridor Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">Select Toll Plaza:</span>
          <div className="relative inline-block">
            <select
              id="toll-plaza-select"
              value={selectedTollId}
              onChange={(e) => {
                setSelectedTollId(e.target.value);
                const found = TOLL_PLAZAS.find((t) => t.id === e.target.value);
                if (found && onSelectToll) onSelectToll(found);
              }}
              className="appearance-none rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-bold text-slate-950 shadow-2xs hover:border-slate-400 focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/40 transition-colors cursor-pointer"
            >
              {TOLL_PLAZAS.map((toll) => (
                <option key={toll.id} value={toll.id}>
                  {toll.name} ({toll.highwayCode} · {toll.state})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
          </div>
          <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800">
            {currentToll.corridorName}
          </span>
        </div>

        {/* Vehicle Segment View Toggle */}
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <span className="font-bold text-slate-900">Segment:</span>
          {[
            { key: "total" as const, label: "All EVs" },
            { key: "fourWheeler" as const, label: "4W Private/Cabs" },
            { key: "fleetCommercial" as const, label: "Light Commercial/3W" },
            { key: "evBusesTrucks" as const, label: "E-Buses & Trucks" },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setSegmentFilter(btn.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                segmentFilter === btn.key
                  ? "bg-slate-900 text-white font-bold shadow-2xs"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>Daily EV Crossings</span>
            <Zap className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-950">
            {currentToll.totalDailyEvs.toLocaleString("en-IN")} EVs
          </div>
          <div className="mt-0.5 text-[10px] font-medium text-slate-600">
            {currentToll.evSharePct}% of {currentToll.totalDailyVehicles.toLocaleString("en-IN")} total traffic
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>Peak Hourly Surge</span>
            <Clock className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-rose-700">
            {currentToll.peakHourEvVolume} EVs / hr
          </div>
          <div className="mt-0.5 text-[10px] font-medium text-slate-600">
            Peak window: {currentToll.peakHourTimeLabel}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>Recommended Capacity</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-700">
            {currentToll.recommendedTollChargerCapacityMw} MW Hub
          </div>
          <div className="mt-0.5 text-[10px] font-medium text-slate-600">
            Supports 15% transit top-up buffer
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-3 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>FASTag Infrastructure</span>
            <ShieldAlert className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-950">
            {currentToll.fastTagLanes} Lanes
          </div>
          <div className="mt-0.5 text-[10px] font-medium text-slate-600">
            {currentToll.dedicatedEvFastChargeLanes
              ? "Dedicated EV Fast-Charging Lane Active"
              : "Standard FASTag Shared Lanes"}
          </div>
        </div>
      </div>

      {/* 24-Hour Hourly Bar Chart */}
      <div className="rounded-lg border border-line bg-panel p-3.5 shadow-2xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900">
            24-Hour Diurnal EV Traffic Distribution (00:00 to 23:00)
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="h-2.5 w-2.5 rounded bg-copper" /> Normal Transit Flow
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="h-2.5 w-2.5 rounded bg-rose-600" /> Peak Hour Window
            </span>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                interval={1}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                domain={[0, Math.ceil(maxVal * 1.15)]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-slate-300 bg-white p-2.5 text-xs shadow-md">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between gap-3">
                        <span>Hour: {data.timeLabel}</span>
                        {data.isPeak && (
                          <span className="rounded bg-rose-100 text-rose-800 px-1.5 py-0.5 text-[10px] font-bold">
                            PEAK HOUR
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between gap-4 font-bold text-slate-950">
                          <span>Total EVs Passing:</span>
                          <span>{data.totalEvs} units</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-700">
                          <span>4W Personal/Cabs:</span>
                          <span>{data.fourWheeler}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-700">
                          <span>Commercial Delivery/3W:</span>
                          <span>{data.fleetCommercial}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-700">
                          <span>E-Buses &amp; Heavy Trucks:</span>
                          <span>{data.evBusesTrucks}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-slate-500 border-t border-slate-200 pt-1">
                          <span>EV Share of Total Flow:</span>
                          <span>{data.evSharePct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={currentToll.peakHourEvVolume}
                stroke="#dc2626"
                strokeDasharray="4 4"
                label={{
                  value: `Peak: ${currentToll.peakHourEvVolume} EVs/h`,
                  position: "top",
                  fill: "#dc2626",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
              <Bar dataKey="displayValue" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPeak ? "#dc2626" : "#b45309"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
