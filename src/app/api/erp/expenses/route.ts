import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  category: z.string().min(1),
  receiptUrl: z.string().url().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["SUBMITTED", "APPROVED", "REJECTED", "REIMBURSED"]),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;
  if (userId) where.userId = userId;
  if (!["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    where.userId = session.user.id;
  }

  const claims = await prisma.expenseClaim.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, badgeNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(claims);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const claim = await prisma.expenseClaim.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        amount: parsed.data.amount,
        category: parsed.data.category,
        receiptUrl: parsed.data.receiptUrl,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "EXPENSE_CLAIM_CREATED",
      resource: "expenseClaim",
      resourceId: claim.id,
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
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

    const claim = await prisma.expenseClaim.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        approvedById: parsed.data.status === "APPROVED" || parsed.data.status === "REJECTED" ? session.user.id : undefined,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: `EXPENSE_${parsed.data.status}`,
      resource: "expenseClaim",
      resourceId: parsed.data.id,
    });

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}