import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createFuelLogSchema = z.object({
  vehicleId: z.string().min(1),
  litres: z.number().positive(),
  cost: z.number().nonnegative(),
  odometer: z.number().int().optional(),
  filledAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get("vehicleId");

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;

  const logs = await prisma.fuelLog.findMany({
    where,
    include: { vehicle: { select: { id: true, plate: true, make: true, model: true } } },
    orderBy: { filledAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createFuelLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: parsed.data.vehicleId,
        litres: parsed.data.litres,
        cost: parsed.data.cost,
        odometer: parsed.data.odometer,
        filledAt: parsed.data.filledAt ? new Date(parsed.data.filledAt) : new Date(),
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "FUEL_LOG_ADDED",
      resource: "fuelLog",
      resourceId: log.id,
      metadata: { vehicleId: parsed.data.vehicleId, litres: parsed.data.litres, cost: parsed.data.cost },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    logger.error("Create fuel log error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}