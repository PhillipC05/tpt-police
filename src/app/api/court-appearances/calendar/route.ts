import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const officerId = searchParams.get("officerId") || session.user.id;
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const where: Record<string, unknown> = { officerId };
  if (fromDate && toDate) {
    where.courtDate = { gte: new Date(fromDate), lte: new Date(toDate) };
  }

  const appearances = await prisma.courtAppearance.findMany({
    where,
    include: {
      case: { select: { id: true, caseNumber: true, title: true, type: true } },
    },
    orderBy: { courtDate: "asc" },
  });

  return NextResponse.json(appearances);
}