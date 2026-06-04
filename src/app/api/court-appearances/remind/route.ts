import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const daysBefore = parseInt(searchParams.get("days") || "3");
  const now = new Date();
  const targetDate = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000);

  // Find appearances coming up in N days that haven't had a reminder sent
  const upcoming = await prisma.courtAppearance.findMany({
    where: {
      tenantId: session.user.tenantId,
      status: "SCHEDULED",
      reminderSent: false,
      courtDate: {
        gte: new Date(targetDate.getTime() - 24 * 60 * 60 * 1000),
        lte: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      officer: { select: { id: true, name: true, email: true } },
      case: { select: { caseNumber: true, title: true } },
    },
  });

  // Mark reminders as sent
  if (upcoming.length > 0) {
    await prisma.courtAppearance.updateMany({
      where: { id: { in: upcoming.map((a) => a.id) } },
      data: { reminderSent: true },
    });
  }

  return NextResponse.json({
    reminded: upcoming.length,
    appearances: upcoming.map((a) => ({
      id: a.id,
      officerName: a.officer.name,
      officerEmail: a.officer.email,
      caseNumber: a.case?.caseNumber,
      courtDate: a.courtDate,
      courtName: a.courtName,
      matterType: a.matterType,
    })),
  });
}