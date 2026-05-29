import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  userId: z.string(),
  incident: z.string().min(1),
  date: z.string().datetime(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string().min(1),
  actionTaken: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["INVESTIGATING", "SUBSTANTIATED", "DISMISSED", "ACTION_TAKEN"]),
  actionTaken: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};
  if (!["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    where.userId = session.user.id;
  }
  if (userId) where.userId = userId;
  if (session.user.tenantId) where.tenantId = session.user.tenantId;

  const records = await prisma.disciplinaryIncident.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, badgeNumber: true, department: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const record = await prisma.disciplinaryIncident.create({
      data: {
        userId: parsed.data.userId,
        tenantId: session.user.tenantId,
        incident: parsed.data.incident,
        date: new Date(parsed.data.date),
        severity: parsed.data.severity,
        description: parsed.data.description,
        actionTaken: parsed.data.actionTaken,
        createdById: session.user.id,
        status: "INVESTIGATING",
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "DISCIPLINARY_CREATED",
      resource: "disciplinaryIncident",
      resourceId: record.id,
      metadata: { userId: parsed.data.userId, severity: parsed.data.severity },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Create disciplinary error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.disciplinaryIncident.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.actionTaken ? { actionTaken: parsed.data.actionTaken } : {}),
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: `DISCIPLINARY_${parsed.data.status}`,
      resource: "disciplinaryIncident",
      resourceId: updated.id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update disciplinary error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}