import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createHandoffSchema = z.object({
  prosecutorName: z.string().optional(),
  prosecutorRef: z.string().optional(),
  courtDate: z.string().datetime().optional(),
  courtName: z.string().optional(),
  notes: z.string().optional(),
});

const updateHandoffSchema = z.object({
  status: z.enum(["PREPARING", "SUBMITTED", "ACCEPTED", "COURT_DATE_SET", "CONCLUDED"]).optional(),
  prosecutorName: z.string().optional(),
  prosecutorRef: z.string().optional(),
  courtDate: z.string().datetime().optional(),
  courtName: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const handoff = await prisma.courtHandoff.findFirst({
    where: { caseId: id },
  });

  return NextResponse.json(handoff ?? {});
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const parsed = createHandoffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const handoff = await prisma.courtHandoff.create({
      data: {
        caseId,
        prosecutorName: parsed.data.prosecutorName,
        prosecutorRef: parsed.data.prosecutorRef,
        courtDate: parsed.data.courtDate ? new Date(parsed.data.courtDate) : null,
        courtName: parsed.data.courtName,
        notes: parsed.data.notes,
        status: "PREPARING",
      },
    });

    // Update case status to PROSECUTION
    await prisma.case.update({ where: { id: caseId }, data: { status: "PROSECUTION" } });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "COURT_HANDOFF_CREATED",
      resource: "courtHandoff",
      resourceId: handoff.id,
      metadata: { caseId },
    });

    return NextResponse.json(handoff, { status: 201 });
  } catch (error) {
    logger.error("Create handoff error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const parsed = updateHandoffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "SUBMITTED") updateData.submittedAt = new Date();

    const handoff = await prisma.courtHandoff.update({
      where: { caseId },
      data: updateData,
    });

    if (parsed.data.status === "CONCLUDED") {
      await prisma.case.update({ where: { id: caseId }, data: { status: "CLOSED", closedAt: new Date() } });
    }

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "COURT_HANDOFF_UPDATED",
      resource: "courtHandoff",
      resourceId: handoff.id,
      metadata: { caseId, changes: parsed.data },
    });

    return NextResponse.json(handoff);
  } catch (error) {
    logger.error("Update handoff error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
