import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  officerId: z.string().min(1),
  citizenName: z.string().optional(),
  citizenEmail: z.string().optional(),
  description: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL("http://x");
  const reviewed = searchParams.get("reviewed");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (reviewed === "true") where.reviewed = true;
  if (reviewed === "false") where.reviewed = false;

  const commendations = await prisma.officerCommendation.findMany({
    where,
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true, rank: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(commendations);
}

export async function POST(request: Request) {
  const session = await auth();
  const isPublic = !session;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const officer = await prisma.user.findUnique({ where: { id: parsed.data.officerId } });
    if (!officer) return NextResponse.json({ message: "Officer not found" }, { status: 404 });

    const commendation = await prisma.officerCommendation.create({
      data: {
        tenantId: officer.tenantId,
        officerId: parsed.data.officerId,
        citizenName: parsed.data.citizenName,
        citizenEmail: parsed.data.citizenEmail,
        description: parsed.data.description,
      },
    });

    if (!isPublic && session) {
      await writeAuditLog({
        userId: session.user.id,
        tenantId: officer.tenantId,
        action: "COMMENDATION_SUBMITTED",
        resource: "officer_commendation",
        resourceId: commendation.id,
      });
    }

    return NextResponse.json({ id: commendation.id, message: "Thank you for your commendation" }, { status: 201 });
  } catch (error) {
    logger.error("Create commendation error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}