"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { MapPin, TrendingUp, Thermometer } from "lucide-react";
import { CrimeMapView } from "./crime-map-view";
import { HeatmapPoint } from "./heatmap-layer";

interface TypeCount {
  type: string;
  count: number;
}

export function CrimeMapClient({ types }: { types: TypeCount[] }) {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<{ points: HeatmapPoint[]; clusters: unknown[] }>({
    points: [],
    clusters: [],
  });
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  const filteredTypes = selectedType === "all"
    ? types
    : types.filter((t) => t.type === selectedType);

  const totalCount = filteredTypes.reduce((sum, t) => sum + t.count, 0);

  const typeColors: Record<string, string> = {
    THEFT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    ASSAULT: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    HOMICIDE: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-100",
    FRAUD: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    DRUG_OFFENCE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CYBERCRIME: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    DOMESTIC_VIOLENCE: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    MISSING_PERSON: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    TRAFFIC: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    PUBLIC_ORDER: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    OTHER: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  };

  // Fetch heatmap data when toggle changes
  useEffect(() => {
    if (!showHeatmap) {
      setHeatmapData({ points: [], clusters: [] });
      return;
    }

    async function fetchHeatmap() {
      setHeatmapLoading(true);
      setHeatmapError(null);
      try {
        const params = new URLSearchParams();
        if (selectedType !== "all") params.set("type", selectedType);

        const res = await fetch(`/api/public/crime-map/heatmap?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setHeatmapData({
          points: data.points ?? [],
          clusters: data.clusters ?? [],
        });
      } catch (err) {
        setHeatmapError(err instanceof Error ? err.message : "Failed to load heatmap data");
        setHeatmapData({ points: [], clusters: [] });
      } finally {
        setHeatmapLoading(false);
      }
    }

    fetchHeatmap();
  }, [showHeatmap, selectedType]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Incident Map</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="heatmap-toggle"
                checked={showHeatmap}
                onCheckedChange={setShowHeatmap}
              />
              <Label htmlFor="heatmap-toggle" className="flex items-center gap-1 text-sm cursor-pointer">
                <Thermometer className="w-3.5 h-3.5" />
                Heatmap
              </Label>
            </div>
            <Select value={selectedType} onValueChange={(v: string | null) => setSelectedType(v ?? "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.type} value={t.type}>
                    {t.type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Interactive map view */}
          <div className="mb-4">
            <CrimeMapView
              selectedType={selectedType}
              showHeatmap={showHeatmap}
              heatmapPoints={heatmapData.points}
              loading={heatmapLoading}
              error={heatmapError}
            />
          </div>

          {/* Heatmap legend */}
          {showHeatmap && heatmapData.points.length > 0 && (
            <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Low
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-cyan-500" />
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-lime-500" />
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                High
              </span>
              <span className="ml-auto">{heatmapData.points.length} heat zones · {heatmapData.points.reduce((s, p) => s + p.count, 0)} incidents mapped</span>
            </div>
          )}

          {/* Stats list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Incident Type</span>
              <span>Count</span>
            </div>
            <div className="space-y-1">
              {filteredTypes.map((t) => (
                <div key={t.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={typeColors[t.type] ?? typeColors.OTHER}>
                      {t.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trend Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
            <div className="text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Crime trend charts — placeholder</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}