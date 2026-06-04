import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Check for juvenile record restriction
  const isJuvenile = person.dateOfBirth
    ? new Date().getFullYear() - new Date(person.dateOfBirth).getFullYear() < 18
    : false;

  if (isJuvenile && !["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Juvenile records require DETECTIVE role or higher" }, { status: 403 });
  }

  const tid = session.user.tenantId;

  // Cross-precinct aggregation - check if user has broader access
  const isHighLevel = ["CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  const tenantFilter = isHighLevel ? undefined : { tenantId: tid };

  const [cases, bookings, fieldContacts, warrants, disciplinary] = await Promise.all([
    prisma.casePersonLink.findMany({
      where: { personId: id, case: tenantFilter ? { tenantId: tid } : {} },
      include: {
        case: { select: { id: true, caseNumber: true, title: true, type: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { personId: id, ...(tenantFilter || {}) },
      include: {
        arrestingOfficer: { select: { id: true, name: true, badgeNumber: true } },
      },
      orderBy: { arrestedAt: "desc" },
    }),
    prisma.fieldContact.findMany({
      where: { personId: id, ...(tenantFilter || {}) },
      include: {
        officer: { select: { id: true, name: true, badgeNumber: true } },
      },
      orderBy: { contactDate: "desc" },
    }),
    prisma.warrant.findMany({
      where: { personId: id, ...(tenantFilter || {}) },
      include: {
        issuedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.disciplinaryIncident.findMany({
      where: {
        user: { tenantId: tid },
        userId: session.user.id, // Only own disciplinary links in this context
      },
      orderBy: { date: "desc" },
    }),
  ]);

  return NextResponse.json({
    person,
    isJuvenile,
    history: {
      cases: cases.map((cl) => ({
        id: cl.case.id,
        caseNumber: cl.case.caseNumber,
        title: cl.case.title,
        type: cl.case.type,
        status: cl.case.status,
        role: cl.role,
        createdAt: cl.case.createdAt,
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        status: b.status,
        charges: b.charges,
        bailAmount: b.bailAmount,
        holdingCell: b.holdingCell,
        arrestedAt: b.arrestedAt,
        releasedAt: b.releasedAt,
        arrestingOfficer: b.arrestingOfficer,
      })),
      fieldContacts: fieldContacts.map((fc) => ({
        id: fc.id,
        contactType: fc.contactType,
        contactDate: fc.contactDate,
        location: fc.location,
        outcome: fc.outcome,
        officer: fc.officer,
      })),
      warrants: warrants.map((w) => ({
        id: w.id,
        warrantNumber: w.warrantNumber,
        type: w.type,
        status: w.status,
        issuedBy: w.issuedBy.name,
        issuedAt: w.createdAt,
      })),
    },
  });
}