import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const deploySchema = z.object({
  droneId: z.string().min(1),
  incidentId: z.string().optional(),
  launchedAt: z.string().datetime(),
  notes: z.string().optional(),
});

const landSchema = z.object({
  deploymentId: z.string().min(1),
  landedAt: z.string().datetime(),
  footageUrl: z.string().optional(),
});

const authorizeSchema = z.object({
  deploymentId: z.string().min(1),
  approved: z.boolean(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    // Authorize deployment
    if (action === "authorize") {
      if (!["PRECINCT_ADMIN", "CITY_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ message: "Forbidden — Admin only" }, { status: 403 });
      }

      const body = await request.json();
      const parsed = authorizeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
      }

      const deployment = await prisma.droneDeployment.update({
        where: { id: parsed.data.deploymentId },
        data: {
          approved: parsed.data.approved,
          authorizedById: session.user.id,
        },
      });

      await writeAuditLog({
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: parsed.data.approved ? "DRONE_DEPLOYMENT_APPROVED" : "DRONE_DEPLOYMENT_REJECTED",
        resource: "drone_deployment",
        resourceId: deployment.id,
      });

      return NextResponse.json(deployment);
    }

    // Land drone
    if (action === "land") {
      const body = await request.json();
      const parsed = landSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
      }

      const deployment = await prisma.droneDeployment.findUnique({ where: { id: parsed.data.deploymentId }, include: { drone: true } });
      if (!deployment) return NextResponse.json({ message: "Deployment not found" }, { status: 404 });

      await prisma.droneDeployment.update({
        where: { id: parsed.data.deploymentId },
        data: {
          landedAt: new Date(parsed.data.landedAt),
          footageUrl: parsed.data.footageUrl,
        },
      });

      await prisma.drone.update({
        where: { id: deployment.droneId },
        data: { status: "AVAILABLE" },
      });

      return NextResponse.json({ message: "Drone landed" });
    }

    // Default: launch drone
    const body = await request.json();
    const parsed = deploySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const drone = await prisma.drone.findUnique({ where: { id: parsed.data.droneId } });
    if (!drone) return NextResponse.json({ message: "Drone not found" }, { status: 404 });
    if (drone.status !== "AVAILABLE") {
      return NextResponse.json({ message: "Drone is not available" }, { status: 400 });
    }

    const deployment = await prisma.droneDeployment.create({
      data: {
        droneId: parsed.data.droneId,
        operatorId: session.user.id,
        incidentId: parsed.data.incidentId,
        launchedAt: new Date(parsed.data.launchedAt),
        notes: parsed.data.notes,
      },
    });

    await prisma.drone.update({
      where: { id: parsed.data.droneId },
      data: { status: "DEPLOYED" },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "DRONE_DEPLOYED",
      resource: "drone_deployment",
      resourceId: deployment.id,
    });

    return NextResponse.json(deployment, { status: 201 });
  } catch (error) {
    console.error("Drone deploy error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}