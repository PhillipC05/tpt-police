import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (!["SUPER_ADMIN", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const officerId = searchParams.get("officerId");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (statusFilter) where.status = statusFilter;
  if (officerId) where.subjectOfficerId = officerId;

  const complaints = await prisma.civilianComplaint.findMany({
    where,
    include: {
      subjectOfficer: { select: { id: true, name: true, badgeNumber: true, rank: true, department: true } },
      assignedReviewer: { select: { id: true, name: true } },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });

  const summary = {
    total: complaints.length,
    byStatus: {
      RECEIVED: complaints.filter((c) => c.status === "RECEIVED").length,
      ASSIGNED: complaints.filter((c) => c.status === "ASSIGNED").length,
      INVESTIGATING: complaints.filter((c) => c.status === "INVESTIGATING").length,
      RESOLVED: complaints.filter((c) => c.status === "RESOLVED").length,
    },
    byOutcome: {
      SUSTAINED: complaints.filter((c) => c.outcome === "SUSTAINED").length,
      NOT_SUSTAINED: complaints.filter((c) => c.outcome === "NOT_SUSTAINED").length,
      EXONERATED: complaints.filter((c) => c.outcome === "EXONERATED").length,
      UNFOUNDED: complaints.filter((c) => c.outcome === "UNFOUNDED").length,
    },
    byType: {} as Record<string, number>,
  };

  for (const c of complaints) {
    summary.byType[c.complaintType] = (summary.byType[c.complaintType] || 0) + 1;
  }

  return NextResponse.json({ summary, complaints });
}