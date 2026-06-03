import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days") ?? "30";
  const days = parseInt(daysParam);
  const exportFormat = searchParams.get("export");

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const tenantId = session.user.tenantId;

  interface TypeGroup {
    type: string;
    _count: { id: number };
  }

  interface StatusGroup {
    status: string;
    _count: { id: number };
  }

  interface UserGroup {
    userId: string;
    _count: { id: number };
  }

  interface UserRecord {
    id: string;
    name: string;
  }

  const [totalCases, openCases, casesByType, casesByStatus, officers, officerAssignments, recentCases] = await Promise.all([
    prisma.case.count({ where: { tenantId } }),
    prisma.case.count({ where: { tenantId, status: { not: "CLOSED" } } }),
    prisma.case.groupBy({
      by: ["type"] as const,
      _count: { id: true },
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { _count: { id: "desc" } },
    }) as unknown as Promise<TypeGroup[]>,
    prisma.case.groupBy({
      by: ["status"] as const,
      _count: { id: true },
      where: { tenantId },
    }) as unknown as Promise<StatusGroup[]>,
    prisma.user.count({ where: { tenantId, status: "ACTIVE", role: { in: ["DETECTIVE", "OFFICER"] } } }),
    prisma.caseAssignment.groupBy({
      by: ["userId"] as const,
      _count: { id: true },
      where: { case: { tenantId } },
    }) as unknown as Promise<UserGroup[]>,
    prisma.case.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const resolvedCases = await prisma.case.count({
    where: { tenantId, status: "CLOSED" },
  });

  const clearanceRate = totalCases > 0 ? (resolvedCases / totalCases) * 100 : 0;

  const topPerformerIds = officerAssignments
    .sort((a: UserGroup, b: UserGroup) => b._count.id - a._count.id)
    .slice(0, 10)
    .map((a: UserGroup) => a.userId);

  const topPerformerUsers = await prisma.user.findMany({
    where: { id: { in: topPerformerIds } },
    select: { id: true, name: true },
  });

  const topPerformers = topPerformerIds.map((id: string) => {
    const user = topPerformerUsers.find((u: UserRecord) => u.id === id);
    const assignment = officerAssignments.find((a: UserGroup) => a.userId === id);
    return {
      id,
      name: user?.name ?? "Unknown",
      caseCount: assignment?._count.id ?? 0,
    };
  });

  const activityMap = new Map<string, number>();
  recentCases.forEach((c: { createdAt: Date }) => {
    const dateKey = c.createdAt.toISOString().split("T")[0];
    activityMap.set(dateKey, (activityMap.get(dateKey) ?? 0) + 1);
  });
  const recentActivity = Array.from(activityMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const analytics = {
    totalCases,
    openCases,
    resolvedCases,
    clearanceRate,
    byType: casesByType.map((t: TypeGroup) => ({ type: t.type, count: t._count.id })),
    byStatus: casesByStatus.map((s: StatusGroup) => ({ status: s.status, count: s._count.id })),
    officerMetrics: {
      totalOfficers: officers,
      avgCasesPerOfficer: officers > 0 ? (totalCases / officers) : 0,
      topPerformers,
    },
    recentActivity,
    period: { days, since: since.toISOString() },
  };

  if (exportFormat === "csv") {
    const csvHeader = "Type,Count\n";
    const csvBody = casesByType.map((t: TypeGroup) => `${t.type},${t._count.id}`).join("\n");
    const csv = csvHeader + csvBody;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="analytics-${days}-days.csv"`,
      },
    });
  }

  if (exportFormat === "pdf") {
    const report = [
      `TPT Police Analytics Report`,
      `Period: Last ${days} days`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `Total Cases: ${totalCases}`,
      `Open Cases: ${openCases}`,
      `Clearance Rate: ${clearanceRate.toFixed(1)}%`,
      `Active Officers: ${officers}`,
      ``,
      `Cases by Type:`,
      ...casesByType.map((t: TypeGroup) => `  ${t.type}: ${t._count.id}`),
      ``,
      `Top Performers:`,
      ...topPerformers.slice(0, 5).map((o) => `  ${o.name}: ${o.caseCount} cases`),
    ].join("\n");

    return new NextResponse(report, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="analytics-${days}-days.txt"`,
      },
    });
  }

  return NextResponse.json(analytics);
}