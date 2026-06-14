import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { CameraSourceType } from "@prisma/client";

const createSchema = z.object({
  sourceType: z.nativeEnum(CameraSourceType),
  bwcCameraId: z.string().optional(),
  droneDeploymentId: z.string().optional(),
  surveillanceCamId: z.string().optional(),
  officerId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  const tid = session.user.tenantId;
  const config = await prisma.scanConfig.findUnique({ where: { tenantId: tid } });

  try {
    const sess = await prisma.faceScanSession.create({
      data: {
        ...parsed.data,
        officerId: parsed.data.officerId ?? session.user.id,
        tenantId: tid,
        configSnapshot: JSON.parse(JSON.stringify(config ?? {})),
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: tid,
      action: "START_FACE_SCAN_SESSION",
      resource: "faceScanSession",
      resourceId: sess.id,
      metadata: { sourceType: parsed.data.sourceType },
    });

    return NextResponse.json(sess, { status: 201 });
  } catch (err) {
    logger.error("Failed to create scan session", { error: String(err), tenantId: tid });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
