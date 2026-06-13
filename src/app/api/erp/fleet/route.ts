import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createVehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1990).max(2030),
  plate: z.string().min(1),
  vin: z.string().optional(),
  colour: z.string().optional(),
  mileage: z.number().int().optional(),
  nextServiceAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { plate: { contains: search, mode: "insensitive" } },
      { make: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { vin: { contains: search, mode: "insensitive" } },
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, badgeNumber: true } } },
        where: { returnedAt: null },
      },
      maintenance: { orderBy: { performedAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(vehicles);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        ...parsed.data,
        tenantId: session.user.tenantId,
        nextServiceAt: parsed.data.nextServiceAt ? new Date(parsed.data.nextServiceAt) : null,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "VEHICLE_ADDED",
      resource: "vehicle",
      resourceId: vehicle.id,
      metadata: { plate: vehicle.plate },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    logger.error("Create vehicle error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}