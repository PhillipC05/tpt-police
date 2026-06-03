"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { HeatmapLayer, HeatmapPoint } from "./heatmap-layer";

// Fix Leaflet default icon issue
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

interface CrimeMapViewProps {
  tenantId?: string;
  selectedType?: string;
  showHeatmap?: boolean;
  heatmapPoints?: HeatmapPoint[];
  loading?: boolean;
  error?: string | null;
}

// Default center: New Zealand (adjust as needed)
const DEFAULT_CENTER: [number, number] = [-41.2865, 174.7762];
const DEFAULT_ZOOM = 6;

export function CrimeMapView({
  tenantId,
  selectedType = "all",
  showHeatmap = false,
  heatmapPoints = [],
  loading = false,
  error = null,
}: CrimeMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      fixLeafletIcon();

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);

      mapRef.current = map;
      setMapReady(true);

      // Invalidate size after mount to fix rendering
      setTimeout(() => map.invalidateSize(), 200);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Fetch and display markers
  const fetchAndDisplayMarkers = useCallback(async () => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (selectedType && selectedType !== "all") params.set("type", selectedType);

      const res = await fetch(`/api/public/crime-map/heatmap?${params.toString()}`);
      const data = await res.json();

      if (data.clusters && data.clusters.length > 0) {
        data.clusters.forEach((cluster: { lat: number; lng: number; count: number; topTypes: string[] }) => {
          const size = Math.min(20 + cluster.count * 3, 80);
          const color = cluster.count > 20 ? "red" : cluster.count > 10 ? "orange" : "blue";

          const icon = L.divIcon({
            className: "crime-map-cluster",
            html: `<div style="
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              background: ${color};
              opacity: 0.8;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: ${Math.min(10 + cluster.count, 14)}px;
              border: 2px solid white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            ">${cluster.count}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          const marker = L.marker([cluster.lat, cluster.lng], { icon });
          marker.bindPopup(`
            <div style="font-family: system-ui, sans-serif; padding: 4px;">
              <strong>${cluster.count} incident${cluster.count !== 1 ? "s" : ""}</strong><br/>
              <span style="font-size: 12px; color: #666;">
                Top: ${cluster.topTypes.join(", ")}
              </span>
            </div>
          `);
          markersLayerRef.current?.addLayer(marker);
        });
      }
    } catch (err) {
      console.error("Failed to load crime map markers:", err);
    }
  }, [tenantId, selectedType]);

  useEffect(() => {
    if (mapReady && !showHeatmap) {
      fetchAndDisplayMarkers();
    }
  }, [mapReady, showHeatmap, fetchAndDisplayMarkers]);

  // Clear markers when heatmap is active
  useEffect(() => {
    if (showHeatmap && markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }
  }, [showHeatmap]);

  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  return (
    <div className="relative">
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div
        ref={mapContainerRef}
        className="h-[500px] w-full rounded-lg border z-0"
        style={{ minHeight: "500px" }}
      />
      {mapReady && showHeatmap && heatmapPoints.length > 0 && (
        <HeatmapLayer map={mapRef.current} points={heatmapPoints} />
      )}
      {mapReady && !showHeatmap && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-background/90 backdrop-blur-sm text-xs px-2 py-1 rounded shadow">
          Clustered incident map — click a cluster for details
        </div>
      )}
    </div>
  );
}