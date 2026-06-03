import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["BOLO", "APB", "AMBER_ALERT", "SILVER_ALERT"]),
  title: z.string().min(1),
  description: z.string().min(1),
  personId: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleDescription: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  scopeTenantId: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "ACTIVE";

  // Auto-expire any alerts whose expiry has passed
  await prisma.alert.updateMany({
    where: {
      tenantId: session.user.tenantId,
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  const alerts = await prisma.alert.findMany({
    where: {
      status: status as "ACTIVE" | "EXPIRED" | "CANCELLED",
      OR: [
        { tenantId: session.user.tenantId },
        { scopeTenantId: null },
      ],
    },
    include: {
      person: { select: { id: true, firstName: true, lastName: true } },
      issuedBy: { select: { id: true, name: true, badgeNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alerts);
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

    const alert = await prisma.alert.create({
      data: {
        tenantId: session.user.tenantId,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description,
        personId: parsed.data.personId,
        vehiclePlate: parsed.data.vehiclePlate,
        vehicleDescription: parsed.data.vehicleDescription,
        issuedById: session.user.id,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        scopeTenantId: parsed.data.scopeTenantId,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "ALERT_ISSUED",
      resource: "alert",
      resourceId: alert.id,
      metadata: { type: parsed.data.type, title: parsed.data.title },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
