import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createPeriodSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get("periodId");

  if (periodId) {
    const entries = await prisma.payrollEntry.findMany({
      where: { payrollPeriodId: periodId },
      include: {
        user: { select: { id: true, name: true, badgeNumber: true, department: true } },
        payrollPeriod: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(entries);
  }

  const periods = await prisma.payrollPeriod.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { entries: true } } },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(periods);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createPeriodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const period = await prisma.payrollPeriod.create({
      data: {
        tenantId: session.user.tenantId,
        name: parsed.data.name,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "PAYROLL_PERIOD_CREATED",
      resource: "payrollPeriod",
      resourceId: period.id,
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error("Create payroll period error:", error);
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
    const { periodId, action } = body;

    if (!periodId || !action) {
      return NextResponse.json({ message: "periodId and action required" }, { status: 400 });
    }

    const validActions = ["PROCESS", "PAY", "CANCEL"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

    const statusMap: Record<string, string> = {
      PROCESS: "PROCESSED",
      PAY: "PAID",
      CANCEL: "CANCELLED",
    };

    const updateData: Record<string, unknown> = { status: statusMap[action] };
    if (action === "PROCESS") updateData.processedAt = new Date();
    if (action === "PAY") updateData.paidAt = new Date();

    const period = await prisma.payrollPeriod.update({
      where: { id: periodId },
      data: updateData,
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: `PAYROLL_${action}`,
      resource: "payrollPeriod",
      resourceId: periodId,
    });

    return NextResponse.json(period);
  } catch (error) {
    console.error("Update payroll period error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}