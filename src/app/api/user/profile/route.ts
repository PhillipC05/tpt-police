import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
      badgeNumber: true,
      rank: true,
      department: true,
      role: true,
      mfaEnabled: true,
      createdAt: true,
    },
  });

  if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
        ...(parsed.data.photoUrl !== undefined && { photoUrl: parsed.data.photoUrl }),
      },
      select: { id: true, name: true, email: true, phone: true, photoUrl: true },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "PROFILE_UPDATED",
      resource: "user",
      resourceId: session.user.id,
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Update profile error", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
