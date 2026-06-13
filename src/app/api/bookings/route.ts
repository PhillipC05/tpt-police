import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  personId: z.string().min(1),
  caseId: z.string().optional(),
  charges: z.array(z.string()).min(1),
  bailAmount: z.number().optional(),
  holdingCell: z.string().optional(),
  afisReference: z.string().optional(),
  arrestedAt: z.string().datetime(),
  notes: z.string().optional(),
});

async function generateBookingNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.booking.count({
    where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `BKG-${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      person: { select: { id: true, firstName: true, lastName: true, idNumber: true, dateOfBirth: true } },
      arrestingOfficer: { select: { id: true, name: true, badgeNumber: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
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

    const person = await prisma.person.findUnique({ where: { id: parsed.data.personId } });
    if (!person) return NextResponse.json({ message: "Person not found" }, { status: 404 });

    const bookingNumber = await generateBookingNumber(session.user.tenantId);

    const booking = await prisma.booking.create({
      data: {
        tenantId: session.user.tenantId,
        bookingNumber,
        personId: parsed.data.personId,
        arrestingOfficerId: session.user.id,
        caseId: parsed.data.caseId,
        charges: parsed.data.charges,
        bailAmount: parsed.data.bailAmount,
        holdingCell: parsed.data.holdingCell,
        afisReference: parsed.data.afisReference,
        arrestedAt: new Date(parsed.data.arrestedAt),
        notes: parsed.data.notes,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "BOOKING_CREATED",
      resource: "booking",
      resourceId: booking.id,
      metadata: { bookingNumber, personId: parsed.data.personId, charges: parsed.data.charges },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    logger.error("Create booking error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
