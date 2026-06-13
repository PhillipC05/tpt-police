import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push";

const assignSchema = z.object({
  userId: z.string(),
  isLead: z.boolean().default(false),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const assignment = await prisma.caseAssignment.create({
      data: {
        caseId,
        userId: parsed.data.userId,
        isLead: parsed.data.isLead,
      },
      include: { user: { select: { id: true, name: true, badgeNumber: true, role: true } } },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "CASE_ASSIGNED",
      resource: "caseAssignment",
      resourceId: assignment.id,
      metadata: { caseId, userId: parsed.data.userId },
    });

    await sendPushToUser(parsed.data.userId, {
      title: parsed.data.isLead ? "You are lead on a case" : "You have been assigned to a case",
      body: `Case ID: ${caseId}`,
      url: `/cases/${caseId}`,
      tag: `case-assign-${caseId}`,
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    logger.error("Assign case error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id: caseId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "userId query parameter required" }, { status: 400 });
    }

    await prisma.caseAssignment.deleteMany({
      where: { caseId, userId },
    });

    return NextResponse.json({ message: "Assignment removed" });
  } catch (error) {
    logger.error("Remove assignment error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
