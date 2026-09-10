"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { DataPoint } from "@/lib/types";
import { formatShortfall } from "@/lib/data";

export type MetricKey = "gapScore" | "demandScore" | "existingChargers";

interface Props {
  points: DataPoint[];
  metric: MetricKey;
  onSelect?: (point: DataPoint) => void;
  emphasizeCorridor?: boolean;
  // Set (e.g. from a ranked table row click) to pan/zoom the map to that
  // point and open its popup, without waiting for a marker click.
  focusPoint?: DataPoint | null;
}

const METRIC_MAX: Record<MetricKey, number> = {
  gapScore: 99,
  demandScore: 99,
  existingChargers: 12,
};

const INDIA_CENTER: [number, number] = [22.5, 79];
const INDIA_ZOOM = 5;

function colorForValue(value: number, max: number) {
  // Interpolates from jade (low) to brass (high).
  const t = Math.max(0, Math.min(1, value / max));
  const low = { r: 44, g: 110, b: 82 };
  const high = { r: 201, g: 162, b: 39 };
  const r = Math.round(low.r + (high.r - low.r) * t);
  const g = Math.round(low.g + (high.g - low.g) * t);
  const b = Math.round(low.b + (high.b - low.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function popupHtml(p: DataPoint) {
  return `<div style="font-family: 'Inter', sans-serif; min-width: 190px; color: #1B1D22;">
    <div style="font-family: 'Newsreader', serif; font-size: 16px; margin-bottom: 4px;">${p.name}</div>
    <div style="color:#6B6F76; font-size:11px; margin-bottom:8px;">${p.city}, ${p.state}</div>
    <div style="font-size:13px; line-height:1.6;">
      Demand score &nbsp;<strong>${p.demandScore}</strong><br/>
      Existing chargers &nbsp;<strong>${p.existingChargers}</strong><br/>
      Gap score &nbsp;<strong>${p.gapScore}</strong><br/>
      <span style="color:#6B6F76;">${formatShortfall(p.chargersNeeded, p.existingChargers, p.shortfall)}</span>
    </div>
  </div>`;
}

function tooltipHtml(p: DataPoint) {
  return `<span style="font-family:'Inter',sans-serif;">${p.name} &middot; Gap ${p.gapScore}</span>`;
}

// Renders a marker as a plain colored circle via a DivIcon (rather than
// Leaflet's SVG CircleMarker) so it is compatible with marker clustering.
function circleDivIcon(diameter: number, fillColor: string, fillOpacity: number) {
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

export default function MapView({ points, metric, onSelect, emphasizeCorridor, focusPoint }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const corridorLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker | L.CircleMarker>>(new Map());

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
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    const corridorLayer = corridorLayerRef.current;
    if (!map || !clusterGroup || !corridorLayer) return;
    clusterGroup.clearLayers();
    corridorLayer.clearLayers();
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

    points.forEach((p) => {
      const value = p[metric] as number;
      const color = colorForValue(value, max);
      let fillOpacity = 0.85;
      if (emphasizeCorridor !== undefined) {
        const relevant = emphasizeCorridor ? p.isCorridor : !p.isCorridor;
        fillOpacity = relevant ? 0.9 : 0.22;
      }

      if (p.isCorridor) {
        const radius = 7;
        const circle = L.circleMarker([p.lat, p.lng], {
          radius,
          color: "rgba(27,29,34,0.35)",
          weight: 1,
          fillColor: color,
          fillOpacity,
          className: "point-marker",
        });
        circle.bindPopup(popupHtml(p));
        circle.bindTooltip(tooltipHtml(p), { direction: "top", sticky: true, opacity: 0.95 });
        if (onSelect) circle.on("click", () => onSelect(p));
        circle.addTo(corridorLayer);
        markersRef.current.set(p.id, circle);
      } else {
        const diameter = (5 + (value / max) * 7) * 2;
        const marker = L.marker([p.lat, p.lng], {
          icon: circleDivIcon(diameter, color, fillOpacity),
        });
        marker.bindPopup(popupHtml(p));
        marker.bindTooltip(tooltipHtml(p), { direction: "top", sticky: true, opacity: 0.95 });
        if (onSelect) marker.on("click", () => onSelect(p));
        clusterGroup.addLayer(marker);
        markersRef.current.set(p.id, marker);
      }
    });
  }, [points, metric, emphasizeCorridor, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !focusPoint) return;
    const marker = markersRef.current.get(focusPoint.id);
    if (!marker) return;

    if (focusPoint.isCorridor) {
      // Corridor markers are never clustered, so a plain flyTo works;
      // wait for the pan/zoom to finish before opening the popup.
      map.flyTo([focusPoint.lat, focusPoint.lng], 9, { duration: 0.75 });
      map.once("moveend", () => marker.openPopup());
    } else if (clusterGroup) {
      // Urban markers may be merged into a cluster icon; zoomToShowLayer
      // zooms in exactly as far as needed to reveal this one, then opens
      // its popup via the callback.
      clusterGroup.zoomToShowLayer(marker, () => marker.openPopup());
    }
  }, [focusPoint]);

  return <div ref={containerRef} className="h-full w-full" />;
}
