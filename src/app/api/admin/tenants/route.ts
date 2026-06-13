import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createTenantSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["PROVINCE", "CITY", "PRECINCT"]),
  parentId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createTenantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const tenant = await prisma.tenant.create({
      data: parsed.data,
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "TENANT_CREATED",
      resource: "tenant",
      resourceId: tenant.id,
      metadata: { name: tenant.name, type: tenant.type },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    logger.error("Create tenant error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { children: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tenants);
}