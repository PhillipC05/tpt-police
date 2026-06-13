import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  contactType: z.enum(["TRAFFIC_STOP", "FIELD_INTERVIEW", "PEDESTRIAN_STOP", "WARRANT_CHECK"]),
  contactDate: z.string().datetime(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  subjectName: z.string().optional(),
  subjectDob: z.string().optional(),
  subjectIdNumber: z.string().optional(),
  vehiclePlate: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  personId: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const officerId = searchParams.get("officerId");
  const contactType = searchParams.get("contactType");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (contactType) where.contactType = contactType;

  // Officers see only their own contacts unless a specific officer is requested
  const restrictedRoles = ["OFFICER", "DISPATCHER"];
  if ((restrictedRoles as string[]).includes(session.user.role) && !officerId) {
    where.officerId = session.user.id;
  } else if (officerId) {
    where.officerId = officerId;
  }

  const contacts = await prisma.fieldContact.findMany({
    where,
    include: {
      officer: { select: { id: true, name: true, badgeNumber: true } },
      person: { select: { id: true, firstName: true, lastName: true, idNumber: true } },
    },
    orderBy: { contactDate: "desc" },
  });

  return NextResponse.json(contacts);
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

    const contact = await prisma.fieldContact.create({
      data: {
        tenantId: session.user.tenantId,
        officerId: session.user.id,
        contactType: parsed.data.contactType,
        contactDate: new Date(parsed.data.contactDate),
        location: parsed.data.location,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        subjectName: parsed.data.subjectName,
        subjectDob: parsed.data.subjectDob,
        subjectIdNumber: parsed.data.subjectIdNumber,
        vehiclePlate: parsed.data.vehiclePlate,
        vehicleMake: parsed.data.vehicleMake,
        vehicleModel: parsed.data.vehicleModel,
        personId: parsed.data.personId,
        outcome: parsed.data.outcome,
        notes: parsed.data.notes,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "FIELD_CONTACT_CREATED",
      resource: "field_contact",
      resourceId: contact.id,
      metadata: { contactType: parsed.data.contactType, location: parsed.data.location },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    logger.error("Create field contact error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
