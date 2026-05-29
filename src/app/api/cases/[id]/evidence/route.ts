import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createEvidenceSchema = z.object({
  type: z.enum(["PHYSICAL", "DIGITAL", "DOCUMENTARY", "BIOLOGICAL", "AUDIO", "VIDEO", "PHOTO"]),
  description: z.string().min(1),
  storageLocation: z.string().optional(),
  tagNumber: z.string().optional(),
  collectedAt: z.string().datetime().optional(),
  collectedBy: z.string().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const evidence = await prisma.evidence.findMany({
    where: { caseId: id },
    include: {
      custodyChain: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(evidence);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const parsed = createEvidenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const evidence = await prisma.evidence.create({
      data: {
        caseId,
        type: parsed.data.type,
        description: parsed.data.description,
        storageLocation: parsed.data.storageLocation,
        tagNumber: parsed.data.tagNumber,
        collectedAt: parsed.data.collectedAt ? new Date(parsed.data.collectedAt) : null,
        collectedBy: parsed.data.collectedBy,
      },
    });

    // Create initial custody log entry
    await prisma.evidenceCustody.create({
      data: {
        evidenceId: evidence.id,
        userId: session.user.id,
        action: "COLLECTED",
        location: parsed.data.storageLocation,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "EVIDENCE_ADDED",
      resource: "evidence",
      resourceId: evidence.id,
      metadata: { caseId, type: parsed.data.type },
    });

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    console.error("Create evidence error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}