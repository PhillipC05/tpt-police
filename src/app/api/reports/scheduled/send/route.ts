import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { buildScheduledReportEmail } from "@/lib/email-templates";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { reportId, metrics } = body;

  if (!reportId) {
    return NextResponse.json({ message: "Report ID is required" }, { status: 400 });
  }

  const report = await prisma.scheduledReport.findFirst({
    where: { id: reportId, tenantId: session.user.tenantId },
    include: {
      tenant: { select: { name: true } },
    },
  });

  if (!report) {
    return NextResponse.json({ message: "Report not found" }, { status: 404 });
  }

  const recipients = report.recipients as string[];
  if (recipients.length === 0) {
    return NextResponse.json({ message: "No recipients configured" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true },
  });

  const metricList = Array.isArray(metrics) ? metrics : [];

  const { subject, html, text } = buildScheduledReportEmail({
    reportTitle: report.title,
    tenantName: tenant?.name ?? "Unknown",
    period: `${report.schedule} report`,
    metrics: metricList.length > 0
      ? metricList
      : [{ label: "Status", value: "No metrics available" }],
    format: report.format,
    generatedAt: new Date().toISOString(),
  });

  const results = await Promise.allSettled(
    recipients.map((email) =>
      sendEmail({ to: email, subject, html, text }),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
  const failed = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success),
  ).length;

  // Update lastSentAt
  await prisma.scheduledReport.update({
    where: { id: reportId },
    data: { lastSentAt: new Date() },
  });

  return NextResponse.json({
    message: `Report sent to ${succeeded} recipient(s)${failed > 0 ? `, ${failed} failed` : ""}`,
    succeeded,
    failed,
  });
}