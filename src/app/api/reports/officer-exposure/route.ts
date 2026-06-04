import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const officerId = searchParams.get("officerId");

  const tid = session.user.tenantId;

  const where: Record<string, unknown> = { tenantId: tid, status: "ACTIVE", role: { in: ["OFFICER", "DETECTIVE"] } };
  if (officerId) where.id = officerId;

  const officers = await prisma.user.findMany({
    where,
    select: { id: true, name: true, badgeNumber: true, rank: true, department: true },
  });

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const scores = await Promise.all(
    officers.map(async (officer) => {
      const recentDateFilter = { gte: oneYearAgo };

      const [useOfForceCount, uofWithInjury, complaintCount, criticalIncidents, wellnessCount, panicCount, courtMissed] = await Promise.all([
        prisma.useOfForce.count({ where: { officerId: officer.id, incidentDate: recentDateFilter } }),
        prisma.useOfForce.count({ where: { officerId: officer.id, incidentDate: recentDateFilter, OR: [{ officerInjured: true }, { subjectInjured: true }] } }),
        prisma.civilianComplaint.count({ where: { subjectOfficerId: officer.id, createdAt: recentDateFilter } }),
        prisma.incident.count({ where: { description: { contains: "CRITICAL" }, useOfForce: { some: { officerId: officer.id } } } }),
        prisma.wellnessCheckin.count({ where: { officerId: officer.id, checkinDate: recentDateFilter, moodScore: { lte: 2 } } }),
        prisma.panicEvent.count({ where: { officerId: officer.id, createdAt: recentDateFilter } }),
        prisma.courtAppearance.count({ where: { officerId: officer.id, status: "MISSED", courtDate: recentDateFilter } }),
      ]);

      // Exposure score calculation
      const score = Math.min(100, Math.round(
        useOfForceCount * 5 +
        uofWithInjury * 10 +
        complaintCount * 8 +
        criticalIncidents * 15 +
        wellnessCount * 3 +
        panicCount * 12 +
        courtMissed * 6
      ));

      const level = score < 20 ? "LOW" : score < 50 ? "MEDIUM" : score < 75 ? "HIGH" : "CRITICAL";

      return {
        officerId: officer.id,
        officerName: officer.name,
        badgeNumber: officer.badgeNumber,
        rank: officer.rank,
        department: officer.department,
        exposureScore: score,
        exposureLevel: level,
        metrics: {
          useOfForceIncidents: useOfForceCount,
          useOfForceWithInjury: uofWithInjury,
          civilianComplaints: complaintCount,
          criticalIncidents,
          lowMoodCheckins: wellnessCount,
          panicEvents: panicCount,
          missedCourt: courtMissed,
        },
      };
    })
  );

  scores.sort((a, b) => b.exposureScore - a.exposureScore);

  return NextResponse.json({
    totalOfficers: scores.length,
    highRisk: scores.filter((s) => s.exposureLevel === "HIGH" || s.exposureLevel === "CRITICAL").length,
    scores,
  });
}