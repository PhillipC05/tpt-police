import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  const locationId = searchParams.get("locationId");
  const caseStatus = searchParams.get("caseStatus");

  const tid = session.user.tenantId;

  const where: Record<string, unknown> = { case: { tenantId: tid } };
  if (caseStatus) where.case = { tenantId: tid, status: caseStatus };
  if (locationId) where.storageLocation = locationId;

  const evidence = await prisma.evidence.findMany({
    where,
    include: {
      case: { select: { id: true, caseNumber: true, title: true, status: true } },
      custodyChain: { orderBy: { createdAt: "desc" }, take: 1, include: { user: { select: { name: true } } } },
      disposition: true,
      controlledSubstance: true,
      labSubmissions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const locations = await prisma.storageLocation.findMany({
    where: { tenantId: tid },
    include: { children: true },
  });

  const summary = {
    total: evidence.length,
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    byLocation: {} as Record<string, number>,
    withDisposition: evidence.filter((e) => e.disposition).length,
    withControlledSubstance: evidence.filter((e) => e.controlledSubstance).length,
    pendingLabSubmission: evidence.filter((e) => e.labSubmissions.length > 0 && e.labSubmissions[0].status !== "REVIEWED").length,
  };

  for (const e of evidence) {
    summary.byType[e.type] = (summary.byType[e.type] || 0) + 1;
    summary.byStatus[e.case.status] = (summary.byStatus[e.case.status] || 0) + 1;
    const loc = e.storageLocation || "Unassigned";
    summary.byLocation[loc] = (summary.byLocation[loc] || 0) + 1;
  }

  if (format === "csv") {
    const header = "Case Number,Case Title,Case Status,Evidence Type,Description,Storage Location,Tag Number,Collected By,Collected At,Disposition,Drug Type,Last Lab Status,Last Custodian\n";
    const rows = evidence.map((e) =>
      [
        e.case.caseNumber,
        `"${e.case.title.replace(/"/g, '""')}"`,
        e.case.status,
        e.type,
        `"${e.description.replace(/"/g, '""')}"`,
        e.storageLocation || "",
        e.tagNumber || "",
        e.collectedBy || "",
        e.collectedAt?.toISOString() || "",
        e.disposition?.action || "",
        e.controlledSubstance?.drugType || "",
        e.labSubmissions[0]?.status || "",
        e.custodyChain[0]?.user.name || "",
      ].join(",")
    ).join("\n");

    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="evidence-inventory-${tid}.csv"`,
      },
    });
  }

  return NextResponse.json({ summary, evidence, locations });
}