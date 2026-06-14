import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!DETECTIVE_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const threatLevel = searchParams.get("threatLevel");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 50;

  const where: Record<string, unknown> = {};
  if (threatLevel) {
    where.threatLevel = threatLevel;
  } else {
    where.threatLevel = { not: "NONE" };
  }
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { idNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [persons, total] = await Promise.all([
    prisma.person.findMany({
      where,
      include: {
        gangMemberships: {
          include: { gang: { select: { id: true, name: true, type: true } } },
        },
        _count: { select: { warrants: true, bookings: true } },
      },
      orderBy: [
        { threatLevel: "desc" },
        { updatedAt: "desc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.person.count({ where }),
  ]);

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_INTELLIGENCE_PERSONS",
    resource: "intelligence",
    metadata: { threatLevel, search, page },
  });

  return NextResponse.json({ persons, total, page, limit });
}
