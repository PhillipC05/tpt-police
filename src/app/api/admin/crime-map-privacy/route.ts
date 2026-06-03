import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const privacySchema = z.object({
  heatmapEnabled: z.boolean().optional(),
  showIncidentMarkers: z.boolean().optional(),
  anonymizeLocations: z.boolean().optional(),
  locationJitterKm: z.number().min(0).max(10).optional(),
  minIncidentsForDisplay: z.number().int().min(1).max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  let settings = await prisma.crimeMapPrivacySetting.findUnique({
    where: { tenantId: session.user.tenantId },
  });

  if (!settings) {
    settings = {
      id: "",
      tenantId: session.user.tenantId,
      heatmapEnabled: true,
      showIncidentMarkers: true,
      anonymizeLocations: true,
      locationJitterKm: 0.5,
      minIncidentsForDisplay: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = privacySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await prisma.crimeMapPrivacySetting.upsert({
      where: { tenantId: session.user.tenantId },
      update: parsed.data,
      create: {
        tenantId: session.user.tenantId,
        heatmapEnabled: parsed.data.heatmapEnabled ?? true,
        showIncidentMarkers: parsed.data.showIncidentMarkers ?? true,
        anonymizeLocations: parsed.data.anonymizeLocations ?? true,
        locationJitterKm: parsed.data.locationJitterKm ?? 0.5,
        minIncidentsForDisplay: parsed.data.minIncidentsForDisplay ?? 3,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "CRIME_MAP_PRIVACY_UPDATED",
      resource: "crimeMapPrivacySetting",
      resourceId: settings.id,
      metadata: parsed.data,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update crime map privacy error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}