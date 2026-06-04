import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const publicCreateSchema = z.object({
  complainantName: z.string().optional(),
  complainantEmail: z.string().email().optional(),
  complainantPhone: z.string().optional(),
  subjectOfficerId: z.string().optional(),
  incidentDate: z.string().datetime(),
  complaintType: z.string().min(1),
  description: z.string().min(1),
});

const internalUpdateSchema = z.object({
  status: z.enum(["RECEIVED", "ASSIGNED", "INVESTIGATING", "RESOLVED"]).optional(),
  outcome: z.enum(["SUSTAINED", "NOT_SUSTAINED", "EXONERATED", "UNFOUNDED"]).optional(),
  assignedReviewerId: z.string().optional(),
  responseNotes: z.string().optional(),
});

async function generateReferenceNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.civilianComplaint.count({
    where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `CMP-${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;

  const complaints = await prisma.civilianComplaint.findMany({
    where,
    include: {
      subjectOfficer: { select: { id: true, name: true, badgeNumber: true } },
      assignedReviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(complaints);
}

export async function POST(request: Request) {
  const session = await auth();
  const isPublic = !session;

  try {
    const body = await request.json();
    const parsed = publicCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const tenantId = session?.user.tenantId ?? body.tenantId ?? (await prisma.tenant.findFirst())?.id;
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant required" }, { status: 400 });
    }

    const referenceNumber = await generateReferenceNumber(tenantId);

    const complaint = await prisma.civilianComplaint.create({
      data: {
        tenantId,
        referenceNumber,
        complainantName: parsed.data.complainantName,
        complainantEmail: parsed.data.complainantEmail,
        complainantPhone: parsed.data.complainantPhone,
        subjectOfficerId: parsed.data.subjectOfficerId,
        incidentDate: new Date(parsed.data.incidentDate),
        complaintType: parsed.data.complaintType,
        description: parsed.data.description,
      },
    });

    if (!isPublic && session) {
      await writeAuditLog({
        userId: session.user.id,
        tenantId,
        action: "COMPLAINT_CREATED",
        resource: "civilian_complaint",
        resourceId: complaint.id,
        metadata: { referenceNumber, type: parsed.data.complaintType },
      });
    }

    return NextResponse.json(
      { referenceNumber, id: complaint.id, message: "Complaint submitted. Reference: " + referenceNumber },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create complaint error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PRECINCT_ADMIN", "CITY_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const parsed = internalUpdateSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (data.status === "RESOLVED") data.resolvedAt = new Date();

    const complaint = await prisma.civilianComplaint.update({
      where: { id, tenantId: session.user.tenantId },
      data,
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "COMPLAINT_UPDATED",
      resource: "civilian_complaint",
      resourceId: complaint.id,
      metadata: { status: parsed.data.status, outcome: parsed.data.outcome },
    });

    return NextResponse.json(complaint);
  } catch (error) {
    console.error("Update complaint error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}