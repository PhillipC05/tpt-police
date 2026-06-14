import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { ThreatLevel } from "@prisma/client";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!DETECTIVE_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const config = await prisma.scanConfig.findUnique({
    where: { tenantId: session.user.tenantId },
  });

  return NextResponse.json(config ?? {
    masterEnabled: false,
    scanMissingPersons: true,
    scanActiveWarrants: false,
    scanGangMembers: false,
    minThreatLevelScan: "NONE",
    minConfidence: 85,
    requiresApproval: false,
  });
}

const updateSchema = z.object({
  masterEnabled: z.boolean().optional(),
  scanMissingPersons: z.boolean().optional(),
  scanActiveWarrants: z.boolean().optional(),
  scanGangMembers: z.boolean().optional(),
  minThreatLevelScan: z.nativeEnum(ThreatLevel).optional(),
  minConfidence: z.number().int().min(50).max(99).optional(),
  requiresApproval: z.boolean().optional(),
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden — PRECINCT_ADMIN or higher required" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const tid = session.user.tenantId;

  try {
    const config = await prisma.scanConfig.upsert({
      where: { tenantId: tid },
      create: { tenantId: tid, updatedById: session.user.id, ...data },
      update: { updatedById: session.user.id, ...data },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: tid,
      action: "UPDATE_SCAN_CONFIG",
      resource: "scanConfig",
      metadata: data as Record<string, unknown>,
    });

    return NextResponse.json(config);
  } catch (err) {
    logger.error("Failed to update scan config", { error: String(err), tenantId: tid });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
