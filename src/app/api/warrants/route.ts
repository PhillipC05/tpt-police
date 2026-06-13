import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  type: z.enum(["ARREST", "SEARCH", "PROTECTION"]),
  subject: z.string().min(1),
  description: z.string().min(1),
  personId: z.string().optional(),
  caseId: z.string().optional(),
  issuingMagistrate: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

async function generateWarrantNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.warrant.count({
    where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `WRT-${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;
  if (type) where.type = type;

  const warrants = await prisma.warrant.findMany({
    where,
    include: {
      person: { select: { id: true, firstName: true, lastName: true, idNumber: true } },
      issuedBy: { select: { id: true, name: true, badgeNumber: true } },
      servedBy: { select: { id: true, name: true, badgeNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(warrants);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const warrantNumber = await generateWarrantNumber(session.user.tenantId);

    const warrant = await prisma.warrant.create({
      data: {
        tenantId: session.user.tenantId,
        warrantNumber,
        type: parsed.data.type,
        subject: parsed.data.subject,
        description: parsed.data.description,
        personId: parsed.data.personId,
        caseId: parsed.data.caseId,
        issuedById: session.user.id,
        issuingMagistrate: parsed.data.issuingMagistrate,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        notes: parsed.data.notes,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "WARRANT_CREATED",
      resource: "warrant",
      resourceId: warrant.id,
      metadata: { warrantNumber, type: parsed.data.type, subject: parsed.data.subject },
    });

    return NextResponse.json(warrant, { status: 201 });
  } catch (error) {
    logger.error("Create warrant error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
