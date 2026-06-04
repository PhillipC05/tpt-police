import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const cameraSchema = z.object({
  serialNumber: z.string().min(1),
  model: z.string().min(1),
});

const eventSchema = z.object({
  cameraId: z.string().min(1),
  activationType: z.enum(["MANUAL", "AUTO", "INCIDENT"]),
  footageUrl: z.string().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const events = searchParams.has("events");

  if (events) {
    const eventList = await prisma.bWCEvent.findMany({
      where: { officer: { tenantId: session.user.tenantId } },
      include: {
        camera: { select: { serialNumber: true, model: true } },
        officer: { select: { id: true, name: true, badgeNumber: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });
    return NextResponse.json(eventList);
  }

  const where: Record<string, unknown> = {};
  if (session.user.role !== "SUPER_ADMIN") {
    where.assignedTo = { tenantId: session.user.tenantId };
  }
  if (status) where.status = status;

  const cameras = await prisma.bodyCamera.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, badgeNumber: true } },
    },
    orderBy: { serialNumber: "asc" },
  });

  return NextResponse.json(cameras);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Check if this is a camera creation or event creation
    if (body.serialNumber) {
      const parsed = cameraSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
      }

      const camera = await prisma.bodyCamera.create({
        data: {
          serialNumber: parsed.data.serialNumber,
          model: parsed.data.model,
        },
      });

      await writeAuditLog({
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: "BWC_CAMERA_CREATED",
        resource: "body_camera",
        resourceId: camera.id,
        metadata: { serialNumber: parsed.data.serialNumber },
      });

      return NextResponse.json(camera, { status: 201 });
    }

    // Event creation
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const event = await prisma.bWCEvent.create({
      data: {
        cameraId: parsed.data.cameraId,
        officerId: session.user.id,
        activationType: parsed.data.activationType,
        footageUrl: parsed.data.footageUrl,
        startedAt: new Date(parsed.data.startedAt),
        endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("BWC error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}