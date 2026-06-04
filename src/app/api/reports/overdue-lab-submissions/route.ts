import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const threshold = parseInt(searchParams.get("threshold") || "7"); // days overdue

  const overdue = await prisma.labSubmission.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: { in: ["SUBMITTED", "IN_ANALYSIS", "RESULTS_READY"] },
      expectedTurnaround: { not: null },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const overdueItems = overdue
    .filter((ls) => {
      if (!ls.expectedTurnaround) return false;
      const dueDate = new Date(ls.createdAt);
      dueDate.setDate(dueDate.getDate() + ls.expectedTurnaround);
      return dueDate < now;
    })
    .map((ls) => {
      const dueDate = new Date(ls.createdAt);
      dueDate.setDate(dueDate.getDate() + ls.expectedTurnaround!);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: ls.id,
        labReferenceNo: ls.labReferenceNo,
        type: ls.type,
        status: ls.status,
        daysOverdue,
        dueDate: dueDate.toISOString(),
        createdAt: ls.createdAt.toISOString(),
        evidenceId: ls.evidenceId,
        submittedById: ls.submittedById,
      };
    });

  return NextResponse.json({
    total: overdueItems.length,
    threshold,
    items: overdueItems,
  });
}