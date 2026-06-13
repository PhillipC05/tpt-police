import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { lookupPlate } from "@/lib/anpr";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ALLOWED_ROLES = ["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN", "DETECTIVE", "OFFICER", "DISPATCHER"];

const lookupSchema = z.object({
  plateNumber: z.string().min(2).max(20),
  province: z.string().max(50).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = lookupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const result = await lookupPlate(parsed.data.plateNumber, parsed.data.province);

    // All plate lookups are audited for accountability
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "PLATE_LOOKUP",
      resource: "plate_lookup",
      resourceId: result.plateNumber,
      metadata: {
        plateNumber: result.plateNumber,
        province: result.province,
        source: result.source,
        stolen: result.stolen,
        warrantCount: result.warrants.length,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Plate lookup error", { error });
    return NextResponse.json({ message: "Lookup failed" }, { status: 500 });
  }
}
