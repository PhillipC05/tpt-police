import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const retentionSchema = z.object({
  auditLogRetentionDays: z.number().int().min(30).max(3650).optional(),
  caseRetentionDays: z.number().int().min(365).max(7300).optional(),
  personRecordRetention: z.number().int().min(365).max(7300).optional(),
  foiaRetentionDays: z.number().int().min(365).max(3650).optional(),
  autoPurgeEnabled: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  let policy = await prisma.dataRetentionPolicy.findUnique({
    where: { tenantId: session.user.tenantId },
  });

  if (!policy) {
    // Return defaults
    policy = {
      id: "",
      tenantId: session.user.tenantId,
      auditLogRetentionDays: 365,
      caseRetentionDays: 2555,
      personRecordRetention: 2555,
      foiaRetentionDays: 1825,
      autoPurgeEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return NextResponse.json(policy);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = retentionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const policy = await prisma.dataRetentionPolicy.upsert({
      where: { tenantId: session.user.tenantId },
      update: parsed.data,
      create: {
        tenantId: session.user.tenantId,
        auditLogRetentionDays: parsed.data.auditLogRetentionDays ?? 365,
        caseRetentionDays: parsed.data.caseRetentionDays ?? 2555,
        personRecordRetention: parsed.data.personRecordRetention ?? 2555,
        foiaRetentionDays: parsed.data.foiaRetentionDays ?? 1825,
        autoPurgeEnabled: parsed.data.autoPurgeEnabled ?? false,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "RETENTION_POLICY_UPDATED",
      resource: "dataRetentionPolicy",
      resourceId: policy.id,
      metadata: parsed.data,
    });

    return NextResponse.json(policy);
  } catch (error) {
    logger.error("Update retention policy error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}