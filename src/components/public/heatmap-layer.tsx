"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  count: number;
}

interface HeatmapLayerProps {
  map: L.Map | null;
  points: HeatmapPoint[];
  radius?: number;
  blur?: number;
  maxOpacity?: number;
  gradient?: Record<number, string>;
}

export function HeatmapLayer({
  map,
  points,
  radius = 25,
  blur = 15,
  maxOpacity = 0.7,
  gradient,
}: HeatmapLayerProps) {
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map || points.length === 0) {
      if (!map && layerRef.current) {
        layerRef.current = null;
      }
      return;
    }

    // Clear existing layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const defaultGradient = gradient ?? {
      0.4: "blue",
      0.6: "cyan",
      0.7: "lime",
      0.8: "yellow",
      1.0: "red",
    } as Record<number, string>;

    // Build [lat, lng, intensity] tuples for leaflet.heat
    const heatLatLngs: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ]);

    const layer = (L as any).heatLayer(heatLatLngs, {
      minOpacity: maxOpacity,
      radius,
      blur,
      gradient: defaultGradient,
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, radius, blur, maxOpacity, gradient]);

  return null;
}