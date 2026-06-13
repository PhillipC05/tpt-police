import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createShiftSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["MORNING", "AFTERNOON", "NIGHT", "CUSTOM"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const assignOfficerSchema = z.object({
  shiftId: z.string(),
  userId: z.string(),
  isOvertime: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (startDate) where.startTime = { gte: new Date(startDate) };
  if (endDate) where.endTime = { lte: new Date(endDate) };

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      assignments: {
        include: {
          user: { select: { id: true, name: true, badgeNumber: true, role: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(shifts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createShiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        tenantId: session.user.tenantId,
        name: parsed.data.name,
        type: parsed.data.type,
        startTime: new Date(parsed.data.startDate),
        endTime: new Date(parsed.data.endDate),
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "SHIFT_CREATED",
      resource: "shift",
      resourceId: shift.id,
      metadata: { name: shift.name, type: shift.type },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    logger.error("Create shift error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = assignOfficerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const assignment = await prisma.shiftAssignment.upsert({
      where: {
        shiftId_userId: {
          shiftId: parsed.data.shiftId,
          userId: parsed.data.userId,
        },
      },
      update: {
        isOvertime: parsed.data.isOvertime,
        notes: parsed.data.notes,
      },
      create: {
        shiftId: parsed.data.shiftId,
        userId: parsed.data.userId,
        isOvertime: parsed.data.isOvertime,
        notes: parsed.data.notes,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: parsed.data.isOvertime ? "SHIFT_OVERTIME_ASSIGNED" : "SHIFT_OFFICER_ASSIGNED",
      resource: "shiftAssignment",
      resourceId: assignment.id,
    });

    return NextResponse.json(assignment);
  } catch (error) {
    logger.error("Assign officer error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Shift ID required" }, { status: 400 });

    await prisma.shift.delete({ where: { id } });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "SHIFT_DELETED",
      resource: "shift",
      resourceId: id,
    });

    return NextResponse.json({ message: "Shift deleted" });
  } catch (error) {
    logger.error("Delete shift error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}