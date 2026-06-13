import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  status: z.enum(["ISSUED", "SERVED", "RETURNED", "EXPIRED"]).optional(),
  notes: z.string().optional(),
  servedById: z.string().optional(),
  servedAt: z.string().datetime().optional(),
  returnedAt: z.string().datetime().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const warrant = await prisma.warrant.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      person: true,
      issuedBy: { select: { id: true, name: true, badgeNumber: true } },
      servedBy: { select: { id: true, name: true, badgeNumber: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  if (!warrant) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(warrant);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.warrant.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.warrant.update({
      where: { id },
      data: {
        ...parsed.data,
        servedAt: parsed.data.servedAt ? new Date(parsed.data.servedAt) : undefined,
        returnedAt: parsed.data.returnedAt ? new Date(parsed.data.returnedAt) : undefined,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "WARRANT_UPDATED",
      resource: "warrant",
      resourceId: id,
      metadata: { status: parsed.data.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Update warrant error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
