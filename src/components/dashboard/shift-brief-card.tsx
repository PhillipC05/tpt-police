"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, RefreshCw, AlertTriangle, Siren } from "lucide-react";

interface Incident {
  id: string;
  type: string;
  status: string;
  description: string | null;
  location: string | null;
  reportedAt: string;
}

interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
}

interface ShiftBrief {
  generatedAt: string;
  period: string;
  openIncidents: Incident[];
  activeAlerts: Alert[];
  updatedCaseCount: number;
  officersOnDuty: number;
  aiSummary: string | null;
}

const SHIFT_ROLES = ["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN", "OFFICER", "DETECTIVE", "DISPATCHER"];

export function ShiftBriefCard({ userRole }: { userRole: string }) {
  const [brief, setBrief] = useState<ShiftBrief | null>(null);
  const [loading, setLoading] = useState(false);

  if (!SHIFT_ROLES.includes(userRole)) return null;

  async function loadBrief() {
    setLoading(true);
    try {
      const res = await fetch("/api/shifts/handover-brief");
      if (res.ok) setBrief(await res.json());
    } finally {
      setLoading(false);
    }
  }

  if (!brief) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4" />
            Shift Handover Brief
          </CardTitle>
          <CardDescription>Get a summary of the last 8 hours for your incoming shift.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={loadBrief} disabled={loading}>
            {loading ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <ClipboardList className="w-3 h-3 mr-2" />}
            {loading ? "Loading brief…" : "Load Shift Brief"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4" />
            Shift Handover Brief
          </CardTitle>
          <CardDescription>
            {brief.period} · Generated {new Date(brief.generatedAt).toLocaleTimeString()} ·
            {brief.officersOnDuty} officers on duty
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={loadBrief} disabled={loading} className="h-8 w-8">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {brief.aiSummary && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed border-l-4 border-primary">
            {brief.aiSummary}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {brief.openIncidents.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                <Siren className="w-3 h-3 text-red-500" />
                Open Incidents ({brief.openIncidents.length})
              </h4>
              <ul className="space-y-1">
                {brief.openIncidents.slice(0, 5).map((inc) => (
                  <li key={inc.id} className="text-xs text-muted-foreground flex items-start gap-1">
                    <Badge variant="outline" className="text-[10px] py-0 shrink-0">{inc.type}</Badge>
                    <span>{inc.location ?? inc.description ?? "No details"}</span>
                  </li>
                ))}
                {brief.openIncidents.length > 5 && (
                  <li className="text-xs text-muted-foreground">+{brief.openIncidents.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {brief.activeAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                Active Alerts ({brief.activeAlerts.length})
              </h4>
              <ul className="space-y-1">
                {brief.activeAlerts.map((alert) => (
                  <li key={alert.id} className="text-xs text-muted-foreground flex items-start gap-1">
                    <Badge variant="destructive" className="text-[10px] py-0 shrink-0">{alert.type}</Badge>
                    <span>{alert.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {brief.openIncidents.length === 0 && brief.activeAlerts.length === 0 && (
            <div className="col-span-2 text-sm text-muted-foreground">
              No open incidents or active alerts in the last 8 hours.
            </div>
          )}
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground border-t pt-3">
          <span>Updated cases: <strong className="text-foreground">{brief.updatedCaseCount}</strong></span>
          <span>Officers on duty: <strong className="text-foreground">{brief.officersOnDuty}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
