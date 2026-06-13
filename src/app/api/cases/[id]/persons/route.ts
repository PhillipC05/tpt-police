import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createPersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().datetime().optional(),
  idNumber: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  role: z.enum(["SUSPECT", "WITNESS", "VICTIM", "PERSON_OF_INTEREST"]),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const persons = await prisma.casePersonLink.findMany({
    where: { caseId: id },
    include: { person: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(persons);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id: caseId } = await params;
    const body = await request.json();
    const parsed = createPersonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    // Create or find person
    let person = parsed.data.idNumber
      ? await prisma.person.findFirst({ where: { idNumber: parsed.data.idNumber } })
      : null;

    if (!person) {
      person = await prisma.person.create({
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
          idNumber: parsed.data.idNumber,
          nationality: parsed.data.nationality,
          gender: parsed.data.gender,
          phone: parsed.data.phone,
          email: parsed.data.email,
          address: parsed.data.address,
          notes: parsed.data.notes,
        },
      });
    }

    // Link person to case
    const link = await prisma.casePersonLink.create({
      data: {
        caseId,
        personId: person.id,
        role: parsed.data.role,
      },
      include: { person: true },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "CASE_PERSON_ADDED",
      resource: "casePersonLink",
      resourceId: link.id,
      metadata: { caseId, personId: person.id, role: parsed.data.role },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    logger.error("Add person error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
