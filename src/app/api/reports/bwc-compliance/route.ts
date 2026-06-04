import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  const officerId = searchParams.get("officerId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const minIncidents = parseInt(searchParams.get("minIncidents") || "1");

  const tid = session.user.tenantId;

  // Get all officers in the tenant who have incident-related shifts or appear in BWC events
  const officers = await prisma.user.findMany({
    where: {
      tenantId: tid,
      role: { in: ["OFFICER", "DETECTIVE", "DISPATCHER"] },
      status: "ACTIVE",
    },
    select: { id: true, name: true, badgeNumber: true, rank: true },
  });

  const dateFilter: Record<string, unknown> = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) dateFilter.lte = new Date(dateTo);

  const incidentsWhere: Record<string, unknown> = { tenantId: tid };
  if (Object.keys(dateFilter).length) {
    incidentsWhere.reportedAt = dateFilter;
  }

  const totalIncidents = await prisma.incident.count({ where: incidentsWhere });

  const result = await Promise.all(
    officers.map(async (officer) => {
      const bwcEventsWhere: Record<string, unknown> = { officerId: officer.id };
      if (Object.keys(dateFilter).length) bwcEventsWhere.startedAt = dateFilter;

      const officerIncidentsWhere: Record<string, unknown> = {
        ...incidentsWhere,
        useOfForce: { some: { officerId: officer.id } },
      };

      const [totalBwcEvents, flaggedEvents, officerIncidents] = await Promise.all([
        prisma.bWCEvent.count({ where: bwcEventsWhere }),
        prisma.bWCEvent.count({ where: { ...bwcEventsWhere, flagged: true } }),
        prisma.incident.count({ where: officerIncidentsWhere }),
      ]);

      const complianceRate = officerIncidents > 0 ? Math.round((totalBwcEvents / Math.max(officerIncidents, 1)) * 100) : 100;
      const compliant = totalBwcEvents >= officerIncidents;

      return {
        officerId: officer.id,
        officerName: officer.name,
        badgeNumber: officer.badgeNumber,
        rank: officer.rank,
        totalIncidents: officerIncidents,
        bwcEvents: totalBwcEvents,
        flaggedEvents,
        complianceRate,
        compliant,
      };
    })
  );

  const filtered = result.filter((r) => r.totalIncidents >= minIncidents);

  if (format === "csv") {
    const header = "Officer Name,Badge Number,Rank,Total Incidents,BWC Events,Flagged Events,Compliance Rate (%),Compliant\n";
    const rows = filtered
      .map((r) => `${r.officerName},${r.badgeNumber || "N/A"},${r.rank || "N/A"},${r.totalIncidents},${r.bwcEvents},${r.flaggedEvents},${r.complianceRate},${r.compliant ? "Yes" : "No"}`)
      .join("\n");
    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bwc-compliance-${tid}.csv"`,
      },
    });
  }

  return NextResponse.json({
    totalOfficers: filtered.length,
    totalIncidents,
    compliant: filtered.filter((r) => r.compliant).length,
    nonCompliant: filtered.filter((r) => !r.compliant).length,
    officers: filtered,
  });
}