import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  accuracy: z.number().min(0).optional(),
  status: z
    .enum(["ON_DUTY", "OFF_DUTY", "EN_ROUTE", "ON_SCENE", "BREAK", "UNAVAILABLE"])
    .optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const minutesAgo = searchParams.get("minutesAgo")
    ? parseInt(searchParams.get("minutesAgo")!)
    : 30;

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;
  where.updatedAt = { gte: new Date(Date.now() - minutesAgo * 60 * 1000) };

  const officerLocations = await prisma.officerLocation.findMany({
    where,
    include: {
      officer: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
          rank: true,
          department: true,
          photoUrl: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(officerLocations);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = updateLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid payload", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { latitude, longitude, heading, speed, accuracy, status } = parsed.data;

    const officerLocation = await prisma.officerLocation.upsert({
      where: { officerId: session.user.id },
      update: {
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
        accuracy: accuracy ?? null,
        status: status ?? "ON_DUTY",
      },
      create: {
        officerId: session.user.id,
        tenantId: session.user.tenantId,
        latitude,
        longitude,
        heading: heading ?? null,
        speed: speed ?? null,
        accuracy: accuracy ?? null,
        status: status ?? "ON_DUTY",
      },
    });

    return NextResponse.json(officerLocation, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}