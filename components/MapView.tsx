"use client";

import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Ensure global L exists on window before leaflet.heat is initialized
if (typeof window !== "undefined") {
  (window as unknown as { L: typeof L }).L = L;
}
import "leaflet.heat";
import { Flame, Route, X, ChevronRight, Navigation } from "lucide-react";

import { DataPoint, TollPlaza, SubstationData } from "@/lib/types";
import { formatShortfall, getTopDemandHotspots, CORRIDORS, Corridor } from "@/lib/data";
import { TOLL_PLAZAS, SUBSTATIONS } from "@/lib/tollAndGridData";
import {
  CHAINAGE_CORRIDORS,
  SIDES,
  SIDE_LABEL,
  STATUS_COLORS,
  UBC_SOURCE,
  UBC_STATUS_META,
  latLngAtKm,
  segmentsForSlot,
  simulateCorridor,
  slotLabel,
  tollFlowAtSlot,
} from "@/lib/corridorChainage";

export type MetricKey = "gapScore" | "demandScore" | "existingChargers";

interface Props {
  points: DataPoint[];
  metric: MetricKey;
  onSelect?: (point: DataPoint) => void;
  // Set to true in fleet role to highlight corridor points; false for
  // operator role to highlight urban points; undefined for government
  // role (which treats all urban points equally).
  emphasizeCorridor?: boolean;
  // Set (e.g. from a ranked table row click) to pan/zoom the map to that
  // point and open its popup, without waiting for a marker click.
  focusPoint?: DataPoint | null;
  // Heatmap overlay toggle representing regional demand intensity
  showHeatmap?: boolean;
  // Side-by-side location comparison mode
  isCompareMode?: boolean;
  comparePointA?: DataPoint | null;
  comparePointB?: DataPoint | null;
  activeCompareSlot?: 0 | 1;
  onSelectComparePoint?: (point: DataPoint, slot?: 0 | 1) => void;
  // Pin top 5 highest-demand locations across India on map
  showHotspots?: boolean;
  hotspotPoints?: DataPoint[];
  // Simulated future EV adoption load percentage (0, 20, 50, 100)
  futureLoadPct?: number;
  // Operational layers: Toll Plazas and Electrical Substations
  showTollPlazas?: boolean;
  showSubstations?: boolean;
  onSelectToll?: (tollId: string) => void;
  // High-visibility corridor routing overlay and selection
  showCorridors?: boolean;
  selectedCorridorId?: string | null;
  onSelectCorridor?: (corridorId: string | null) => void;
  // Charger white space overlay (green / amber / red by kilometre) for
  // corridors that have a chainage model, driven by the selected hour.
  showWhiteSpace?: boolean;
  whiteSpaceSlot?: number;
  // When set, only this corridor's ribbon is drawn and the map fits to it.
  corridorFocusId?: string | null;
}

const METRIC_MAX: Record<MetricKey, number> = {
  gapScore: 99,
  demandScore: 99,
  existingChargers: 12,
};

const INDIA_CENTER: [number, number] = [22.5, 79];
const INDIA_ZOOM = 5;

