"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DataPoint } from "@/lib/types";

export type MetricKey = "gapScore" | "demandScore" | "existingChargers";

interface Props {
  points: DataPoint[];
  metric: MetricKey;
  onSelect?: (point: DataPoint) => void;
  emphasizeCorridor?: boolean;
}

const METRIC_MAX: Record<MetricKey, number> = {
  gapScore: 99,
  demandScore: 99,
  existingChargers: 12,
};

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

export default function MapView({ points, metric, onSelect, emphasizeCorridor }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [22.5, 79],
      zoom: 5,
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;
    layerGroup.clearLayers();

    const max = METRIC_MAX[metric];
    points.forEach((p) => {
      const value = p[metric] as number;
      const radius = p.isCorridor ? 7 : 5 + (value / max) * 7;
      const color = colorForValue(value, max);
      let fillOpacity = 0.85;
      if (emphasizeCorridor !== undefined) {
        const relevant = emphasizeCorridor ? p.isCorridor : !p.isCorridor;
        fillOpacity = relevant ? 0.9 : 0.22;
      }
      const circle = L.circleMarker([p.lat, p.lng], {
        radius,
        color: "rgba(27,29,34,0.35)",
        weight: 1,
        fillColor: color,
        fillOpacity,
        className: "point-marker",
      });
      circle.bindPopup(
        `<div style="font-family: 'Inter', sans-serif; min-width: 180px; color: #1B1D22;">
          <div style="font-family: 'Newsreader', serif; font-size: 16px; margin-bottom: 4px;">${p.name}</div>
          <div style="color:#6B6F76; font-size:11px; margin-bottom:8px;">${p.city}, ${p.state}</div>
          <div style="font-size:13px; line-height:1.6;">
            Demand score &nbsp;<strong>${p.demandScore}</strong><br/>
            Existing chargers &nbsp;<strong>${p.existingChargers}</strong><br/>
            Gap score &nbsp;<strong>${p.gapScore}</strong>
          </div>
        </div>`
      );
      if (onSelect) {
        circle.on("click", () => onSelect(p));
      }
      circle.addTo(layerGroup);
    });
  }, [points, metric, onSelect]);

  return <div ref={containerRef} className="h-full w-full" />;
}
