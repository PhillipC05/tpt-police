import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createCaseSchema = z.object({
  type: z.enum(["THEFT", "ASSAULT", "HOMICIDE", "FRAUD", "DRUG_OFFENCE", "CYBERCRIME", "DOMESTIC_VIOLENCE", "MISSING_PERSON", "TRAFFIC", "PUBLIC_ORDER", "OTHER"]),
  title: z.string().min(1),
  description: z.string().min(1),
  incidentDate: z.string().datetime().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Generate case number: PCS-YYYY-NNNNNN
async function generateCaseNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.case.count({
    where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `PCS-${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const assignedTo = searchParams.get("assignedTo");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;
  if (assignedTo === "me") {
    where.assignments = { some: { userId: session.user.id } };
  }
  if (search) {
    where.OR = [
      { caseNumber: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const cases = await prisma.case.findMany({
    where,
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, badgeNumber: true } } },
      },
      _count: { select: { evidence: true, persons: true, notes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cases);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createCaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const caseNumber = await generateCaseNumber(session.user.tenantId);

    const caseRecord = await prisma.case.create({
      data: {
        caseNumber,
        tenantId: session.user.tenantId,
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description,
        incidentDate: parsed.data.incidentDate ? new Date(parsed.data.incidentDate) : null,
        location: parsed.data.location,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        status: "OPEN",
      },
    });

    // Auto-assign the creating user
    await prisma.caseAssignment.create({
      data: {
        caseId: caseRecord.id,
        userId: session.user.id,
        isLead: true,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "CASE_CREATED",
      resource: "case",
      resourceId: caseRecord.id,
      metadata: { caseNumber, title: parsed.data.title },
    });

    return NextResponse.json(caseRecord, { status: 201 });
  } catch (error) {
    logger.error("Create case error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}