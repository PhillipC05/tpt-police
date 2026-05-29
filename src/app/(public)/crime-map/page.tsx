import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Filter, CalendarDays } from "lucide-react";
import { CrimeMapClient } from "@/components/public/crime-map-client";

export default async function CrimeMapPage() {
  // Fetch aggregated, anonymized incident data (no case details, just types and counts by date)
  const incidentTypes = await prisma.case.groupBy({
    by: ["type"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const totalCases = incidentTypes.reduce((sum, t) => sum + t._count.id, 0);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crime Map</h1>
        <p className="text-muted-foreground">Anonymized incident data for public transparency.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Common</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidentTypes[0]?.type ?? "N/A"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date().toLocaleString("default", { month: "short", year: "2-digit" })}
            </div>
          </CardContent>
        </Card>
      </div>

      <CrimeMapClient types={incidentTypes.map(t => ({ type: t.type, count: t._count.id }))} />
    </div>
  );
}