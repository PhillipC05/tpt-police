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
  const personId = searchParams.get("personId");
  const since = searchParams.get("since");
  const reason = searchParams.get("reason");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 50;

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (personId) where.personId = personId;
  if (since) where.capturedAt = { gte: new Date(since) };
  if (reason) where.matchReasons = { has: reason };

  const [matches, total] = await Promise.all([
    prisma.facialMatch.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            threatLevel: true,
          },
        },
        session: {
          select: {
            sourceType: true,
            bwcCamera: { select: { serialNumber: true, deviceType: true } },
            surveillanceCam: { select: { name: true, location: true } },
          },
        },
        alertedUser: { select: { id: true, name: true, badgeNumber: true } },
      },
      orderBy: { capturedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.facialMatch.count({ where }),
  ]);

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_FACIAL_MATCHES",
    resource: "facial_recognition",
    metadata: { personId, since, reason, page },
  });

  return NextResponse.json({ matches, total, page, limit });
}
