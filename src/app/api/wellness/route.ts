import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const checkinSchema = z.object({
  moodScore: z.number().int().min(1).max(5),
  note: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const officerId = searchParams.get("officerId") || session.user.id;
  const days = parseInt(searchParams.get("days") || "30");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const checkins = await prisma.wellnessCheckin.findMany({
    where: { officerId, checkinDate: { gte: since } },
    orderBy: { checkinDate: "desc" },
  });

  return NextResponse.json(checkins);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const checkin = await prisma.wellnessCheckin.create({
      data: {
        officerId: session.user.id,
        moodScore: parsed.data.moodScore,
        note: parsed.data.note,
        flagged: parsed.data.moodScore <= 2,
      },
    });

    return NextResponse.json(checkin, { status: 201 });
  } catch (error) {
    logger.error("Wellness checkin error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}