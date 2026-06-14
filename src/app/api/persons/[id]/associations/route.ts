import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!DETECTIVE_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const [asA, asB] = await Promise.all([
    prisma.personAssociation.findMany({
      where: { personAId: id, tenantId: session.user.tenantId },
      include: {
        personB: { select: { id: true, firstName: true, lastName: true, idNumber: true, photoUrl: true, threatLevel: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.personAssociation.findMany({
      where: { personBId: id, tenantId: session.user.tenantId },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true, idNumber: true, photoUrl: true, threatLevel: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_PERSON_ASSOCIATIONS",
    resource: "personAssociation",
    resourceId: id,
  });

  const associations = [
    ...asA.map((a) => ({
      id: a.id,
      relationshipType: a.relationshipType,
      confidence: a.confidence,
      notes: a.notes,
      createdAt: a.createdAt,
      associate: a.personB,
    })),
    ...asB.map((a) => ({
      id: a.id,
      relationshipType: a.relationshipType,
      confidence: a.confidence,
      notes: a.notes,
      createdAt: a.createdAt,
      associate: a.personA,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ associations });
}
