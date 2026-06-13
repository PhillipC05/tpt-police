import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  userId: z.string(),
  name: z.string().min(1),
  issuingBody: z.string().min(1),
  certificateNo: z.string().optional(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const expiringSoon = searchParams.get("expiringSoon");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (userId) where.userId = userId;
  if (expiringSoon === "true") {
    where.expiresAt = { lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), gte: new Date() };
  }

  const records = await prisma.trainingCertification.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, badgeNumber: true, department: true } },
    },
    orderBy: { expiresAt: "asc" },
  });

  return NextResponse.json(records);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const record = await prisma.trainingCertification.create({
      data: {
        userId: parsed.data.userId,
        tenantId: session.user.tenantId,
        name: parsed.data.name,
        issuingBody: parsed.data.issuingBody,
        certificateNo: parsed.data.certificateNo,
        issuedAt: new Date(parsed.data.issuedAt),
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "TRAINING_CERT_CREATED",
      resource: "trainingCertification",
      resourceId: record.id,
      metadata: { userId: parsed.data.userId, name: parsed.data.name },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error("Create training cert error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}