import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createStatementSchema = z.object({
  personId: z.string(),
  content: z.string().min(1),
  fileUrl: z.string().url().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const statements = await prisma.statement.findMany({
    where: {
      person: {
        caseLinks: { some: { caseId: id } },
      },
    },
    include: {
      person: { select: { id: true, firstName: true, lastName: true, idNumber: true } },
    },
    orderBy: { takenAt: "desc" },
  });

  return NextResponse.json(statements);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const parsed = createStatementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const statement = await prisma.statement.create({
      data: {
        personId: parsed.data.personId,
        content: parsed.data.content,
        fileUrl: parsed.data.fileUrl,
        takenById: session.user.id,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "STATEMENT_RECORDED",
      resource: "statement",
      resourceId: statement.id,
      metadata: { caseId, personId: parsed.data.personId },
    });

    return NextResponse.json(statement, { status: 201 });
  } catch (error) {
    console.error("Create statement error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}