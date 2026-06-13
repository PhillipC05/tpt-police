import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["DETECTIVE", "OFFICER", "DISPATCHER", "PRECINCT_ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "ON_LEAVE"]).optional(),
  badgeNumber: z.string().optional(),
  rank: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const staff = await prisma.user.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      badgeNumber: true,
      rank: true,
      department: true,
      phone: true,
      photoUrl: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          assignedCases: true,
          leaveRequests: true,
          issuedAssets: true,
          assignedVehicles: true,
          shifts: true,
          performanceReviews: true,
        },
      },
    },
  });

  if (!staff) {
    return NextResponse.json({ message: "Staff not found" }, { status: 404 });
  }

  return NextResponse.json(staff);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { id, tenantId: session.user.tenantId } });
    if (!existing) {
      return NextResponse.json({ message: "Staff not found" }, { status: 404 });
    }

    const staff = await prisma.user.update({
      where: { id },
      data: parsed.data,
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "STAFF_UPDATED",
      resource: "user",
      resourceId: id,
      metadata: { changes: parsed.data },
    });

    return NextResponse.json(staff);
  } catch (error) {
    logger.error("Update staff error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.user.findFirst({ where: { id, tenantId: session.user.tenantId } });
    if (!existing) {
      return NextResponse.json({ message: "Staff not found" }, { status: 404 });
    }

    // Soft-deactivate instead of hard delete
    await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "STAFF_DEACTIVATED",
      resource: "user",
      resourceId: id,
      metadata: { name: existing.name },
    });

    return NextResponse.json({ message: "Staff deactivated" });
  } catch (error) {
    logger.error("Deactivate staff error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
