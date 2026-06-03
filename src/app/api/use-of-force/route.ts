import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const forceTypeValues = ["VERBAL", "PHYSICAL", "RESTRAINT", "CEW", "FIREARM", "OTHER"] as const;

const createSchema = z.object({
  forceTypes: z.array(z.enum(forceTypeValues)).min(1),
  narrative: z.string().min(1),
  incidentDate: z.string().datetime(),
  subjectResistance: z.string().optional(),
  officerInjured: z.boolean().optional(),
  subjectInjured: z.boolean().optional(),
  incidentId: z.string().optional(),
  caseId: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const officerId = searchParams.get("officerId");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;

  // Officers see only their own; supervisors/admins see all
  const restrictedRoles = ["OFFICER", "DETECTIVE", "DISPATCHER"];
  if ((restrictedRoles as string[]).includes(session.user.role) && !officerId) {
    where.officerId = session.user.id;
  } else if (officerId) {
    where.officerId = officerId;
  }

  const reports = await prisma.useOfForce.findMany({
    where,
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true } },
      supervisor: { select: { id: true, name: true, badgeNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reports);
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

    const report = await prisma.useOfForce.create({
      data: {
        tenantId: session.user.tenantId,
        officerId: session.user.id,
        forceTypes: parsed.data.forceTypes,
        narrative: parsed.data.narrative,
        incidentDate: new Date(parsed.data.incidentDate),
        subjectResistance: parsed.data.subjectResistance,
        officerInjured: parsed.data.officerInjured ?? false,
        subjectInjured: parsed.data.subjectInjured ?? false,
        incidentId: parsed.data.incidentId,
        caseId: parsed.data.caseId,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "USE_OF_FORCE_SUBMITTED",
      resource: "use_of_force",
      resourceId: report.id,
      metadata: { forceTypes: parsed.data.forceTypes },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Create use-of-force error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
