import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  badgeNumber: z.string().optional(),
  tenantId: z.string().min(1),
});

export async function POST(request: Request) {
  // Rate limit: max 5 registration attempts per IP per 15 minutes
  const rlIdentifier = getRateLimitIdentifier(undefined, request);
  const rlResult = checkRateLimit(rlIdentifier, { max: 5, windowMs: 15 * 60 * 1000, prefix: "rl:register" });
  if (rlResult) return rlResult;

  // CSRF check for mutating request
  const csrfResult = validateCsrf(request);
  if (csrfResult) return csrfResult;

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, badgeNumber, tenantId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 409 }
      );
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json(
        { message: "Invalid tenant" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        badgeNumber,
        tenantId,
        role: "OFFICER",
      },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    logger.error("Registration error:", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
