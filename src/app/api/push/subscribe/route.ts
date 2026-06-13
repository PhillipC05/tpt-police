import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid subscription" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: {
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
      create: {
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error("Push subscribe error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
