import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const typeFilter = searchParams.get("type");

  // Only return cases that have latitude/longitude data
  const where: Record<string, unknown> = {
    latitude: { not: null },
    longitude: { not: null },
    status: { not: "CLOSED" },
  };

  if (tenantId) where.tenantId = tenantId;
  if (typeFilter && typeFilter !== "all") where.type = typeFilter;

  const cases = await prisma.case.findMany({
    where,
    select: {
      latitude: true,
      longitude: true,
      type: true,
      incidentDate: true,
      createdAt: true,
    },
    take: 5000,
  });

  // Load privacy settings for the tenant
  let privacySettings = null;
  if (tenantId) {
    privacySettings = await prisma.crimeMapPrivacySetting.findUnique({
      where: { tenantId },
    });
  }

  const anonymize = privacySettings?.anonymizeLocations ?? true;
  const jitterKm = privacySettings?.locationJitterKm ?? 0.5;
  const minCount = privacySettings?.minIncidentsForDisplay ?? 3;
  const heatmapEnabled = privacySettings?.heatmapEnabled ?? true;

  if (!heatmapEnabled) {
    return NextResponse.json({ heatmapEnabled: false, points: [], clusters: [] });
  }

  // Jitter function: add random offset within jitterKm radius
  const jitterLat = (jitterKm / 111) * (Math.random() - 0.5) * 2; // ~1deg lat = 111km
  const jitterLng = (jitterKm / (111 * Math.cos((cases[0]?.latitude ?? 0) * (Math.PI / 180)))) * (Math.random() - 0.5) * 2;

  // Group by lat/lng rounded to 3 decimal places (~111m) to cluster nearby incidents
  const clusterMap = new Map<string, { lat: number; lng: number; count: number; types: Record<string, number> }>();

  for (const c of cases) {
    const lat = c.latitude!;
    const lng = c.longitude!;
    // Round to cluster nearby points
    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;
    const key = `${roundedLat},${roundedLng}`;

    if (clusterMap.has(key)) {
      const cluster = clusterMap.get(key)!;
      cluster.count++;
      cluster.types[c.type] = (cluster.types[c.type] ?? 0) + 1;
    } else {
      clusterMap.set(key, {
        lat: anonymize ? roundedLat + jitterLat : lat,
        lng: anonymize ? roundedLng + jitterLng : lng,
        count: 1,
        types: { [c.type]: 1 },
      });
    }
  }

  // Filter out clusters below minimum threshold
  const clusters = Array.from(clusterMap.values())
    .filter((c) => c.count >= minCount)
    .sort((a, b) => b.count - a.count);

  // Heatmap points (intensity-weighted lat/lng triplets for leaflet.heat)
  const points = clusters.map((c) => ({
    lat: c.lat,
    lng: c.lng,
    intensity: Math.min(c.count / 50, 1), // Normalize intensity
    count: c.count,
  }));

  return NextResponse.json({
    heatmapEnabled: true,
    totalIncidentsMapped: cases.length,
    points,
    clusters: clusters.map((c) => ({
      lat: c.lat,
      lng: c.lng,
      count: c.count,
      topTypes: Object.entries(c.types)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type),
    })),
  });
}