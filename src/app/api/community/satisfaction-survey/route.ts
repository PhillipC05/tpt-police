import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const surveySchema = z.object({
  eventId: z.string().optional(),
  officerId: z.string().optional(),
  rating: z.number().min(1).max(5),
  comments: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  // Public can submit surveys
  try {
    const body = await request.json();
    const parsed = surveySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    // Store survey response as a commendation entry
    const tenantId = session?.user?.tenantId ||
      (parsed.data.officerId
        ? (await prisma.user.findUnique({ where: { id: parsed.data.officerId } }))?.tenantId
        : null);

    if (!tenantId) return NextResponse.json({ message: "Tenant required" }, { status: 400 });

    const survey = await prisma.officerCommendation.create({
      data: {
        tenantId,
        officerId: parsed.data.officerId || "unknown",
        citizenName: "Survey Response",
        description: `Satisfaction Survey: ${parsed.data.rating}/5. ${parsed.data.comments || ""}`,
        reviewed: false,
      },
    });

    return NextResponse.json({ id: survey.id, message: "Thank you for your feedback" }, { status: 201 });
  } catch (error) {
    logger.error("Survey error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}