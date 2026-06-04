import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const tid = session.user.tenantId;

  const [caseLinks, bookings, warrants] = await Promise.all([
    prisma.casePersonLink.findMany({
      where: { personId: id, case: { tenantId: tid } },
      include: {
        case: { select: { caseNumber: true, title: true, type: true, status: true, createdAt: true, closedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { personId: id, tenantId: tid },
      orderBy: { arrestedAt: "desc" },
    }),
    prisma.warrant.findMany({
      where: { personId: id, tenantId: tid },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const lines = [
    "=".repeat(60),
    "           TPT POLICE — RAP SHEET (Criminal Record)",
    "=".repeat(60),
    "",
    `Full Name:        ${person.firstName} ${person.lastName}`,
    `Date of Birth:    ${person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString() : "N/A"}`,
    `ID Number:        ${person.idNumber || "N/A"}`,
    `Gender:           ${person.gender || "N/A"}`,
    `Nationality:      ${person.nationality || "N/A"}`,
    `Address:          ${person.address || "N/A"}`,
    `Phone:            ${person.phone || "N/A"}`,
    `Email:            ${person.email || "N/A"}`,
    "",
    "-".repeat(60),
    "CASE HISTORY",
    "-".repeat(60),
    ...(caseLinks.length === 0
      ? ["  No case history."]
      : caseLinks.map((cl, i) =>
          [
            `  ${i + 1}. ${cl.case.caseNumber} — ${cl.case.title} (${cl.case.type})`,
            `       Role: ${cl.role}  |  Status: ${cl.case.status}`,
            `       Created: ${new Date(cl.case.createdAt).toLocaleDateString()}${cl.case.closedAt ? `  |  Closed: ${new Date(cl.case.closedAt).toLocaleDateString()}` : ""}`,
          ].join("\n")
        )),
    "",
    "-".repeat(60),
    "BOOKING HISTORY",
    "-".repeat(60),
    ...(bookings.length === 0
      ? ["  No booking history."]
      : bookings.map((b, i) =>
          [
            `  ${i + 1}. ${b.bookingNumber} — ${b.status}`,
            `       Arrested: ${new Date(b.arrestedAt).toLocaleDateString()}`,
            `       Charges: ${(b.charges as string[]).join(", ")}`,
            b.bailAmount ? `       Bail: R${b.bailAmount.toLocaleString()}` : "",
          ].filter(Boolean).join("\n")
        )),
    "",
    "-".repeat(60),
    "WARRANT HISTORY",
    "-".repeat(60),
    ...(warrants.length === 0
      ? ["  No warrant history."]
      : warrants.map((w, i) =>
          [
            `  ${i + 1}. ${w.warrantNumber} — ${w.type} (${w.status})`,
            `       Issued: ${new Date(w.createdAt).toLocaleDateString()}`,
            w.expiresAt ? `       Expires: ${new Date(w.expiresAt).toLocaleDateString()}` : "",
          ].filter(Boolean).join("\n")
        )),
    "",
    "-".repeat(60),
    `Report generated: ${new Date().toLocaleString()}`,
    "This is a computer-generated official record.",
  ];

  const content = lines.join("\n");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `rap-sheet-${person.firstName}-${person.lastName}-${ts}.txt`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}