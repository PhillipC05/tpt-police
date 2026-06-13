import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/public/portal/nearby?latitude=...&longitude=...
 * Returns the nearest tenant(s) with a PublicPortalConfig that covers the given location.
 * Uses a simple bounding-box approximation for proximity matching.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("latitude") ?? "");
  const lng = parseFloat(searchParams.get("longitude") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { message: "latitude and longitude query parameters are required as numbers" },
      { status: 400 }
    );
  }

  try {
    // Get all portal configs that have location data
    const configs = await prisma.publicPortalConfig.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        tenant: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (configs.length === 0) {
      // Fall back to returning any tenant with a name
      const fallbackTenants = await prisma.tenant.findMany({
        take: 10,
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true },
      });

      return NextResponse.json({
        nearest: null,
        fallback: fallbackTenants,
        message: "No precincts with location data found. Showing all available.",
      });
    }

    // Calculate distance using Haversine formula
    type ConfigWithDist = typeof configs[0] & { distanceKm: number };
    const withDistance: ConfigWithDist[] = configs.map((c) => {
      const d = haversineDistance(
        lat,
        lng,
        c.latitude!,
        c.longitude!
      );
      return { ...c, distanceKm: d };
    });

    // Filter by service area radius, then sort
    const inRange = withDistance
      .filter((c) => c.distanceKm <= c.serviceAreaRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      nearest: inRange.length > 0 ? inRange[0] : null,
      all: inRange,
      fallbackCount: 0,
    });
  } catch (error) {
    logger.error("Nearby portal error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}