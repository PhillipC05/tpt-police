import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const shareCaseSchema = z.object({
  sharedWithTenantId: z.string(),
  canEdit: z.boolean().default(false),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const shares = await prisma.caseShare.findMany({
    where: { caseId: id },
    include: {
      case: { select: { caseNumber: true, title: true } },
    },
  });

  return NextResponse.json(shares);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN", "DETECTIVE"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const parsed = shareCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const share = await prisma.caseShare.create({
      data: {
        caseId,
        sharedWithTenantId: parsed.data.sharedWithTenantId,
        canEdit: parsed.data.canEdit,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "CASE_SHARED",
      resource: "caseShare",
      resourceId: share.id,
      metadata: { caseId, sharedWithTenantId: parsed.data.sharedWithTenantId },
    });

    return NextResponse.json(share, { status: 201 });
  } catch (error) {
    logger.error("Share case error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
