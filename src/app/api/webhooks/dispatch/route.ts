import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { IncidentStatus, Prisma } from "@prisma/client";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { verifySecret } from "@/lib/secrets";
import { logger } from "@/lib/logger";

const webhookSecret = process.env.DISPATCH_WEBHOOK_SECRET;

const incidentWebhookSchema = z.object({
  event: z.string(),
  externalId: z.string(),
  type: z.string(),
  status: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tenantId: z.string(),
  unitId: z.string().optional(),
  unitStatus: z.string().optional(),
  timestamp: z.string().datetime(),
  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  // Rate limit: max 60 webhook requests per IP per minute
  const rlIdentifier = getRateLimitIdentifier(undefined, request);
  const rlResult = checkRateLimit(rlIdentifier, { max: 60, windowMs: 60_000, prefix: "rl:webhook" });
  if (rlResult) return rlResult;

  // Validate webhook secret using constant-time comparison
  const authHeader = request.headers.get("authorization");
  if (!webhookSecret || !authHeader) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  if (!verifySecret(token, webhookSecret)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = incidentWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
    }

    const { event, externalId, type, status, description, location, latitude, longitude, tenantId, rawPayload } = parsed.data;

    if (event === "incident.resolved" || status === "RESOLVED" || status === "CANCELLED") {
      await prisma.incident.update({
        where: { externalId },
        data: {
          status: status as IncidentStatus,
          resolvedAt: new Date(),
          rawPayload: rawPayload as Prisma.InputJsonValue ?? undefined,
        },
      });
      return NextResponse.json({ message: "Incident updated" });
    }

    // Validate that the tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ message: "Invalid tenant" }, { status: 400 });
    }

    // Find existing incident by externalId scoped to tenant
    const existingIncident = await prisma.incident.findFirst({
      where: { externalId, tenantId },
    });

    let incident;
    if (existingIncident) {
      incident = await prisma.incident.update({
        where: { id: existingIncident.id },
        data: {
          type,
          status: status as IncidentStatus,
          description,
          location,
          latitude,
          longitude,
          rawPayload: rawPayload as Prisma.InputJsonValue ?? undefined,
        },
      });
    } else {
      incident = await prisma.incident.create({
        data: {
          tenantId,
          externalId,
          type,
          status: status as IncidentStatus,
          description,
          location,
          latitude,
          longitude,
          rawPayload: rawPayload as Prisma.InputJsonValue ?? undefined,
        },
      });
    }

    return NextResponse.json({ message: "Webhook processed", incidentId: incident.id });
  } catch (error) {
    logger.error("Webhook processing error", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}