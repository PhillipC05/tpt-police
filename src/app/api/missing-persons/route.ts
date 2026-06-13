import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  personId: z.string().min(1),
  missingSince: z.string().datetime(),
  lastSeenLocation: z.string().optional(),
  circumstances: z.string().optional(),
  multiPrecinctCoordination: z.boolean().default(false),
  coordinatorNotes: z.string().optional(),
  alertId: z.string().optional(),
});

const UPDATE_SCHEMA = z.object({
  status: z.enum(["ACTIVE", "FOUND", "CLOSED"]).optional(),
  foundAt: z.string().datetime().optional(),
  coordinatorNotes: z.string().optional(),
  multiPrecinctCoordination: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "ACTIVE";

  const cases = await prisma.case.findMany({
    where: {
      tenantId: session.user.tenantId,
      type: "MISSING_PERSON",
      ...(status !== "ALL" ? { status: status as any } : {}),
    },
    include: {
      persons: {
        include: {
          person: {
            select: { id: true, firstName: true, lastName: true, dateOfBirth: true, photoUrl: true, idNumber: true, gender: true, nationality: true },
          },
        },
      },
      assignments: {
        include: { user: { select: { id: true, name: true, badgeNumber: true } } },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cases);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ message: "Case ID required" }, { status: 400 });

    const parsed = UPDATE_SCHEMA.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.status) data.status = parsed.data.status;
    if (parsed.data.foundAt) data.closedAt = new Date(parsed.data.foundAt);
    if (parsed.data.coordinatorNotes) data.description = parsed.data.coordinatorNotes;

    const updated = await prisma.case.update({
      where: { id, tenantId: session.user.tenantId },
      data,
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "MISSING_PERSON_UPDATED",
      resource: "case",
      resourceId: id,
      metadata: { status: parsed.data.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Update missing person error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}