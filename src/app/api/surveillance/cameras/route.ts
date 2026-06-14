import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { SurveillanceCameraStatus } from "@prisma/client";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!DETECTIVE_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const cameras = await prisma.surveillanceCamera.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { sessions: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(cameras);
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  streamUrl: z.string().url().optional(),
  scanEnabled: z.boolean().optional().default(true),
  status: z.nativeEnum(SurveillanceCameraStatus).optional().default("ONLINE"),
  installedAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  const tid = session.user.tenantId;

  try {
    const camera = await prisma.surveillanceCamera.create({
      data: {
        ...parsed.data,
        installedAt: parsed.data.installedAt ? new Date(parsed.data.installedAt) : null,
        tenantId: tid,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: tid,
      action: "ADD_SURVEILLANCE_CAMERA",
      resource: "surveillanceCamera",
      resourceId: camera.id,
      metadata: { name: camera.name, location: camera.location },
    });

    return NextResponse.json(camera, { status: 201 });
  } catch (err) {
    logger.error("Failed to add surveillance camera", { error: String(err), tenantId: tid });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
