import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "monthly"; // weekly, monthly, yearly
  const compareTenantIds = searchParams.get("tenants") ?? "";
  const daysParam = searchParams.get("days") ?? "365";
  const days = parseInt(daysParam);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const userTenantId = session.user.tenantId;
  const tenantIds = compareTenantIds
    ? compareTenantIds.split(",").concat(userTenantId)
    : [userTenantId];

  // Build date truncation based on period
  const dateTrunc = period === "yearly" ? "year" : period === "weekly" ? "week" : "month";

  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, name: true, type: true },
  });

  const trendsRaw = await Promise.all(
    tenantIds.map(async (tenantId) => {
      const totalCases = await prisma.case.count({ where: { tenantId } });
      const closedCases = await prisma.case.count({ where: { tenantId, status: "CLOSED" } });
      const activeCases = await prisma.case.count({
        where: { tenantId, status: { in: ["OPEN", "ACTIVE", "REVIEW"] } },
      });

      // Monthly case creation trend
      const caseTrend = await prisma.case.findMany({
        where: { tenantId, createdAt: { gte: since } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      });

      // Aggregate by period
      const trendMap = new Map<string, { created: number; closed: number }>();
      caseTrend.forEach((c) => {
        const d = c.createdAt;
        let key: string;
        if (dateTrunc === "year") {
          key = `${d.getFullYear()}`;
        } else if (dateTrunc === "month") {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        } else {
          // week - get ISO week number
          const startOfYear = new Date(d.getFullYear(), 0, 1);
          const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
          key = `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
        }
        const entry = trendMap.get(key) ?? { created: 0, closed: 0 };
        entry.created++;
        if (c.status === "CLOSED") entry.closed++;
        trendMap.set(key, entry);
      });

      const trendData = Array.from(trendMap.entries())
        .map(([periodKey, counts]) => ({
          period: periodKey,
          created: counts.created,
          closed: counts.closed,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return {
        tenantId,
        tenantName: tenants.find((t) => t.id === tenantId)?.name ?? "Unknown",
        tenantType: tenants.find((t) => t.id === tenantId)?.type ?? "PRECINCT",
        totalCases,
        closedCases,
        activeCases,
        clearanceRate: totalCases > 0 ? (closedCases / totalCases) * 100 : 0,
        trendData,
      };
    }),
  );

  // Cross-tenant comparison summary
  const comparisonSummary = trendsRaw.map((t) => ({
    name: t.tenantName,
    type: t.tenantType,
    totalCases: t.totalCases,
    clearanceRate: t.clearanceRate,
    activeCases: t.activeCases,
  }));

  return NextResponse.json({
    trends: trendsRaw,
    comparisonSummary,
    period,
    generatedAt: new Date().toISOString(),
  });
}