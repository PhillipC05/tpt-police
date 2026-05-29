import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createBudgetSchema = z.object({
  financialYear: z.string(),
  category: z.string().min(1),
  totalAmount: z.number().positive(),
});

const createPurchaseOrderSchema = z.object({
  budgetId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  vendor: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const financialYear = searchParams.get("financialYear");
  const type = searchParams.get("type"); // "budget" or "purchase-orders"

  if (type === "purchase-orders") {
    const where: Record<string, unknown> = { tenantId: session.user.tenantId };
    if (financialYear && financialYear !== "all") {
      where.budget = { financialYear };
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: { budget: { select: { financialYear: true, category: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  }

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (financialYear) where.financialYear = financialYear;

  const budgets = await prisma.budget.findMany({
    where,
    include: { _count: { select: { purchaseOrders: true } } },
    orderBy: { financialYear: "desc" },
  });

  return NextResponse.json(budgets);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const type = body._type;

    if (type === "purchase-order") {
      const parsed = createPurchaseOrderSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
      }

      const order = await prisma.purchaseOrder.create({
        data: {
          tenantId: session.user.tenantId,
          budgetId: parsed.data.budgetId,
          title: parsed.data.title,
          description: parsed.data.description,
          amount: parsed.data.amount,
          vendor: parsed.data.vendor,
          createdById: session.user.id,
          status: "DRAFT",
        },
      });

      await writeAuditLog({
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: "PURCHASE_ORDER_CREATED",
        resource: "purchaseOrder",
        resourceId: order.id,
        metadata: { title: parsed.data.title, amount: parsed.data.amount },
      });

      return NextResponse.json(order, { status: 201 });
    }

    const parsed = createBudgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const budget = await prisma.budget.create({
      data: {
        tenantId: session.user.tenantId,
        financialYear: parsed.data.financialYear,
        category: parsed.data.category,
        totalAmount: parsed.data.totalAmount,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "BUDGET_CREATED",
      resource: "budget",
      resourceId: budget.id,
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Create budget error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}