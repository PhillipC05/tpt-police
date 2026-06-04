import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const events = await prisma.panicEvent.findMany({
    where: { tenantId: session.user.tenantId, resolvedAt: null },
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(events);
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

    // Create panic event
    const event = await prisma.panicEvent.create({
      data: {
        officerId: session.user.id,
        tenantId: session.user.tenantId,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        notes: parsed.data.notes,
      },
    });

    // Auto-create a high-priority dispatch incident if GPS available
    if (parsed.data.latitude && parsed.data.longitude) {
      await prisma.incident.create({
        data: {
          tenantId: session.user.tenantId,
          type: "PANIC_ALERT",
          status: "ACTIVE",
      description: `PANIC ALERT from ${session.user.name} (${session.user.role})`,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          location: `${parsed.data.latitude}, ${parsed.data.longitude}`,
        },
      });
    }

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "PANIC_ACTIVATED",
      resource: "panic_event",
      resourceId: event.id,
      metadata: { officer: session.user.name, hasGps: !!(parsed.data.latitude && parsed.data.longitude) },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Panic button error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}