import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { verifySecret } from "@/lib/secrets";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.MAN_DOWN_WEBHOOK_SECRET;
  if (!expectedToken || !authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  if (!verifySecret(token, expectedToken)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { officerId, latitude, longitude, sensorId, eventType } = body;

    if (!officerId) {
      return NextResponse.json({ message: "officerId required" }, { status: 400 });
    }

    // Find the officer and their tenant
    const officer = await prisma.user.findUnique({
      where: { id: officerId },
      select: { id: true, name: true, tenantId: true },
    });

    if (!officer) {
      return NextResponse.json({ message: "Officer not found" }, { status: 404 });
    }

    // Create a panic event
    const panic = await prisma.panicEvent.create({
      data: {
        officerId: officer.id,
        tenantId: officer.tenantId,
        latitude: latitude || null,
        longitude: longitude || null,
        notes: `Man-down sensor triggered. Sensor: ${sensorId || "Unknown"}. Event: ${eventType || "MAN_DOWN"}`,
      },
    });

    // Also create a high-priority dispatch incident
    await prisma.incident.create({
      data: {
        tenantId: officer.tenantId,
        type: "PANIC_MAN_DOWN",
        status: "ACTIVE",
        description: `MAN-DOWN ALERT: Officer ${officer.name} (${officer.id}) — sensor triggered${latitude && longitude ? ` at [${latitude}, ${longitude}]` : ""}`,
        latitude: latitude || null,
        longitude: longitude || null,
      },
    });

    await writeAuditLog({
      userId: officer.id,
      tenantId: officer.tenantId,
      action: "MAN_DOWN_TRIGGERED",
      resource: "panic_event",
      resourceId: panic.id,
      metadata: { sensorId, eventType, latitude, longitude },
    });

    return NextResponse.json({
      message: "Man-down alert received",
      panicId: panic.id,
    }, { status: 201 });
  } catch (error) {
    console.error("Man-down webhook error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}