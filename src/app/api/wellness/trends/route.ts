import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const officerId = searchParams.get("officerId");

  const where: Record<string, unknown> = { officer: { tenantId: session.user.tenantId } };
  if (dateFrom) where.checkinDate = { gte: new Date(dateFrom) };
  if (dateTo) where.checkinDate = { ...(where.checkinDate as Record<string, unknown> || {}), lte: new Date(dateTo) };
  if (officerId) where.officerId = officerId;

  const checkins = await prisma.wellnessCheckin.findMany({
    where,
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true, department: true } },
    },
    orderBy: { checkinDate: "desc" },
  });

  const averageMood = checkins.length > 0
    ? Math.round((checkins.reduce((sum, c) => sum + c.moodScore, 0) / checkins.length) * 10) / 10
    : 0;

  const trends = {
    totalCheckins: checkins.length,
    averageMood,
    flaggedForFollowUp: checkins.filter((c) => c.flagged).length,
    byScore: {
      "1": checkins.filter((c) => c.moodScore === 1).length,
      "2": checkins.filter((c) => c.moodScore === 2).length,
      "3": checkins.filter((c) => c.moodScore === 3).length,
      "4": checkins.filter((c) => c.moodScore === 4).length,
      "5": checkins.filter((c) => c.moodScore === 5).length,
    },
    byDepartment: {} as Record<string, { count: number; avgMood: number }>,
  };

  // Group by department
  const deptMap = new Map<string, { scores: number[] }>();
  for (const c of checkins) {
    const dept = c.officer.department || "Unassigned";
    if (!deptMap.has(dept)) deptMap.set(dept, { scores: [] });
    deptMap.get(dept)!.scores.push(c.moodScore);
  }
  for (const [dept, data] of deptMap) {
    trends.byDepartment[dept] = {
      count: data.scores.length,
      avgMood: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10,
    };
  }

  return NextResponse.json({ trends, checkins });
}