import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { buildTipAcknowledgmentEmail } from "@/lib/email-templates";
import { z } from "zod";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";

const createTipSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  isAnonymous: z.boolean().default(true),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const reviewed = searchParams.get("reviewed");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (reviewed !== null) where.reviewed = reviewed === "true";
  if (type) where.type = type;

  const tips = await prisma.crimeTip.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tips);
}

export async function POST(request: Request) {
  // Rate limit: max 10 tip submissions per IP per 5 minutes
  const rlIdentifier = getRateLimitIdentifier(undefined, request);
  const rlResult = checkRateLimit(rlIdentifier, { max: 10, windowMs: 5 * 60 * 1000, prefix: "rl:tips" });
  if (rlResult) return rlResult;

  // CSRF check for mutating request
  const csrfResult = validateCsrf(request);
  if (csrfResult) return csrfResult;

  try {
    const body = await request.json();
    const parsed = createTipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    // Try to get session for authenticated users, but allow anonymous
    const session = await auth();

    const tip = await prisma.crimeTip.create({
      data: {
        tenantId: session?.user?.tenantId ?? "public",
        type: parsed.data.type,
        description: parsed.data.description,
        location: parsed.data.location,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        isAnonymous: parsed.data.isAnonymous,
        submittedById: session?.user?.id,
      },
    });

    // Send acknowledgment email if contact email was provided
    if (parsed.data.contactEmail) {
      const emailData = buildTipAcknowledgmentEmail({
        reference: tip.id,
        tipType: parsed.data.type,
        description: parsed.data.description,
        isAnonymous: parsed.data.isAnonymous,
        contactEmail: parsed.data.contactEmail,
        contactPhone: parsed.data.contactPhone,
        submittedAt: tip.createdAt.toISOString(),
      });

      // Fire and forget — don't block response if email fails
      sendEmail({
        to: parsed.data.contactEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      }).then((result) => {
        if (!result.success) {
          console.error("Failed to send tip acknowledgment email:", result.error);
        }
      });
    }

    return NextResponse.json({ message: "Tip submitted", reference: tip.id }, { status: 201 });
  } catch (error) {
    console.error("Submit tip error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  // CSRF check for mutating request
  const csrfResult = validateCsrf(request);
  if (csrfResult) return csrfResult;

  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, reviewed } = body;

    if (!id) {
      return NextResponse.json({ message: "Tip ID required" }, { status: 400 });
    }

    const tip = await prisma.crimeTip.update({
      where: { id },
      data: { reviewed: reviewed ?? true },
    });

    return NextResponse.json(tip);
  } catch (error) {
    console.error("Update tip error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}