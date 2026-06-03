import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["EXPIRED", "CANCELLED"]),
  notes: z.string().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.alert.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: parsed.data.status,
        cancelledAt: parsed.data.status === "CANCELLED" ? new Date() : undefined,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "ALERT_UPDATED",
      resource: "alert",
      resourceId: id,
      metadata: { status: parsed.data.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update alert error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
