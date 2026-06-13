import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/public/alerts?tenantId=xxx
 * Returns active alerts (AMBER, BOLO, SILVER, APB) for a given tenant.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json(
      { message: "tenantId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        expiresAt: {
          gte: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        vehiclePlate: true,
        vehicleDescription: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    logger.error("Public alerts error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}