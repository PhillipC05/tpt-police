import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");
  const officerId = searchParams.get("officerId");
  const area = searchParams.get("area");

  const tid = session.user.tenantId;

  const where: Record<string, unknown> = { tenantId: tid };
  if (dateFrom) where.contactDate = { gte: new Date(dateFrom) };
  if (dateTo) where.contactDate = { ...(where.contactDate as Record<string, unknown> || {}), lte: new Date(dateTo) };
  if (officerId) where.officerId = officerId;

  const contacts = await prisma.fieldContact.findMany({
    where,
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true, department: true } },
      person: { select: { id: true, firstName: true, lastName: true, idNumber: true } },
    },
    orderBy: { contactDate: "desc" },
  });

  // Apply area filter post-query
  const filtered = area
    ? contacts.filter((c) => c.location?.toLowerCase().includes(area.toLowerCase()))
    : contacts;

  const summary = {
    totalContacts: filtered.length,
    byType: {} as Record<string, number>,
    byOfficer: {} as Record<string, { name: string; badgeNumber: string | null; count: number }>,
    byOutcome: {} as Record<string, number>,
    byMonth: {} as Record<string, number>,
  };

  for (const c of filtered) {
    summary.byType[c.contactType] = (summary.byType[c.contactType] || 0) + 1;

    const officerKey = c.officerId;
    if (!summary.byOfficer[officerKey]) {
      summary.byOfficer[officerKey] = { name: c.officer.name, badgeNumber: c.officer.badgeNumber, count: 0 };
    }
    summary.byOfficer[officerKey].count++;

    if (c.outcome) summary.byOutcome[c.outcome] = (summary.byOutcome[c.outcome] || 0) + 1;

    const monthKey = new Date(c.contactDate).toISOString().substring(0, 7);
    summary.byMonth[monthKey] = (summary.byMonth[monthKey] || 0) + 1;
  }

  if (format === "csv") {
    const header = "Date,Officer,Badge,Type,Subject,ID Number,Location,Outcome,Notes\n";
    const rows = filtered.map((c) =>
      [
        new Date(c.contactDate).toISOString(),
        c.officer.name,
        c.officer.badgeNumber || "",
        c.contactType,
        c.subjectName || `${c.person?.firstName || ""} ${c.person?.lastName || ""}`.trim() || "",
        c.person?.idNumber || c.subjectIdNumber || "",
        c.location || "",
        c.outcome || "",
        `"${(c.notes || "").replace(/"/g, '""')}"`,
      ].join(",")
    ).join("\n");

    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="community-oversight-${tid}.csv"`,
      },
    });
  }

  return NextResponse.json({ summary, contacts: filtered });
}