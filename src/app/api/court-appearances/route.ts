import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  caseId: z.string().optional(),
  courtDate: z.string().datetime(),
  courtName: z.string().min(1),
  matterType: z.enum(["WITNESS", "PROSECUTION", "HEARING"]),
  subpoenaFileUrl: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const officerId = searchParams.get("officerId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (officerId) where.officerId = officerId;
  else if (session.user.role === "OFFICER") where.officerId = session.user.id;
  if (status) where.status = status;

  const appearances = await prisma.courtAppearance.findMany({
    where,
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
    orderBy: { courtDate: "asc" },
  });

  return NextResponse.json(appearances);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    // Auto-detect overtime if court date falls outside shift
    const courtDate = new Date(parsed.data.courtDate);
    const dayOfWeek = courtDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const hour = courtDate.getHours();
    const outsideShift = hour < 6 || hour > 18;

    const appearance = await prisma.courtAppearance.create({
      data: {
        tenantId: session.user.tenantId,
        officerId: session.user.id,
        caseId: parsed.data.caseId,
        courtDate,
        courtName: parsed.data.courtName,
        matterType: parsed.data.matterType,
        subpoenaFileUrl: parsed.data.subpoenaFileUrl,
        notes: parsed.data.notes,
        overtimeTriggered: isWeekend || outsideShift,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "COURT_APPEARANCE_CREATED",
      resource: "court_appearance",
      resourceId: appearance.id,
      metadata: { courtName: parsed.data.courtName, matterType: parsed.data.matterType, courtDate: parsed.data.courtDate },
    });

    return NextResponse.json(appearance, { status: 201 });
  } catch (error) {
    console.error("Create court appearance error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}