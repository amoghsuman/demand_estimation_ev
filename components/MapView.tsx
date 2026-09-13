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
import { Flame } from "lucide-react";

import { DataPoint } from "@/lib/types";
import { formatShortfall, getTopDemandHotspots } from "@/lib/data";

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
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const corridorLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  const hotspotsLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker | L.CircleMarker>>(new Map());

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
    const map = L.map(containerRef.current, {
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    new ResetViewControl().addTo(map);
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
    map.addLayer(clusterGroupRef.current);

    corridorLayerRef.current = L.layerGroup().addTo(map);
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
  }, []);

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

    // Draw each corridor's route as a thin connecting line, in stop order,
    // before its markers so the markers sit on top.
    const corridorGroups = new Map<string, DataPoint[]>();
    points.forEach((p) => {
      if (p.isCorridor && p.corridorName) {
        const group = corridorGroups.get(p.corridorName) ?? [];
        group.push(p);
        corridorGroups.set(p.corridorName, group);
      }
    });
    corridorGroups.forEach((stops) => {
      const latlngs = stops.map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(latlngs, {
        color: "rgba(27,29,34,0.4)",
        weight: 2,
        dashArray: "5 5",
      }).addTo(corridorLayer);
    });

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
        fillOpacity = relevant ? 0.9 : 0.22;
      }
      if (showHeatmap) {
        fillOpacity = Math.min(fillOpacity, 0.65);
      }

      if (p.isCorridor) {
        const radius = compareBadge ? 11 : 7;
        const circle = L.circleMarker([p.lat, p.lng], {
          radius,
          color: isA ? "#D97706" : isB ? "#0284C7" : "rgba(27,29,34,0.35)",
          weight: compareBadge ? 3.5 : 1,
          fillColor: color,
          fillOpacity: compareBadge ? 1 : fillOpacity,
          className: `point-marker ${compareBadge ? "ring-2 ring-offset-2" : ""}`,
        });
        circle.bindPopup(popupHtml(p, undefined, futureLoadPct));
        circle.bindTooltip(
          `${tooltipHtml(p, undefined, futureLoadPct)}${
            isA ? " &middot; <strong>[Location A]</strong>" : isB ? " &middot; <strong>[Location B]</strong>" : ""
          }`,
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
    </div>
  );
}
