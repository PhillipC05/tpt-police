import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      person: true,
      arrestingOfficer: { select: { id: true, name: true, badgeNumber: true, rank: true } },
      case: { select: { id: true, caseNumber: true, title: true, type: true } },
    },
  });

  if (!booking) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  // Build a plain-text booking sheet
  const lines = [
    "=".repeat(60),
    "               TPT POLICE — BOOKING SHEET",
    "=".repeat(60),
    "",
    `Booking #:     ${booking.bookingNumber}`,
    `Status:        ${booking.status}`,
    `Arrested:      ${new Date(booking.arrestedAt).toLocaleString()}`,
    `Released:      ${booking.releasedAt ? new Date(booking.releasedAt).toLocaleString() : "N/A"}`,
    "",
    "--- PERSON DETAILS ---",
    `Name:          ${booking.person.firstName} ${booking.person.lastName}`,
    `DOB:           ${booking.person.dateOfBirth ? new Date(booking.person.dateOfBirth).toLocaleDateString() : "N/A"}`,
    `ID Number:     ${booking.person.idNumber || "N/A"}`,
    `Gender:        ${booking.person.gender || "N/A"}`,
    `Nationality:   ${booking.person.nationality || "N/A"}`,
    `Address:       ${booking.person.address || "N/A"}`,
    "",
    "--- ARREST DETAILS ---",
    `Arresting Officer: ${booking.arrestingOfficer.name} (Badge: ${booking.arrestingOfficer.badgeNumber || "N/A"})`,
    `Rank:          ${booking.arrestingOfficer.rank || "N/A"}`,
    `Holding Cell:  ${booking.holdingCell || "N/A"}`,
    `AFIS Ref:      ${booking.afisReference || "N/A"}`,
    `Bail Amount:   ${booking.bailAmount ? `R${booking.bailAmount.toLocaleString()}` : "N/A"}`,
    `Bail Status:   ${booking.bailStatus || "N/A"}`,
    "",
    "--- CHARGES ---",
    ...(booking.charges as string[]).map((c, i) => `  ${i + 1}. ${c}`),
    "",
    booking.case ? `Linked Case:   ${booking.case.caseNumber} — ${booking.case.title} (${booking.case.type})` : "Linked Case:   None",
    "",
    `Notes:         ${booking.notes || "None"}`,
    "",
    `Generated:     ${new Date().toLocaleString()}`,
    "-".repeat(60),
    "This is a computer-generated document.",
  ];

  const content = lines.join("\n");
  const filename = `booking-sheet-${booking.bookingNumber}-${ts}.txt`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}