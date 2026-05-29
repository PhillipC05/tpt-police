import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const billingSchema = z.object({
  tenantId: z.string(),
  plan: z.enum(["BASIC", "PROFESSIONAL", "ENTERPRISE", "GOVERNMENT"]),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
  amount: z.number().positive(),
  activeUsers: z.number().int().optional(),
  storageLimit: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  const where: Record<string, unknown> = {};
  if (tenantId) where.tenantId = tenantId;

  const subscriptions = await prisma.subscription.findMany({
    where,
    include: { tenant: { select: { id: true, name: true, type: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subscriptions);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = billingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const subscription = await prisma.subscription.create({
      data: {
        tenantId: parsed.data.tenantId,
        plan: parsed.data.plan,
        billingCycle: parsed.data.billingCycle,
        amount: parsed.data.amount,
        activeUsers: parsed.data.activeUsers ?? 0,
        storageLimit: parsed.data.storageLimit ?? "10GB",
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "SUBSCRIPTION_CREATED",
      resource: "subscription",
      resourceId: subscription.id,
      metadata: { tenantId: parsed.data.tenantId, plan: parsed.data.plan },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, plan, billingCycle, amount, status, endDate } = body;

    if (!id) {
      return NextResponse.json({ message: "Subscription ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (plan) updateData.plan = plan;
    if (billingCycle) updateData.billingCycle = billingCycle;
    if (amount) updateData.amount = amount;
    if (status) updateData.status = status;
    if (endDate) updateData.endDate = new Date(endDate);

    const subscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "SUBSCRIPTION_UPDATED",
      resource: "subscription",
      resourceId: id,
      metadata: updateData,
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Update subscription error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}