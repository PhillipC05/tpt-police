import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const tid = session.user.tenantId;

  const zones = await prisma.patrolZone.findMany({
    where: { tenantId: tid, isActive: true },
    include: {
      zoneHistory: { orderBy: { recordedAt: "desc" }, take: 30 },
    },
  });

  // Get current officer counts per shift type
  const now = new Date();
  const currentHour = now.getHours();
  let currentShiftType: string;
  if (currentHour >= 6 && currentHour < 14) currentShiftType = "MORNING";
  else if (currentHour >= 14 && currentHour < 22) currentShiftType = "AFTERNOON";
  else currentShiftType = "NIGHT";

  const activeOfficers = await prisma.officerLocation.count({
    where: {
      tenantId: tid,
      status: "ON_DUTY",
      updatedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // last 30 min
    },
  });

  const assignedOfficers = await prisma.shiftAssignment.count({
    where: {
      shift: { tenantId: tid, type: currentShiftType as any, startTime: { lte: now }, endTime: { gte: now } },
    },
  });

  const coverage = zones.map((zone) => {
    const avgResponse = zone.zoneHistory.length > 0
      ? zone.zoneHistory.reduce((s, h) => s + (h.avgResponseTime || 0), 0) / zone.zoneHistory.length
      : null;
    const avgIncidents = zone.zoneHistory.length > 0
      ? zone.zoneHistory.reduce((s, h) => s + (h.incidentDensity || 0), 0) / zone.zoneHistory.length
      : null;

    const coverageGap = assignedOfficers < zone.recommendedOfficerCount
      ? zone.recommendedOfficerCount - assignedOfficers
      : 0;

    return {
      id: zone.id,
      name: zone.name,
      recommendedOfficers: zone.recommendedOfficerCount,
      currentAssigned: assignedOfficers,
      coverageGap,
      avgResponseTime: avgResponse ? Math.round(avgResponse * 10) / 10 : null,
      avgIncidentDensity: avgIncidents ? Math.round(avgIncidents * 100) / 100 : null,
      isUnderstaffed: coverageGap > 0,
    };
  });

  return NextResponse.json({
    shiftType: currentShiftType,
    activeOfficers,
    totalAssigned: assignedOfficers,
    totalZones: zones.length,
    zonesWithGaps: coverage.filter((z) => z.coverageGap > 0).length,
    coverage,
  });
}