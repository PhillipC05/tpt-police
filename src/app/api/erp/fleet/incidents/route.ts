import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  vehicleId: z.string().min(1),
  description: z.string().min(1),
  incidentDate: z.string().datetime().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  cost: z.number().nonnegative().optional(),
  reportedById: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get("vehicleId");

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;

  const incidents = await prisma.vehicleIncident.findMany({
    where,
    include: { vehicle: { select: { id: true, plate: true, make: true, model: true } } },
    orderBy: { incidentDate: "desc" },
  });

  return NextResponse.json(incidents);
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

    const incident = await prisma.vehicleIncident.create({
      data: {
        vehicleId: parsed.data.vehicleId,
        description: parsed.data.description,
        incidentDate: parsed.data.incidentDate ? new Date(parsed.data.incidentDate) : new Date(),
        severity: parsed.data.severity,
        cost: parsed.data.cost,
        reportedById: parsed.data.reportedById ?? session.user.id,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "VEHICLE_INCIDENT_CREATED",
      resource: "vehicleIncident",
      resourceId: incident.id,
      metadata: { vehicleId: parsed.data.vehicleId, severity: parsed.data.severity },
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error("Create vehicle incident error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, resolved } = body;

    if (!id) {
      return NextResponse.json({ message: "Incident ID required" }, { status: 400 });
    }

    const incident = await prisma.vehicleIncident.update({
      where: { id },
      data: { resolved: resolved ?? true },
    });

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Update vehicle incident error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}