import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/public/community/events?tenantId=xxx
 * Returns public community events for a given tenant.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json(
      { message: "tenantId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const events = await prisma.communityEvent.findMany({
      where: {
        tenantId,
        isPublic: true,
        eventDate: { gte: new Date() },
      },
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        eventDate: true,
        createdAt: true,
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    logger.error("Community events error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}