function colorForValue(value: number, max: number) {
  // Multi-stop gradient: jade (low) -> brass (mid) -> crimson/coral (high/peak load)
  const t = Math.max(0, Math.min(1, value / max));
  if (t < 0.55) {
    const factor = t / 0.55;
    const r = Math.round(44 + (201 - 44) * factor);
    const g = Math.round(110 + (162 - 110) * factor);
    const b = Math.round(82 + (39 - 82) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const factor = (t - 0.55) / 0.45;
    const r = Math.round(201 + (220 - 201) * factor);
    const g = Math.round(162 + (38 - 162) * factor);
    const b = Math.round(39 + (38 - 39) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function popupHtml(p: DataPoint, hotspotRank?: number, futureLoadPct = 0) {
  const evLabel = p.isCorridor ? "Daily EVs" : "Registered EVs";
  const baselineDemand = (p as { baselineDemandScore?: number }).baselineDemandScore;
  const hasFutureLoad = (futureLoadPct > 0 || (p as { futureLoadPct?: number }).futureLoadPct) && baselineDemand !== undefined;
  const activeFuturePct = futureLoadPct || (p as { futureLoadPct?: number }).futureLoadPct || 0;
  const demandDelta = hasFutureLoad ? p.demandScore - baselineDemand : 0;

  const simulationBanner = hasFutureLoad
    ? `<div style="background: linear-gradient(135deg, rgba(201, 162, 39, 0.2), rgba(220, 38, 38, 0.2)); border: 1px solid rgba(201, 162, 39, 0.5); border-radius: 4px; padding: 4px 7px; font-size: 10px; font-weight: 700; color: #B45309; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span>⚡ SIMULATED +${activeFuturePct}% EV ADOPTION</span>
        <span style="background: rgba(201, 162, 39, 0.35); padding: 1px 5px; border-radius: 3px; font-weight: 800; color: #DC2626;">+${demandDelta} pts</span>
      </div>`
    : "";

  const hotspotBanner = hotspotRank
    ? `<div style="background: linear-gradient(135deg, #DC2626, #EA580C); color: #ffffff; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; letter-spacing: 0.5px;">
        <span>🔥 TOP #${hotspotRank} DEMAND HOTSPOT (Score ${p.demandScore})</span>
      </div>`
    : "";

  const isCritical = p.demandScore >= 90;

  return `<div style="font-family: 'Inter', sans-serif; min-width: 220px; color: #1B1D22;">
    ${simulationBanner}
    ${hotspotBanner}
    <div style="font-family: 'Newsreader', serif; font-size: 16px; font-weight: 600; margin-bottom: 4px;">${p.name}</div>
    <div style="color:#6B6F76; font-size:11px; margin-bottom:8px;">${p.isCorridor ? p.corridorName : `${p.city}, ${p.state}`}</div>
    <div style="font-size:13px; line-height:1.6;">
      ${evLabel} &nbsp;<strong>${p.evRegistrations.toLocaleString("en-IN")}</strong>${hasFutureLoad ? ` <span style="font-size:10px; color:#B45309;">(+${activeFuturePct}%)</span>` : ""}<br/>
      Demand score &nbsp;<strong style="${p.demandScore >= 75 ? "color:#DC2626; font-size:14px;" : hotspotRank ? "color:#EA580C;" : ""}">${p.demandScore}</strong>
      ${hasFutureLoad ? `<span style="font-size:11px; color:#6B6F76; margin-left:4px;">(Base: ${baselineDemand})</span>` : ""}<br/>
      Existing chargers &nbsp;<strong>${p.existingChargers}</strong><br/>
      Gap score &nbsp;<strong>${p.gapScore}</strong><br/>
      <span style="color:#6B6F76;">${formatShortfall(p.chargersNeeded, p.existingChargers, p.shortfall)}</span>
      ${isCritical ? `<div style="margin-top:4px; font-size:10px; font-weight:800; color:#DC2626; background:rgba(220,38,38,0.1); padding:2px 6px; border-radius:3px;">⚠️ CRITICAL GRID LOAD (Score ${p.demandScore} ≥ 90)</div>` : ""}
    </div>
    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E4E5E7; display: flex; gap: 6px;">
      <button data-compare-slot="0" data-point-id="${p.id}" class="map-popup-compare-btn" style="flex: 1; font-size: 11px; font-weight: 600; padding: 4px 6px; border-radius: 4px; background: #D97706; color: #ffffff; border: none; cursor: pointer;">Set as A</button>
      <button data-compare-slot="1" data-point-id="${p.id}" class="map-popup-compare-btn" style="flex: 1; font-size: 11px; font-weight: 600; padding: 4px 6px; border-radius: 4px; background: #0284C7; color: #ffffff; border: none; cursor: pointer;">Set as B</button>
    </div>
  </div>`;
}

function tooltipHtml(p: DataPoint, hotspotRank?: number, futureLoadPct = 0) {
  const activeFuturePct = futureLoadPct || (p as { futureLoadPct?: number }).futureLoadPct || 0;
  const futureTag = activeFuturePct > 0 ? ` (+${activeFuturePct}% load)` : "";
  if (hotspotRank) {
    return `<span style="font-family:'Inter',sans-serif; font-weight:700; color:#DC2626;">🔥 #${hotspotRank} Demand Hotspot</span> &middot; <span style="font-family:'Inter',sans-serif;">${p.name} (Score ${p.demandScore}${futureTag})</span>`;
  }
  return `<span style="font-family:'Inter',sans-serif;">${p.name} &middot; Demand ${p.demandScore}${futureTag}</span>`;
}

function hotspotDivIcon(
  rank: number,
  point: DataPoint,
  compareBadge?: { label: "A" | "B" }
) {
  const isA = compareBadge?.label === "A";
  const isB = compareBadge?.label === "B";
  const badgeHtml = compareBadge
    ? `<div style="position:absolute;top:-8px;right:-8px;background-color:${
        isA ? "#D97706" : "#0284C7"
      };color:#ffffff;font-size:10px;font-weight:bold;font-family:sans-serif;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.5);z-index:30;">${compareBadge.label}</div>`
    : "";

  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:36px;height:46px;cursor:pointer;user-select:none;">
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:14px;height:6px;background:radial-gradient(ellipse, rgba(220,38,38,0.7) 0%, rgba(220,38,38,0) 70%);border-radius:50%;pointer-events:none;"></div>
      <div style="position:absolute;top:0;left:0;width:36px;height:46px;display:flex;flex-direction:column;align-items:center;">
        <div style="position:relative;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, #DC2626 0%, #EA580C 50%, #F59E0B 100%);border:2px solid #FFFFFF;box-shadow:0 0 0 2px rgba(220,38,38,0.8), 0 3px 12px rgba(0,0,0,0.45);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#FFFFFF;z-index:2;">
          <div style="display:flex;align-items:center;justify-content:center;gap:1px;line-height:1;">
            <span style="font-size:8px;">🔥</span>
            <span style="font-size:11px;font-weight:900;font-family:'Inter',sans-serif;letter-spacing:-0.5px;">#${rank}</span>
          </div>
          <span style="font-size:7px;font-weight:800;font-family:'Inter',sans-serif;letter-spacing:0.5px;text-transform:uppercase;opacity:0.95;line-height:1;margin-top:1px;">HOT</span>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid #DC2626;margin-top:-2px;z-index:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></div>
      </div>
      ${badgeHtml}
    </div>`,
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -42],
  });
}

// Renders a marker as a plain colored circle via a DivIcon (rather than
// Leaflet's SVG CircleMarker) so it is compatible with marker clustering.
function circleDivIcon(
  diameter: number,
  fillColor: string,
  fillOpacity: number,
  compareBadge?: { label: "A" | "B" }
) {
  if (compareBadge) {
    const isA = compareBadge.label === "A";
    const ringColor = isA ? "#D97706" : "#0284C7";
    const bgBadge = isA ? "#D97706" : "#0284C7";
    const size = Math.max(diameter, 26);
    return L.divIcon({
      className: "",
      html: `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;background-color:${fillColor};opacity:${fillOpacity};border:2.5px solid ${ringColor};box-shadow:0 0 0 3px rgba(${isA ? '217,119,6' : '2,132,199'},0.4), 0 0 14px ${ringColor};box-sizing:border-box;"></div>
        <div style="position:absolute;top:-8px;right:-8px;background-color:${bgBadge};color:#ffffff;font-size:10px;font-weight:bold;font-family:sans-serif;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.5);z-index:20;">${compareBadge.label}</div>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  return L.divIcon({
    className: "",
    html: `<div style="width:${diameter}px;height:${diameter}px;border-radius:50%;background-color:${fillColor};opacity:${fillOpacity};border:1px solid rgba(27,29,34,0.35);box-sizing:border-box;"></div>`,
    iconSize: [diameter, diameter],
    iconAnchor: [diameter / 2, diameter / 2],
  });
}

const ResetViewControl = L.Control.extend({
  options: { position: "bottomright" as L.ControlPosition },
  onAdd(map: L.Map) {
    const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    const link = L.DomUtil.create("a", "", container) as HTMLAnchorElement;
    link.href = "#";
    link.title = "Reset view";
    link.setAttribute("role", "button");
    link.innerHTML = "&#8962;";
    link.style.fontSize = "16px";
    link.style.display = "flex";
    link.style.alignItems = "center";
    link.style.justifyContent = "center";
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(link, "click", (e) => {
      L.DomEvent.preventDefault(e);
      map.flyTo(INDIA_CENTER, INDIA_ZOOM);
    });
    return container;
  },
});

export default function MapView({
  points,
  metric,
  onSelect,
  emphasizeCorridor,
  focusPoint,
  showHeatmap = false,
  isCompareMode = false,
  comparePointA,
  comparePointB,
  activeCompareSlot = 0,
  onSelectComparePoint,
  showHotspots = false,
  hotspotPoints,
  futureLoadPct = 0,
  showTollPlazas = false,
  showSubstations = false,
  onSelectToll,
  showCorridors = true,
  selectedCorridorId = null,
  onSelectCorridor,
  showWhiteSpace = true,
  whiteSpaceSlot = 72,
  corridorFocusId = null,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const corridorRoutesLayerRef = useRef<L.LayerGroup | null>(null);
  const corridorLayerRef = useRef<L.LayerGroup | null>(null);
  const whiteSpaceLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  const hotspotsLayerRef = useRef<L.LayerGroup | null>(null);
  const tollLayerRef = useRef<L.LayerGroup | null>(null);
  const substationLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker | L.CircleMarker>>(new Map());

  const selectedCorridor = useMemo(() => {
    if (!selectedCorridorId) return null;
    return CORRIDORS.find((c) => c.id === selectedCorridorId) || null;
  }, [selectedCorridorId]);

  // Derive top 5 hotspots across all points (or use provided hotspots)
  const topHotspots = useMemo(() => {
    if (!showHotspots) return [];
    return hotspotPoints && hotspotPoints.length > 0
      ? hotspotPoints.slice(0, 5)
      : getTopDemandHotspots(5);
  }, [showHotspots, hotspotPoints]);

  const hotspotRankMap = useMemo(() => {
    const map = new Map<string, number>();
    if (showHotspots) {
      topHotspots.forEach((h, idx) => map.set(h.id, idx + 1));
    }
    return map;
  }, [showHotspots, topHotspots]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const focus = corridorFocusId ? CORRIDORS.find((c) => c.id === corridorFocusId) : null;
    const map = L.map(containerRef.current, {
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      zoomControl: false,
      attributionControl: true,
      // Quarter step zoom lets the corridor fill the frame instead of
      // snapping to the next whole level out.
      zoomSnap: focus ? 0.25 : 1,
      zoomDelta: focus ? 0.5 : 1,
    });
    if (focus) {
      // Corridor view: open on the corridor itself, never on the national map.
      const b = L.latLngBounds(focus.waypoints.map((w) => [w.lat, w.lng] as [number, number]));
      map.fitBounds(b, { paddingTopLeft: [32, 48], paddingBottomRight: [32, 96], maxZoom: 10.5 });
      map.whenReady(() => {
        map.invalidateSize();
        map.fitBounds(b, { paddingTopLeft: [32, 48], paddingBottomRight: [32, 96], maxZoom: 10.5 });
      });
    }
    L.control.zoom({ position: "bottomright" }).addTo(map);
    if (!focus) new ResetViewControl().addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    clusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count >= 10 ? 40 : 34;
        return L.divIcon({
          className: "",
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:#C9A227;color:#1B1D22;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;border:2px solid rgba(27,29,34,0.35);">${count}</div>`,
          iconSize: [size, size],
        });
      },
    });

    // Base highway ribbons sit under hub markers
    corridorRoutesLayerRef.current = L.layerGroup().addTo(map);
    corridorLayerRef.current = L.layerGroup().addTo(map);
    map.addLayer(clusterGroupRef.current);
    tollLayerRef.current = L.layerGroup().addTo(map);
    substationLayerRef.current = L.layerGroup().addTo(map);
    hotspotsLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (heatLayerRef.current && mapRef.current) {
        mapRef.current.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
    // The focus corridor only matters at creation; later changes are handled by the fit effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register global window helpers for Leaflet HTML popup actions
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __selectToll?: (id: string) => void }).__selectToll = (tollId: string) => {
        if (onSelectToll) onSelectToll(tollId);
      };
      (window as unknown as { __focusCorridor?: (id: string) => void }).__focusCorridor = (corridorId: string) => {
        if (onSelectCorridor) onSelectCorridor(corridorId);
        const corridor = CORRIDORS.find((c) => c.id === corridorId);
        if (corridor && mapRef.current) {
          const latlngs = corridor.waypoints.map((w) => [w.lat, w.lng] as [number, number]);
          mapRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 11 });
        }
      };
    }
  }, [onSelectToll, onSelectCorridor]);

  // Sync High-Visibility National Corridors Overlay (Dual-cased ribbons with highway shields)
  useEffect(() => {
    const map = mapRef.current;
    const layer = corridorRoutesLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!showCorridors) return;

    CORRIDORS.filter((c) => !corridorFocusId || c.id === corridorFocusId).forEach((corridor) => {
      const isSelected = selectedCorridorId === corridor.id;
      const latlngs = corridor.waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);
      if (latlngs.length < 2) return;

      // 1. Ambient Glow Aura for visual prominence
      const glowWeight = isSelected ? 18 : emphasizeCorridor ? 14 : 11;
      const glowOpacity = isSelected ? 0.55 : emphasizeCorridor ? 0.38 : 0.22;
      const glowLine = L.polyline(latlngs, {
        color: corridor.color,
        weight: glowWeight,
        opacity: glowOpacity,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      });
      glowLine.addTo(layer);

      // 2. High-Contrast Base Casing (Dark Slate for sharp optical edge separation against terrain)
      const casingWeight = isSelected ? 10 : emphasizeCorridor ? 8.5 : 7;
      const casingLine = L.polyline(latlngs, {
        color: "#0f172a",
        weight: casingWeight,
        opacity: 0.94,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      });
      casingLine.addTo(layer);

      // 3. Vibrant Core Highway Ribbon (Solid, High Visibility)
      const coreWeight = isSelected ? 6 : emphasizeCorridor ? 5 : 4;
      const coreLine = L.polyline(latlngs, {
        color: corridor.color,
        weight: coreWeight,
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round",
        interactive: true,
      });

      // Interactive hover states
      coreLine.on("mouseover", () => {
        coreLine.setStyle({ weight: coreWeight + 2 });
        casingLine.setStyle({ weight: casingWeight + 3 });
        glowLine.setStyle({ opacity: 0.65, weight: glowWeight + 4 });
      });

      coreLine.on("mouseout", () => {
        coreLine.setStyle({ weight: coreWeight });
        casingLine.setStyle({ weight: casingWeight });
        glowLine.setStyle({ opacity: glowOpacity, weight: glowWeight });
      });

      coreLine.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        if (onSelectCorridor) onSelectCorridor(corridor.id);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 11 });
      });

      // Rich Tooltip along the line
      coreLine.bindTooltip(`
        <div style="font-family:'Inter',sans-serif;font-size:12px;color:#0f172a;min-width:210px;">
          <div style="display:flex;align-items:center;gap:6px;font-weight:700;">
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${corridor.color};box-shadow:0 0 6px ${corridor.color};"></span>
            <span>${corridor.name}</span>
            <span style="background:#0f172a;color:#ffffff;font-size:10px;font-weight:800;padding:1px 6px;border-radius:4px;margin-left:auto;">${corridor.highwayCode}</span>
          </div>
          <div style="font-size:11px;font-weight:500;color:#64748b;margin-top:3px;">
            ${corridor.lengthKm} km &middot; ${corridor.waypoints.length} High-Capacity Charging Hubs &middot; ${corridor.evCorridorReadinessPct}% Readiness
          </div>
          <div style="font-size:10px;color:${corridor.color};font-weight:700;margin-top:3px;">
            Click line to zoom &amp; inspect corridor &rarr;
          </div>
        </div>
      `, { sticky: true, opacity: 0.98 });

      // Detailed Leaflet Popup on the line
      coreLine.bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:260px;color:#0f172a;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="background:${corridor.color};color:#ffffff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;">${corridor.highwayCode}</span>
            <span style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;">${corridor.priorityStatus} Priority</span>
          </div>
          <div style="font-family:'Newsreader',serif;font-size:16px;font-weight:700;color:#0f172a;margin-bottom:2px;">${corridor.name}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:8px;">${corridor.state} &middot; Length: ~${corridor.lengthKm} km</div>
          
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;font-size:11px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="color:#64748b;">EV Corridor Readiness:</span>
              <strong style="color:${corridor.color};font-size:12px;">${corridor.evCorridorReadinessPct}%</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="color:#64748b;">Fast Hubs:</span>
              <strong>${corridor.waypoints.length} Hubs</strong>
            </div>
            <div style="margin-top:4px;padding-top:4px;border-top:1px dashed #cbd5e1;color:#334155;font-size:10px;">
              <strong>Key Hubs:</strong> ${corridor.waypoints.map(w => w.name).join(' &rarr; ')}
            </div>
          </div>

          <button onclick="window.__focusCorridor && window.__focusCorridor('${corridor.id}')" style="width:100%;padding:6px 8px;background:${corridor.color};color:#ffffff;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
            Focus on Corridor Route &rarr;
          </button>
        </div>
      `);

      coreLine.addTo(layer);

      // 4. Highway Shield Marker at Midpoint
      const midIdx = Math.floor(corridor.waypoints.length / 2);
      const midPoint = corridor.waypoints[midIdx] || corridor.waypoints[0];
      const shieldIcon = L.divIcon({
        className: "",
        html: `<div style="background:#0f172a;border:2px solid ${corridor.color};border-radius:12px;color:#ffffff;font-family:'Inter',sans-serif;font-size:10px;font-weight:800;padding:2px 7px;box-shadow:0 3px 8px rgba(0,0,0,0.5);display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;transform:translate(-50%, -50%);" title="${corridor.name} (${corridor.highwayCode})">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${corridor.color};box-shadow:0 0 6px ${corridor.color};"></span>
          <span>${corridor.highwayCode}</span>
        </div>`,
        iconSize: [60, 22],
        iconAnchor: [30, 11],
      });

      const shieldMarker = L.marker([midPoint.lat, midPoint.lng], { icon: shieldIcon, zIndexOffset: 1200 });
      shieldMarker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        if (onSelectCorridor) onSelectCorridor(corridor.id);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 11 });
      });
      shieldMarker.bindTooltip(`<strong>${corridor.name}</strong><br/>${corridor.lengthKm} km &middot; ${corridor.evCorridorReadinessPct}% Readiness`, {
        direction: "top",
        sticky: true,
      });
      shieldMarker.addTo(layer);
    });
  }, [showCorridors, selectedCorridorId, emphasizeCorridor, onSelectCorridor, corridorFocusId]);

  // Fit the map to the focused corridor once.
  useEffect(() => {
    if (!corridorFocusId) return;
    const corridor = CORRIDORS.find((c) => c.id === corridorFocusId);
    if (!corridor) return;
    const latlngs = corridor.waypoints.map((w) => [w.lat, w.lng] as [number, number]);
    const fit = () => {
      const map = mapRef.current; // read afresh: the instance can change between retries
      if (!map) return;
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(latlngs), { paddingTopLeft: [24, 56], paddingBottomRight: [24, 128], maxZoom: 10 });
    };
    fit();
    const timers = [250, 800, 1600].map((ms) => setTimeout(fit, ms));
    return () => timers.forEach(clearTimeout);
  }, [corridorFocusId]);

  // Charger white space overlay, one ribbon per carriageway: the left
  // carriageway (Delhi to Chandigarh) sits to the left of the centreline in
  // the direction of travel, the right carriageway to the right, as driven.
  // Station pins carry the UBC live status; toll tags carry EVs per slot by
  // direction.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Rebuild the layer group on the current map every time: in dev mode
    // React mounts the map twice, and a group attached to the discarded
    // first instance would draw nothing.
    if (whiteSpaceLayerRef.current) whiteSpaceLayerRef.current.remove();
    whiteSpaceLayerRef.current = L.layerGroup().addTo(map);
    const layer = whiteSpaceLayerRef.current;
    if (!showWhiteSpace) return;

    const OFFSET_DEG = 0.028; // about 3 km, so the two carriageways separate at corridor zoom
    const offsetPoint = (c: (typeof CHAINAGE_CORRIDORS)[number], km: number, sign: number): [number, number] => {
      const [lat, lng] = latLngAtKm(c, km);
      const [lat2, lng2] = latLngAtKm(c, Math.min(c.lengthKm, km + 1));
      const [lat1, lng1] = latLngAtKm(c, Math.max(0, km - 1));
      const cosLat = Math.cos((lat * Math.PI) / 180);
      const dx = (lng2 - lng1) * cosLat;
      const dy = lat2 - lat1;
      const len = Math.hypot(dx, dy) || 1;
      // left normal of the direction of travel (Delhi to Chandigarh)
      const nx = -dy / len;
      const ny = dx / len;
      return [lat + ny * OFFSET_DEG * sign, lng + (nx * OFFSET_DEG * sign) / cosLat];
    };

    CHAINAGE_CORRIDORS.forEach((c) => {
      SIDES.forEach((side) => {
        const sign = side === "NB" ? 1 : -1;
        segmentsForSlot(c, whiteSpaceSlot, side).forEach((seg) => {
          const from = offsetPoint(c, seg.startKm, sign);
          const to = offsetPoint(c, seg.endKm, sign);
          L.polyline([from, to], { color: "#ffffff", weight: 9, opacity: 0.95, lineCap: "butt", interactive: false }).addTo(layer);
          L.polyline([from, to], { color: STATUS_COLORS[seg.status], weight: 6, opacity: 1, lineCap: "butt" })
            .bindTooltip(
              `<div style="font-family:'Inter',sans-serif;font-size:11px;"><strong>${SIDE_LABEL[side].short} · km ${seg.startKm} to ${seg.endKm}</strong><br/>${seg.reason}<br/><strong>${seg.evsPassing}</strong> EVs passing this 15 min slot</div>`,
              { sticky: true }
            )
            .addTo(layer);
        });

        simulateCorridor(c, side).forEach((d) => {
          const h = d.slots[whiteSpaceSlot];
          const meta = UBC_STATUS_META[h.ubcStatus];
          const icon = L.divIcon({
            className: "",
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            html: `<div style="width:20px;height:20px;border-radius:5px;background:${meta.color};border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);color:#fff;font:700 8px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;">${h.gunsFree}/${d.station.guns}</div>`,
          });
          L.marker(offsetPoint(c, d.station.km, sign), { icon, zIndexOffset: 800 })
            .bindPopup(
              `<div style="font-family:'Inter',sans-serif;min-width:230px;font-size:11px;color:#0f172a;">
                <div style="font-family:'Newsreader',serif;font-size:15px;font-weight:700;">${d.station.name}</div>
                <div style="color:#64748b;margin-bottom:6px;">km ${d.station.km} &middot; ${SIDE_LABEL[side].road} (${SIDE_LABEL[side].short}) &middot; ${d.station.guns} guns &times; ${d.station.powerKw} kW</div>
                <div style="font-weight:700;color:${meta.color};">${UBC_SOURCE.code} status: ${meta.label} &middot; ${h.gunsFree} of ${d.station.guns} guns free</div>
                <div style="margin-top:4px;"><strong>${slotLabel(whiteSpaceSlot)}</strong> &middot; ${h.evsPassing} EVs passing &middot; <strong>${Math.round(h.arrivals)}</strong> stop to charge</div>
                <div>Served ${Math.round(h.served)} &middot; queued ${Math.round(h.waiting)} &middot; <span style="color:${h.turnedAway >= 0.5 ? "#B43424" : "#64748b"};font-weight:700;">turned away ${Math.round(h.turnedAway)}</span> &middot; utilization ${h.utilizationPct}%</div>
                <div style="margin-top:4px;padding-top:4px;border-top:1px dashed #cbd5e1;color:#64748b;">Gap behind on this side: ${d.upstreamGapKm} km &middot; source ${UBC_SOURCE.name} (${UBC_SOURCE.note})</div>
              </div>`
            )
            .addTo(layer);
        });

        // Directional flow tags at each toll
        c.tolls.forEach((t) => {
          const flow = tollFlowAtSlot(t.tollId, whiteSpaceSlot, side);
          const arrow = side === "NB" ? "&#8593;" : "&#8595;";
          const plaza = TOLL_PLAZAS.find((p) => p.id === t.tollId);
          const short = (plaza?.name ?? "").replace(/ Toll Plaza.*$/i, "").replace(/\s*\(.*\)/, "").trim().split(" ")[0];
          const icon = L.divIcon({
            className: "",
            iconSize: [92, 18],
            iconAnchor: [side === "NB" ? 100 : -8, 9],
            html: `<div style="white-space:nowrap;background:#1F2A37;color:#fff;border-radius:3px;padding:2px 7px;font:600 10px 'Inter',sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.35);">${arrow} ${flow} EV <span style="color:#AEB8C4;font-weight:500;">${short}</span></div>`,
          });
          L.marker(offsetPoint(c, t.km, sign), { icon, zIndexOffset: 700, interactive: false }).addTo(layer);
        });
      });
    });
  }, [showWhiteSpace, whiteSpaceSlot]);

  useEffect(() => {
    const map = mapRef.current;
    const tollLayer = tollLayerRef.current;
    if (!map || !tollLayer) return;

    tollLayer.clearLayers();
    if (!showTollPlazas) return;

    // In the corridor view only that corridor's plazas are drawn.
    const focusTolls = corridorFocusId
      ? new Set(CHAINAGE_CORRIDORS.find((c) => c.id === corridorFocusId)?.tolls.map((t) => t.tollId) ?? [])
      : null;
    TOLL_PLAZAS.filter((t) => !focusTolls || focusTolls.has(t.id)).forEach((toll) => {
      const tollIcon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;border-radius:6px;background-color:#b45309;color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid #ffffff;cursor:pointer;" title="${toll.name}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.2 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([toll.lat, toll.lng], { icon: tollIcon, zIndexOffset: 1500 });
      marker.bindPopup(`
        <div style="font-family:'Inter',sans-serif;font-size:12px;color:#0f172a;min-width:230px;">
          <div style="font-weight:700;font-size:13px;color:#9a3412;margin-bottom:2px;">${toll.name}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${toll.highwayCode} &middot; ${toll.corridorName} (${toll.state})</div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:6px 8px;margin-bottom:8px;font-size:11px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="color:#78350f;">Daily EV Crossings:</span>
              <strong style="font-family:monospace;color:#9a3412;">${toll.totalDailyEvs.toLocaleString("en-IN")} EVs</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="color:#78350f;">EV Traffic Share:</span>
              <strong style="font-family:monospace;color:#0f172a;">${toll.evSharePct}%</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="color:#78350f;">Peak Transit Hour:</span>
              <strong style="font-family:monospace;color:#dc2626;">${toll.peakHourEvVolume} EVs/h (${toll.peakHourTimeLabel})</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#78350f;">Fast-Charging Need:</span>
              <strong style="font-family:monospace;color:#047857;">${toll.recommendedTollChargerCapacityMw} MW Hub</strong>
            </div>
          </div>
          <button onclick="window.__selectToll && window.__selectToll('${toll.id}')" style="width:100%;padding:6px 8px;background:#9a3412;color:#ffffff;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;text-align:center;">
            Analyze 24-Hour Toll Flow &rarr;
          </button>
        </div>
      `);
      marker.bindTooltip(`<strong>${toll.name}</strong><br/>${toll.totalDailyEvs.toLocaleString("en-IN")} EVs/day &middot; Peak ${toll.peakHourEvVolume} EVs/h`, {
        direction: "top",
        sticky: true,
      });
      marker.addTo(tollLayer);
    });
  }, [showTollPlazas, onSelectToll, corridorFocusId]);

  // Sync Substations Layer
  useEffect(() => {
    const map = mapRef.current;
    const subLayer = substationLayerRef.current;
    if (!map || !subLayer) return;

    subLayer.clearLayers();
    if (!showSubstations) return;

    const relevantSubs = corridorFocusId
      ? SUBSTATIONS.filter((s) => s.id.startsWith("sub-exp-"))
      : SUBSTATIONS;

    relevantSubs.forEach((sub) => {
      const isCongested = sub.loadUtilizationPct >= 80;
      const subIcon = L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;border-radius:50%;background-color:#4338ca;color:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid #ffffff;cursor:pointer;" title="${sub.name}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([sub.lat, sub.lng], { icon: subIcon, zIndexOffset: 1400 });
      marker.bindPopup(`
        <div style="font-family:'Inter',sans-serif;font-size:12px;color:#0f172a;min-width:240px;">
          <div style="font-weight:700;font-size:13px;color:#3730a3;margin-bottom:2px;">${sub.name}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px;">${sub.voltageRating} &middot; Utility: ${sub.discom}</div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px;margin-bottom:6px;font-size:11px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="color:#475569;">Capacity & Load:</span>
              <strong style="font-family:monospace;">${sub.currentPeakLoadMva} / ${sub.transformerCapacityMva} MVA (${sub.loadUtilizationPct}%)</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="color:#475569;">Available Headroom:</span>
              <strong style="font-family:monospace;color:#047857;">+${sub.availableHeadroomMva} MVA</strong>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="color:#475569;">Feeder Feasibility:</span>
              <strong style="color:${isCongested ? '#dc2626' : '#047857'};font-size:10px;">${sub.feederStatus}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#475569;">Energization Time:</span>
              <strong style="font-family:monospace;color:#4338ca;">${sub.energizationLeadTimeDays} Days</strong>
            </div>
          </div>
        </div>
      `);
      marker.bindTooltip(`<strong>${sub.name}</strong><br/>${sub.voltageRating} &middot; +${sub.availableHeadroomMva} MVA Headroom`, {
        direction: "top",
        sticky: true,
      });
      marker.addTo(subLayer);
    });
  }, [showSubstations, corridorFocusId]);

  // Sync heatmap overlay representing demand intensity across regions
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!showHeatmap) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    const heatData: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lng,
      p.demandScore,
    ]);

    if (!heatLayerRef.current) {
      if (typeof (L as unknown as { heatLayer?: unknown }).heatLayer === "function") {
        const heat = (L as unknown as {
          heatLayer: (
            latlngs: [number, number, number][],
            options: Record<string, unknown>
          ) => L.HeatLayer;
        }).heatLayer(heatData, {
          radius: 32,
          blur: 24,
          maxZoom: 10,
          max: 100,
          minOpacity: 0.38,
          gradient: {
            0.15: "#2C6E52", // Low demand (Jade)
            0.45: "#C9A227", // Moderate demand (Brass)
            0.7: "#D96B27",  // High demand (Amber/Orange)
            0.9: "#B43424",  // Peak demand (Signal Red)
          },
        });
        heat.addTo(map);
        heatLayerRef.current = heat;
      }
    } else {
      heatLayerRef.current.setLatLngs(heatData);
    }
  }, [showHeatmap, points]);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    const corridorLayer = corridorLayerRef.current;
    const hotspotsLayer = hotspotsLayerRef.current;
    if (!map || !clusterGroup || !corridorLayer || !hotspotsLayer) return;

    clusterGroup.clearLayers();
    corridorLayer.clearLayers();
    hotspotsLayer.clearLayers();
    markersRef.current.clear();

    const max = METRIC_MAX[metric];

    const renderedHotspotIds = new Set<string>();

    points.forEach((p) => {
      const isA = comparePointA?.id === p.id;
      const isB = comparePointB?.id === p.id;
      const compareBadge = isA ? { label: "A" as const } : isB ? { label: "B" as const } : undefined;

      const handleMarkerClick = () => {
        if (isCompareMode && onSelectComparePoint) {
          onSelectComparePoint(p);
        } else if (onSelect) {
          onSelect(p);
        }
      };

      // Check if this point is one of the top 5 hotspots
      const isHotspot = showHotspots && hotspotRankMap.has(p.id);

      if (isHotspot) {
        const rank = hotspotRankMap.get(p.id)!;
        const marker = L.marker([p.lat, p.lng], {
          icon: hotspotDivIcon(rank, p, compareBadge),
          zIndexOffset: 2000 - rank * 10,
        });
        marker.bindPopup(popupHtml(p, rank, futureLoadPct));
        marker.bindTooltip(tooltipHtml(p, rank, futureLoadPct), { direction: "top", sticky: true, opacity: 0.95 });
        marker.on("click", handleMarkerClick);
        marker.addTo(hotspotsLayer);
        markersRef.current.set(p.id, marker);
        renderedHotspotIds.add(p.id);
        return;
      }

      const value = p[metric] as number;
      const color = colorForValue(value, max);
      let fillOpacity = 0.85;
      if (emphasizeCorridor !== undefined) {
        const relevant = emphasizeCorridor ? p.isCorridor : !p.isCorridor;
        fillOpacity = relevant ? 0.95 : 0.22;
      }
      if (showHeatmap) {
        fillOpacity = Math.min(fillOpacity, 0.65);
      }

      if (p.isCorridor) {
        // Find matching corridor for theme color and active selection
        const matchingCorridor = CORRIDORS.find((c) => c.name === p.corridorName);
        const hubColor = matchingCorridor ? matchingCorridor.color : "#EA580C";
        const isCorridorActive = selectedCorridorId && matchingCorridor?.id === selectedCorridorId;
        const radius = compareBadge ? 12 : isCorridorActive ? 9.5 : 8;

        const circle = L.circleMarker([p.lat, p.lng], {
          radius,
          color: isA ? "#D97706" : isB ? "#0284C7" : isCorridorActive ? "#0f172a" : "#FFFFFF",
          weight: compareBadge ? 3.5 : isCorridorActive ? 3 : 2.5,
          fillColor: hubColor,
          fillOpacity: 1,
          className: `point-marker ${compareBadge ? "ring-2 ring-offset-2" : ""}`,
        });
        circle.bindPopup(popupHtml(p, undefined, futureLoadPct));
        circle.bindTooltip(
          `${tooltipHtml(p, undefined, futureLoadPct)}${
            isA ? " &middot; <strong>[Location A]</strong>" : isB ? " &middot; <strong>[Location B]</strong>" : ""
          }${matchingCorridor ? ` &middot; <span style="color:${hubColor};font-weight:700;">[${matchingCorridor.highwayCode}]</span>` : ""}`,
          { direction: "top", sticky: true, opacity: 0.95 }
        );
        circle.on("click", handleMarkerClick);
        circle.addTo(corridorLayer);
        markersRef.current.set(p.id, circle);
      } else {
        const diameter = (5 + (value / max) * 7) * 2;
        const marker = L.marker([p.lat, p.lng], {
          icon: circleDivIcon(diameter, color, fillOpacity, compareBadge),
        });
        marker.bindPopup(popupHtml(p, undefined, futureLoadPct));
        marker.bindTooltip(
          `${tooltipHtml(p, undefined, futureLoadPct)}${
            isA ? " &middot; <strong>[Location A]</strong>" : isB ? " &middot; <strong>[Location B]</strong>" : ""
          }`,
          { direction: "top", sticky: true, opacity: 0.95 }
        );
        marker.on("click", handleMarkerClick);
        clusterGroup.addLayer(marker);
        markersRef.current.set(p.id, marker);
      }
    });

    // Pinned Hotspots Guarantee:
    // If showHotspots is active, pin any top 5 hotspots that were not in `points`
    // (for instance, when the user has filtered by a specific city search).
    if (showHotspots) {
      topHotspots.forEach((h, idx) => {
        if (!renderedHotspotIds.has(h.id)) {
          const rank = idx + 1;
          const isA = comparePointA?.id === h.id;
          const isB = comparePointB?.id === h.id;
          const compareBadge = isA ? { label: "A" as const } : isB ? { label: "B" as const } : undefined;

          const handleHotspotClick = () => {
            if (isCompareMode && onSelectComparePoint) {
              onSelectComparePoint(h);
            } else if (onSelect) {
              onSelect(h);
            }
          };

          const marker = L.marker([h.lat, h.lng], {
            icon: hotspotDivIcon(rank, h, compareBadge),
            zIndexOffset: 2000 - rank * 10,
          });
          marker.bindPopup(popupHtml(h, rank, futureLoadPct));
          marker.bindTooltip(tooltipHtml(h, rank, futureLoadPct), { direction: "top", sticky: true, opacity: 0.95 });
          marker.on("click", handleHotspotClick);
          marker.addTo(hotspotsLayer);
          markersRef.current.set(h.id, marker);
          renderedHotspotIds.add(h.id);
        }
      });
    }
  }, [
    points,
    metric,
    emphasizeCorridor,
    onSelect,
    showHeatmap,
    isCompareMode,
    comparePointA,
    comparePointB,
    onSelectComparePoint,
    showHotspots,
    topHotspots,
    hotspotRankMap,
    futureLoadPct,
    selectedCorridorId,
  ]);

  // Handle click on "Set as A" or "Set as B" buttons inside map popups
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePopupBtnClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(".map-popup-compare-btn") as HTMLElement | null;
      if (!btn) return;
      const pointId = btn.getAttribute("data-point-id");
      const slotStr = btn.getAttribute("data-compare-slot");
      if (!pointId || slotStr === null) return;
      const found = points.find((p) => p.id === pointId) || topHotspots.find((p) => p.id === pointId);
      if (!found) return;
      const slot = parseInt(slotStr, 10) as 0 | 1;
      if (onSelectComparePoint) {
        onSelectComparePoint(found, slot);
      }
    };

    container.addEventListener("click", handlePopupBtnClick);
    return () => {
      container.removeEventListener("click", handlePopupBtnClick);
    };
  }, [points, topHotspots, onSelectComparePoint]);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !focusPoint) return;
    const marker = markersRef.current.get(focusPoint.id);
    if (!marker) return;

    if (
      focusPoint.isCorridor ||
      (hotspotsLayerRef.current && hotspotsLayerRef.current.hasLayer(marker))
    ) {
      // Pinned hotspots and corridor markers are never clustered, so direct flyTo works;
      // wait for pan/zoom to finish before opening popup.
      map.flyTo([focusPoint.lat, focusPoint.lng], 9, { duration: 0.75 });
      map.once("moveend", () => marker.openPopup());
    } else if (clusterGroup) {
      // Urban markers may be merged into a cluster icon; zoomToShowLayer
      // zooms in exactly as far as needed to reveal this one, then opens
      // its popup via the callback.
      clusterGroup.zoomToShowLayer(marker, () => marker.openPopup());
    }
  }, [focusPoint]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating Hotspots Quick Nav HUD when Show Hotspots is active */}
      {showHotspots && topHotspots.length > 0 && (
        <div
          className={`absolute ${
            isCompareMode ? "top-28" : "top-16"
          } left-4 z-[500] bg-panel/95 backdrop-blur border border-rose-500/40 shadow-lg rounded-lg p-2 max-w-md animate-in fade-in slide-in-from-top-2 duration-150`}
        >
          <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-line/60">
            <div className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
              <span className="text-[11px] font-bold text-ink">Top 5 Demand Hotspots</span>
              {futureLoadPct > 0 && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  +{futureLoadPct}% load
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted font-mono">Pinned on map</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topHotspots.map((h, idx) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  if (onSelect) onSelect(h);
                  const marker = markersRef.current.get(h.id);
                  if (mapRef.current) {
                    mapRef.current.flyTo([h.lat, h.lng], 9, { duration: 0.75 });
                    if (marker) {
                      mapRef.current.once("moveend", () => marker.openPopup());
                    }
                  }
                }}
                className="text-left px-2 py-1 rounded bg-panel2 hover:bg-panel border border-line hover:border-rose-500/60 flex items-center gap-1.5 text-[11px] transition-colors group cursor-pointer"
                title={`Pan to #${idx + 1} ${h.name} (Demand ${h.demandScore})`}
              >
                <span className="text-[10px] font-black text-rose-500">#{idx + 1}</span>
                <span className="font-medium text-ink truncate max-w-[105px] group-hover:text-rose-400">
                  {h.name}
                </span>
                <span className="text-[10px] font-mono text-muted group-hover:text-ink">
                  {h.demandScore}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Active Corridor Inspector HUD */}
      {selectedCorridor && !corridorFocusId && (
        <div
          className={`absolute ${
            isCompareMode ? "top-32" : showHotspots ? "top-36" : "top-16"
          } left-4 z-[500] bg-panel/95 backdrop-blur border-2 shadow-2xl rounded-xl p-3.5 max-w-sm animate-in fade-in slide-in-from-top-2 duration-150`}
          style={{ borderColor: selectedCorridor.color }}
        >
          <div className="flex items-center justify-between gap-3 mb-1.5 pb-1.5 border-b border-line">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: selectedCorridor.color }}
              />
              <span className="text-xs font-bold text-ink leading-tight">{selectedCorridor.name}</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-900 text-white shadow-2xs">
                {selectedCorridor.highwayCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectCorridor && onSelectCorridor(null)}
              className="text-muted hover:text-ink text-xs p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              title="Close corridor inspector"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Length</span>
              <strong className="text-slate-900">{selectedCorridor.lengthKm} km</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fast Hubs</span>
              <strong className="text-slate-900">{selectedCorridor.waypoints.length} Hubs</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">EV Readiness</span>
              <strong style={{ color: selectedCorridor.color }}>{selectedCorridor.evCorridorReadinessPct}%</strong>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Charging Hubs Along Corridor:
            </span>
            <div className="flex flex-wrap gap-1">
              {selectedCorridor.waypoints.map((wp, i) => (
                <button
                  key={wp.name}
                  type="button"
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.flyTo([wp.lat, wp.lng], 10, { duration: 0.6 });
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] font-medium border border-slate-300 text-slate-800 hover:text-amber-700 transition-colors cursor-pointer shadow-2xs"
                  title={`Fly to ${wp.name}`}
                >
                  <span className="font-bold text-slate-400 mr-1">{i + 1}.</span>
                  {wp.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
