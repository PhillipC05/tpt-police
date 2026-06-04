import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  eventDate: z.string().datetime(),
  isPublic: z.boolean().default(true),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const isPublic = searchParams.get("public");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (isPublic === "true") where.isPublic = true;

  const events = await prisma.communityEvent.findMany({
    where,
    orderBy: { eventDate: "asc" },
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

    const event = await prisma.communityEvent.create({
      data: {
        tenantId: session.user.tenantId,
        officerHostId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        location: parsed.data.location,
        eventDate: new Date(parsed.data.eventDate),
        isPublic: parsed.data.isPublic,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "COMMUNITY_EVENT_CREATED",
      resource: "community_event",
      resourceId: event.id,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}