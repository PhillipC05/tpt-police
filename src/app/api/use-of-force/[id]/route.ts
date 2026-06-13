import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const reviewSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "REVIEWED", "ESCALATED"]),
  supervisorNotes: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.useOfForce.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true, rank: true } },
      supervisor: { select: { id: true, name: true, badgeNumber: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  if (!report) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.useOfForce.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.useOfForce.update({
      where: { id },
      data: {
        status: parsed.data.status,
        supervisorId: session.user.id,
        supervisorNotes: parsed.data.supervisorNotes,
        reviewedAt: new Date(),
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "USE_OF_FORCE_REVIEWED",
      resource: "use_of_force",
      resourceId: id,
      metadata: { status: parsed.data.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Review use-of-force error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
