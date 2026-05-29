import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;
  if (type) where.type = type;

  // Default to active incidents if no filter
  if (!status) where.status = "ACTIVE";

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      linkedCases: {
        select: { id: true, caseNumber: true, title: true },
      },
    },
    orderBy: { reportedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(incidents);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { externalId, type, description, location, latitude, longitude } = body;

    const incident = await prisma.incident.create({
      data: {
        tenantId: session.user.tenantId,
        externalId,
        type,
        status: "ACTIVE",
        description,
        location,
        latitude,
        longitude,
      },
    });

    return NextResponse.json(incident, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}