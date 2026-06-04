import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  officerId: z.string().min(1),
  provider: z.string().min(1),
  sessionDate: z.string().datetime(),
  notes: z.string().optional(),
  attended: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  // HR admins and the officer themselves can view
  const isHrAdmin = ["PRECINCT_ADMIN", "CITY_ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  const where: Record<string, unknown> = {};
  if (!isHrAdmin) where.officerId = session.user.id;
  else where.officer = { tenantId: session.user.tenantId };

  const sessions = await prisma.counsellingSession.findMany({
    where,
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true, department: true } },
    },
    orderBy: { sessionDate: "desc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["PRECINCT_ADMIN", "CITY_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden — Admin only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const counselling = await prisma.counsellingSession.create({
      data: {
        officerId: parsed.data.officerId,
        provider: parsed.data.provider,
        sessionDate: new Date(parsed.data.sessionDate),
        notes: parsed.data.notes,
        attended: parsed.data.attended,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "COUNSELLING_SESSION_CREATED",
      resource: "counselling_session",
      resourceId: counselling.id,
    });

    return NextResponse.json(counselling, { status: 201 });
  } catch (error) {
    console.error("Create counselling session error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}