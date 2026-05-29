import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateCaseSchema = z.object({
  status: z.enum(["OPEN", "ACTIVE", "REVIEW", "PROSECUTION", "CLOSED"]).optional(),
  type: z.enum(["THEFT", "ASSAULT", "HOMICIDE", "FRAUD", "DRUG_OFFENCE", "CYBERCRIME", "DOMESTIC_VIOLENCE", "MISSING_PERSON", "TRAFFIC", "PUBLIC_ORDER", "OTHER"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const caseRecord = await prisma.case.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, badgeNumber: true, role: true } } },
      },
      evidence: {
        include: { custodyChain: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } } },
      },
      persons: {
        include: { person: true },
      },
      notes: {
        include: { author: { select: { id: true, name: true, badgeNumber: true } } },
        orderBy: { createdAt: "desc" },
      },
      handoff: true,
      linkedIncident: true,
    },
  });

  if (!caseRecord) {
    return NextResponse.json({ message: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(caseRecord);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.case.findFirst({ where: { id, tenantId: session.user.tenantId } });
    if (!existing) {
      return NextResponse.json({ message: "Case not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "CLOSED") {
      updateData.closedAt = new Date();
    }

    const caseRecord = await prisma.case.update({
      where: { id },
      data: updateData,
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "CASE_UPDATED",
      resource: "case",
      resourceId: id,
      metadata: { changes: parsed.data },
    });

    return NextResponse.json(caseRecord);
  } catch (error) {
    console.error("Update case error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}