import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1),
  coordinatorName: z.string().min(1),
  coordinatorEmail: z.string().email().optional(),
  coordinatorPhone: z.string().optional(),
  area: z.string().optional(),
  memberCount: z.number().default(0),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const groups = await prisma.neighbourhoodWatch.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(groups);
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

    const group = await prisma.neighbourhoodWatch.create({
      data: {
        tenantId: session.user.tenantId,
        ...parsed.data,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "WATCH_GROUP_CREATED",
      resource: "neighbourhood_watch",
      resourceId: group.id,
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    logger.error("Create watch group error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}