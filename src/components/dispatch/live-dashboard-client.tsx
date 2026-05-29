"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Radio,
  MapPin,
  AlertTriangle,
  Activity,
  RefreshCw,
  Link2,
  User,
  Navigation,
  Compass,
  Clock,
  WifiOff,
  Shield,
  Car,
  Footprints,
} from "lucide-react";
import { toast } from "sonner";

interface Incident {
  id: string;
  externalId: string | null;
  type: string;
  status: string;
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  reportedAt: string;
  linkedCases: Array<{ id: string; caseNumber: string; title: string }>;
}

interface OfficerInfo {
  id: string;
  name: string;
  badgeNumber: string | null;
  rank: string | null;
  department: string | null;
  photoUrl: string | null;
}

interface OfficerLocation {
  id: string;
  officerId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  status: string;
  updatedAt: string;
  officer: OfficerInfo;
}

type StatusVariant = "ON_DUTY" | "OFF_DUTY" | "EN_ROUTE" | "ON_SCENE" | "BREAK" | "UNAVAILABLE";

const statusConfig: Record<string, { label: string; color: string; dotColor: string; icon: React.ReactNode }> = {
  ON_DUTY: { label: "On Duty", color: "text-green-500", dotColor: "bg-green-500", icon: <Shield className="w-3.5 h-3.5" /> },
  OFF_DUTY: { label: "Off Duty", color: "text-gray-500", dotColor: "bg-gray-500", icon: <WifiOff className="w-3.5 h-3.5" /> },
  EN_ROUTE: { label: "En Route", color: "text-blue-500", dotColor: "bg-blue-500", icon: <Car className="w-3.5 h-3.5" /> },
  ON_SCENE: { label: "On Scene", color: "text-amber-500", dotColor: "bg-amber-500", icon: <Footprints className="w-3.5 h-3.5" /> },
  BREAK: { label: "On Break", color: "text-purple-500", dotColor: "bg-purple-500", icon: <Clock className="w-3.5 h-3.5" /> },
  UNAVAILABLE: { label: "Unavailable", color: "text-red-500", dotColor: "bg-red-500", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

function getStaleStatus(updatedAt: string): "fresh" | "stale" | "expired" {
  const diff = Date.now() - new Date(updatedAt).getTime();
  if (diff < 5 * 60 * 1000) return "fresh";
  if (diff < 15 * 60 * 1000) return "stale";
  return "expired";
}

export function LiveDashboardClient() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [officerLocations, setOfficerLocations] = useState<OfficerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/cases/incidents");
      if (res.ok) setIncidents(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchOfficerLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/dispatch/officer-locations");
      if (res.ok) setOfficerLocations(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchIncidents(), fetchOfficerLocations()]);
  }, [fetchIncidents, fetchOfficerLocations]);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAll]);

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-red-500",
    RESOLVED: "bg-green-500",
    CANCELLED: "bg-gray-500",
  };

  const onlineOfficers = officerLocations.filter(
    (loc) => loc.status !== "OFF_DUTY" && loc.status !== "UNAVAILABLE",
  );
  const staleOfficers = officerLocations.filter(
    (loc) => getStaleStatus(loc.updatedAt) === "expired",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Dispatch Dashboard</h2>
        <div className="flex items-center gap-2">
          {staleOfficers.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="w-3 h-3" />
              {staleOfficers.length} stale GPS
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <User className="w-3 h-3" />
            {onlineOfficers.length} online
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh(!autoRefresh)}>
            <Activity className={`w-4 h-4 mr-1 ${autoRefresh ? "text-green-500" : "text-gray-400"}`} />
            {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchAll}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <Activity className="w-6 h-6 animate-pulse" />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Officer GPS Status Board */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                Officer GPS Locations
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {officerLocations.length} officer{officerLocations.length !== 1 ? "s" : ""} reporting
              </Badge>
            </CardHeader>
            <CardContent>
              {officerLocations.length === 0 ? (
                <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <MapPin className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">No officer GPS data available</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Officers need to report their location via the dispatch system
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {officerLocations.map((loc) => {
                    const config = statusConfig[loc.status] ?? statusConfig.UNAVAILABLE;
                    const staleness = getStaleStatus(loc.updatedAt);
                    const staleClass =
                      staleness === "expired"
                        ? "opacity-40"
                        : staleness === "stale"
                          ? "opacity-70"
                          : "";

                    return (
                      <div
                        key={loc.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${staleClass} transition-opacity`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Status indicator dot */}
                          <div className="relative">
                            <div
                              className={`w-3 h-3 rounded-full ${config.dotColor} ${staleness === "fresh" ? "animate-pulse" : ""}`}
                            />
                          </div>

                          {/* Officer photo/avatar */}
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                            {loc.officer.photoUrl ? (
                              <img
                                src={loc.officer.photoUrl}
                                alt={loc.officer.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>

                          {/* Officer info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {loc.officer.name}
                              </span>
                              {loc.officer.badgeNumber && (
                                <span className="text-xs text-muted-foreground">
                                  #{loc.officer.badgeNumber}
                                </span>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1 py-0 h-4 ${config.color}`}
                              >
                                <span className="flex items-center gap-0.5">
                                  {config.icon}
                                  {config.label}
                                </span>
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {loc.officer.rank && <span>{loc.officer.rank}</span>}
                              <span className="flex items-center gap-1">
                                <Navigation className="w-3 h-3" />
                                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                              </span>
                              {loc.heading !== null && (
                                <span className="flex items-center gap-1">
                                  <Compass className="w-3 h-3" />
                                  {loc.heading.toFixed(0)}°
                                </span>
                              )}
                              {loc.speed !== null && loc.speed > 0 && (
                                <span className="flex items-center gap-1">
                                  <Car className="w-3 h-3" />
                                  {loc.speed.toFixed(1)} km/h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Update time */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {getRelativeTime(loc.updatedAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incident Feed */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Active Incidents
            </h3>
            {incidents.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <Radio className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No active incidents</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Incidents from dispatch system will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              incidents.map((incident) => (
                <Card
                  key={incident.id}
                  className="border-l-4"
                  style={{
                    borderLeftColor:
                      incident.status === "ACTIVE"
                        ? "#ef4444"
                        : incident.status === "RESOLVED"
                          ? "#22c55e"
                          : "#6b7280",
                  }}
                >
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${statusColors[incident.status] ?? "bg-gray-500"} animate-pulse`}
                        />
                        <CardTitle className="text-base">{incident.type}</CardTitle>
                        <Badge variant={incident.status === "ACTIVE" ? "destructive" : "secondary"}>
                          {incident.status}
                        </Badge>
                      </div>
                      {incident.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {incident.description}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(incident.reportedAt).toLocaleString()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      {incident.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {incident.location}
                        </span>
                      )}
                      {incident.externalId && (
                        <span className="flex items-center gap-1">
                          <Radio className="w-4 h-4" /> #{incident.externalId}
                        </span>
                      )}
                    </div>
                    {incident.linkedCases.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Link2 className="w-4 h-4 text-muted-foreground" />
                        {incident.linkedCases.map((c) => (
                          <Badge key={c.id} variant="outline" className="text-xs">
                            {c.caseNumber}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}