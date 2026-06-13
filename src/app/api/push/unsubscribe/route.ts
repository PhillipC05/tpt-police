import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint: parsed.data.endpoint, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Push unsubscribe error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
