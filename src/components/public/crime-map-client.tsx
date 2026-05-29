"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MapPin, TrendingUp } from "lucide-react";

interface TypeCount {
  type: string;
  count: number;
}

export function CrimeMapClient({ types }: { types: TypeCount[] }) {
  const [selectedType, setSelectedType] = useState<string>("all");

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Incident Type Distribution</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedType} onValueChange={(v: string | null) => setSelectedType(v ?? "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t.type} value={t.type}>{t.type.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg mb-4">
            <div className="text-center">
              <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Interactive map view</p>
              <p className="text-xs text-muted-foreground mt-1">Map integration requires API key setup</p>
              <p className="text-xs text-muted-foreground">{totalCount} incidents mapped</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Incident Type</span>
              <span>Count</span>
            </div>
            <div className="space-y-1">
              {filteredTypes.map((t) => (
                <div key={t.type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={typeColors[t.type] ?? typeColors.OTHER}>{t.type.replace(/_/g, " ")}</Badge>
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
              <p className="text-xs text-muted-foreground">Crime trend charts and heatmap overlay</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}