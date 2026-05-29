import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createLeaveSchema = z.object({
  type: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "STUDY", "SPECIAL"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
});

const updateLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
  reason: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (session.user.role === "SUPER_ADMIN") {
    // super admin sees all
  } else if (["PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    where.tenantId = session.user.tenantId;
  } else {
    where.userId = session.user.id;
  }
  if (userId) where.userId = userId;
  if (status) where.status = status;

  const leaveRequests = await prisma.leaveRequest.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, badgeNumber: true, department: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leaveRequests);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        type: parsed.data.type,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        reason: parsed.data.reason,
        status: "PENDING",
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "LEAVE_REQUESTED",
      resource: "leaveRequest",
      resourceId: leaveRequest.id,
      metadata: { type: parsed.data.type },
    });

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error) {
    console.error("Create leave error:", error);
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
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ message: "Leave request ID required" }, { status: 400 });
    }

    const parsed = updateLeaveSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: { id, tenantId: session.user.tenantId },
    });
    if (!leaveRequest) {
      return NextResponse.json({ message: "Leave request not found" }, { status: 404 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        approvedById: parsed.data.status === "APPROVED" ? session.user.id : undefined,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: `LEAVE_${parsed.data.status}`,
      resource: "leaveRequest",
      resourceId: id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update leave error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}