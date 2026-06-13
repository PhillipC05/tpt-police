import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createNoteSchema = z.object({
  content: z.string().min(1),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const notes = await prisma.caseNote.findMany({
    where: { caseId: id },
    include: { author: { select: { id: true, name: true, badgeNumber: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const note = await prisma.caseNote.create({
      data: {
        caseId,
        authorId: session.user.id,
        content: parsed.data.content,
      },
      include: { author: { select: { id: true, name: true, badgeNumber: true } } },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "CASE_NOTE_ADDED",
      resource: "caseNote",
      resourceId: note.id,
      metadata: { caseId },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    logger.error("Create note error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
