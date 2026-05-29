import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createReviewSchema = z.object({
  userId: z.string(),
  rating: z.number().int().min(1).max(10),
  period: z.string(),
  notes: z.string().optional(),
});

const createDisciplinarySchema = z.object({
  userId: z.string(),
  incident: z.string().min(1),
  date: z.string().datetime(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  description: z.string(),
  action: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const type = searchParams.get("type"); // "review" or "disciplinary"

  if (type === "disciplinary") {
    // Disciplinary records would need a new model; for now return empty
    return NextResponse.json([]);
  }

  const where: Record<string, unknown> = {};
  if (!["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    where.userId = session.user.id;
  }
  if (userId) where.userId = userId;

  const reviews = await prisma.performanceReview.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, badgeNumber: true, department: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const review = await prisma.performanceReview.create({
      data: {
        userId: parsed.data.userId,
        reviewedById: session.user.id,
        rating: parsed.data.rating,
        period: parsed.data.period,
        notes: parsed.data.notes,
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "PERFORMANCE_REVIEW_CREATED",
      resource: "performanceReview",
      resourceId: review.id,
      metadata: { userId: parsed.data.userId, rating: parsed.data.rating },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}