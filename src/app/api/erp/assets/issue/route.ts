import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const issueSchema = z.object({
  assetId: z.string().min(1),
  userId: z.string().min(1),
  condition: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = issueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    // Verify asset belongs to tenant
    const asset = await prisma.asset.findFirst({
      where: { id: parsed.data.assetId, tenantId: session.user.tenantId },
    });
    if (!asset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    if (asset.status !== "AVAILABLE") {
      return NextResponse.json({ message: "Asset is not available" }, { status: 400 });
    }

    const issuance = await prisma.assetIssuance.create({
      data: {
        assetId: parsed.data.assetId,
        userId: parsed.data.userId,
        condition: parsed.data.condition ?? "Good",
        notes: parsed.data.notes,
      },
    });

    await prisma.asset.update({
      where: { id: parsed.data.assetId },
      data: { status: "ISSUED" },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "ASSET_ISSUED",
      resource: "asset",
      resourceId: parsed.data.assetId,
      metadata: { issuedTo: parsed.data.userId },
    });

    return NextResponse.json(issuance, { status: 201 });
  } catch (error) {
    logger.error("Issue asset error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ message: "Issuance ID required" }, { status: 400 });
    }

    const issuance = await prisma.assetIssuance.update({
      where: { id },
      data: { returnedAt: new Date() },
      include: { asset: { select: { id: true, tenantId: true } } },
    });

    if (issuance.asset.tenantId !== session.user.tenantId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Check if there are no other active issuances
    const activeIssuances = await prisma.assetIssuance.count({
      where: { assetId: issuance.assetId, returnedAt: null },
    });

    if (activeIssuances === 0) {
      await prisma.asset.update({
        where: { id: issuance.assetId },
        data: { status: "AVAILABLE" },
      });
    }

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "ASSET_RETURNED",
      resource: "asset",
      resourceId: issuance.assetId,
    });

    return NextResponse.json(issuance);
  } catch (error) {
    logger.error("Return asset error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}