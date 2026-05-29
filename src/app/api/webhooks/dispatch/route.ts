import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
  rawPayload: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  // Validate webhook secret
  const authHeader = request.headers.get("authorization");
  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
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
          status,
          resolvedAt: new Date(),
          rawPayload: rawPayload ?? undefined,
        },
      });
      return NextResponse.json({ message: "Incident updated" });
    }

    const incident = await prisma.incident.upsert({
      where: { externalId: externalId ?? "" },
      update: {
        type,
        status,
        description,
        location,
        latitude,
        longitude,
        rawPayload: rawPayload ?? undefined,
      },
      create: {
        tenantId,
        externalId,
        type,
        status,
        description,
        location,
        latitude,
        longitude,
        rawPayload: rawPayload ?? undefined,
      },
    });

    return NextResponse.json({ message: "Webhook processed", incidentId: incident.id });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}