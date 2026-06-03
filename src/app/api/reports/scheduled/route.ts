import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  metrics: z.array(z.string()).default([]),
  filters: z.record(z.string(), z.any()).default({}),
  schedule: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  recipients: z.array(z.string()).default([]),
  format: z.enum(["pdf", "csv", "excel"]).default("pdf"),
});

const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

function computeNextRun(schedule: string): Date {
  const now = new Date();
  switch (schedule) {
    case "daily":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
    case "weekly":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()) + 1, 8, 0, 0);
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth() + 1, 1, 8, 0, 0);
    default:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const reports = await prisma.scheduledReport.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation error", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, metrics, filters, schedule, recipients, format } = parsed.data;

  const report = await prisma.scheduledReport.create({
    data: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      title,
      description,
      metrics: JSON.parse(JSON.stringify(metrics)),
      filters: JSON.parse(JSON.stringify(filters)),
      schedule,
      recipients: JSON.parse(JSON.stringify(recipients)),
      format,
      nextRunAt: computeNextRun(schedule),
    },
  });

  return NextResponse.json(report, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ message: "Report ID is required" }, { status: 400 });

  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ message: "Validation error", errors: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.scheduledReport.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ message: "Report not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.schedule) {
    updateData.nextRunAt = computeNextRun(parsed.data.schedule);
  }
  if (parsed.data.metrics) {
    updateData.metrics = JSON.parse(JSON.stringify(parsed.data.metrics));
  }
  if (parsed.data.filters) {
    updateData.filters = JSON.parse(JSON.stringify(parsed.data.filters));
  }
  if (parsed.data.recipients) {
    updateData.recipients = JSON.parse(JSON.stringify(parsed.data.recipients));
  }

  const updated = await prisma.scheduledReport.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Report ID required" }, { status: 400 });

  const existing = await prisma.scheduledReport.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ message: "Report not found" }, { status: 404 });

  await prisma.scheduledReport.delete({ where: { id } });

  return NextResponse.json({ message: "Report deleted" });
}