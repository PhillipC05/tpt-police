import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["BOOKED", "BAILED", "RELEASED", "TRANSFERRED", "CHARGED"]).optional(),
  bailAmount: z.number().optional(),
  bailStatus: z.string().optional(),
  holdingCell: z.string().optional(),
  mugShotUrl: z.string().optional(),
  afisReference: z.string().optional(),
  releasedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      person: true,
      arrestingOfficer: { select: { id: true, name: true, badgeNumber: true, rank: true } },
      case: { select: { id: true, caseNumber: true, title: true } },
    },
  });

  if (!booking) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(booking);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.booking.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...parsed.data,
        releasedAt: parsed.data.releasedAt ? new Date(parsed.data.releasedAt) : undefined,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "BOOKING_UPDATED",
      resource: "booking",
      resourceId: id,
      metadata: { status: parsed.data.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update booking error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
