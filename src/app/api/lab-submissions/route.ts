import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  evidenceId: z.string().optional(),
  type: z.enum(["DNA", "BALLISTICS", "TOXICOLOGY", "DIGITAL", "FINGERPRINT", "OTHER"]),
  expectedTurnaround: z.number().int().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const evidenceId = searchParams.get("evidenceId");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;
  if (evidenceId) where.evidenceId = evidenceId;

  const submissions = await prisma.labSubmission.findMany({
    where,
    include: {
      evidence: { select: { id: true, description: true, tagNumber: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(submissions);
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

    const year = new Date().getFullYear();
    const count = await prisma.labSubmission.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const labReferenceNo = `LAB-${year}-${String(count + 1).padStart(6, "0")}`;

    const submission = await prisma.labSubmission.create({
      data: {
        tenantId: session.user.tenantId,
        evidenceId: parsed.data.evidenceId,
        type: parsed.data.type,
        submittedById: session.user.id,
        labReferenceNo,
        expectedTurnaround: parsed.data.expectedTurnaround ?? 14,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "LAB_SUBMISSION_CREATED",
      resource: "lab_submission",
      resourceId: submission.id,
      metadata: { labReferenceNo, type: parsed.data.type },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error("Lab submission error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status, resultsFileUrl, resultsNotes } = body;
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (resultsFileUrl) data.resultsFileUrl = resultsFileUrl;
    if (resultsNotes) data.resultsNotes = resultsNotes;
    if (status === "REVIEWED") data.reviewedAt = new Date();
    if (status === "RESULTS_READY") {
      const sub = await prisma.labSubmission.findUnique({ where: { id } });
      if (sub) {
        const turnaround = Math.ceil((Date.now() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        data.turnaroundDays = turnaround;
      }
    }

    const submission = await prisma.labSubmission.update({
      where: { id, tenantId: session.user.tenantId },
      data,
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error("Update lab submission error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}