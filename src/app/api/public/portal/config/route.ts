import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
    let config = await prisma.publicPortalConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      // Return sensible defaults if no config exists yet
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true },
      });
      if (!tenant) {
        return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
      }

      return NextResponse.json({
        tenantId,
        portalName: `TPT Police — ${tenant.name}`,
        portalDescription: null,
        logoUrl: null,
        primaryColor: "#1e3a5f",
        contactEmail: null,
        contactPhone: null,
        tipsEnabled: true,
        complaintsEnabled: true,
        commendationsEnabled: true,
        missingPersonReports: true,
        communityEventsPublic: true,
        neighbourhoodWatch: true,
        liveAlerts: true,
        evidenceUploads: true,
        publicRegistration: true,
        latitude: null,
        longitude: null,
        serviceAreaRadiusKm: 50,
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    logger.error("Public portal config error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}