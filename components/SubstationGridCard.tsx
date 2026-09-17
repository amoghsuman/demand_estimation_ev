"use client";

import { SubstationData } from "@/lib/types";
import { Zap, CheckCircle2, AlertCircle, Clock, ShieldCheck, Gauge } from "lucide-react";

interface SubstationGridCardProps {
  substation: SubstationData;
  compact?: boolean;
}

export default function SubstationGridCard({
  substation,
  compact = false,
}: SubstationGridCardProps) {
  const isHighCapacity = substation.availableHeadroomMva >= 8.0;
  const isCongested = substation.loadUtilizationPct >= 80.0;

  return (
    <div className="rounded-lg border border-line bg-panel p-3.5 shadow-2xs space-y-3">
      {/* Substation Identity & DISCOM */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
              <Zap className="h-3 w-3 text-indigo-600" />
              ELECTRICAL GRID INFRASTRUCTURE
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
              {substation.voltageRating}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-950 leading-tight">
            {substation.name}
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Utility Operator: <span className="font-semibold text-slate-800">{substation.discom}</span> · {substation.distanceKm} km from site
          </p>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
            isCongested
              ? "bg-rose-100 text-rose-950 border-rose-300"
              : isHighCapacity
              ? "bg-emerald-100 text-emerald-950 border-emerald-300"
              : "bg-amber-100 text-amber-950 border-amber-300"
          }`}
        >
          {isCongested ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              Congested Feeder
            </>
          ) : isHighCapacity ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              High Headroom
            </>
          ) : (
            <>
              <Gauge className="h-3.5 w-3.5 text-amber-600" />
              Moderate Capacity
            </>
          )}
        </span>
      </div>

      {/* Transformer Headroom Progress Meter */}
      <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-700">Transformer Capacity &amp; Sanctionable Headroom</span>
          <span className="font-mono text-slate-950">
            {substation.currentPeakLoadMva} / {substation.transformerCapacityMva} MVA ({substation.loadUtilizationPct}% Load)
          </span>
        </div>

        <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex">
          <div
            className={`h-full transition-all ${
              isCongested ? "bg-rose-600" : "bg-amber-600"
            }`}
            style={{ width: `${substation.loadUtilizationPct}%` }}
            title={`Current Grid Load: ${substation.currentPeakLoadMva} MVA`}
          />
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${100 - substation.loadUtilizationPct}%` }}
            title={`Available EV Charging Headroom: ${substation.availableHeadroomMva} MVA`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="text-slate-500">
            Current Peak: <strong className="text-slate-800 font-mono">{substation.currentPeakLoadMva} MVA</strong>
          </span>
          <span className="text-emerald-700 font-bold">
            Available Headroom: <strong className="font-mono text-emerald-800">+{substation.availableHeadroomMva} MVA</strong>
          </span>
        </div>
      </div>

      {/* Grid Specification Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-md border border-line bg-panel p-2">
          <div className="text-[10px] font-semibold text-slate-600">Feeder Status</div>
          <div className="mt-0.5 font-bold text-slate-950 text-[11px] leading-tight">
            {substation.feederStatus}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {substation.dedicatedEvFeederAvailable ? "✅ Dedicated 11kV line" : "⚠️ Shared HT feeder"}
          </div>
        </div>

        <div className="rounded-md border border-line bg-panel p-2">
          <div className="text-[10px] font-semibold text-slate-600">Energization Lead Time</div>
          <div className="mt-0.5 font-mono font-bold text-indigo-700 text-sm">
            {substation.energizationLeadTimeDays} Days
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">From application to charging online</div>
        </div>

        <div className="rounded-md border border-line bg-panel p-2 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-semibold text-slate-600">Commercial Power Tariff</div>
          <div className="mt-0.5 font-mono font-bold text-slate-950 text-sm">
            ₹{substation.powerCostPerUnitInr} / kWh
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">State DISCOM HT-2 EV tariff rate</div>
        </div>
      </div>
    </div>
  );
}
