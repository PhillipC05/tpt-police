import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  serialNumber: z.string().min(1),
  model: z.string().min(1),
  status: z.enum(["AVAILABLE", "DEPLOYED", "CHARGING", "MAINTENANCE", "DECOMMISSIONED"]).default("AVAILABLE"),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;

  const drones = await prisma.drone.findMany({
    where,
    include: {
      deployments: {
        orderBy: { launchedAt: "desc" },
        take: 5,
        include: {
          operator: { select: { id: true, name: true } },
          incident: { select: { id: true, type: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(drones);
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

    const drone = await prisma.drone.create({
      data: {
        tenantId: session.user.tenantId,
        serialNumber: parsed.data.serialNumber,
        model: parsed.data.model,
        status: parsed.data.status,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "DRONE_CREATED",
      resource: "drone",
      resourceId: drone.id,
    });

    return NextResponse.json(drone, { status: 201 });
  } catch (error) {
    logger.error("Create drone error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}