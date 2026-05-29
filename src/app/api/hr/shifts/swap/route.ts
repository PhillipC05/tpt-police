import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSwapSchema = z.object({
  shiftId: z.string(),
  targetUserId: z.string(),
  reason: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const swaps = await prisma.shiftSwap.findMany({
    where: {
      OR: [
        { requestingUserId: session.user.id },
        { targetUserId: session.user.id },
      ],
    },
    include: {
      shift: { select: { id: true, name: true, startTime: true, endTime: true, type: true } },
      requestingUser: { select: { id: true, name: true, badgeNumber: true } },
      targetUser: { select: { id: true, name: true, badgeNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(swaps);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createSwapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const swap = await prisma.shiftSwap.create({
      data: {
        shiftId: parsed.data.shiftId,
        requestingUserId: session.user.id,
        targetUserId: parsed.data.targetUserId,
        reason: parsed.data.reason,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "SHIFT_SWAP_REQUESTED",
      resource: "shiftSwap",
      resourceId: swap.id,
    });

    return NextResponse.json(swap, { status: 201 });
  } catch (error) {
    console.error("Create swap error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ message: "id and status required" }, { status: 400 });
    }

    const validStatuses = ["APPROVED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const swap = await prisma.shiftSwap.update({
      where: { id },
      data: { status, approvedById: session.user.id },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: `SHIFT_SWAP_${status}`,
      resource: "shiftSwap",
      resourceId: id,
    });

    return NextResponse.json(swap);
  } catch (error) {
    console.error("Update swap error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}