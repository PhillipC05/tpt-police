import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";

const createFoiaSchema = z.object({
  requesterName: z.string().min(1),
  requesterEmail: z.string().email(),
  requesterOrg: z.string().optional(),
  description: z.string().min(1),
  tenantId: z.string().optional(),
});

async function generateReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.foiaRequest.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `FOIA-${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const referenceNumber = searchParams.get("reference");

  if (referenceNumber) {
    // Public tracking - no auth required
    const foia = await prisma.foiaRequest.findUnique({
      where: { referenceNumber },
      select: {
        referenceNumber: true,
        status: true,
        description: true,
        responseNotes: true,
        createdAt: true,
        respondedAt: true,
        dueDate: true,
      },
    });

    if (!foia) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(foia);
  }

  // Authenticated access for admins
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const status = searchParams.get("status");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;

  const foias = await prisma.foiaRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(foias);
}

export async function POST(request: Request) {
  // Rate limit: max 5 FOIA submissions per IP per 10 minutes
  const rlIdentifier = getRateLimitIdentifier(undefined, request);
  const rlResult = checkRateLimit(rlIdentifier, { max: 5, windowMs: 10 * 60 * 1000, prefix: "rl:foia" });
  if (rlResult) return rlResult;

  // CSRF check for mutating request
  const csrfResult = validateCsrf(request);
  if (csrfResult) return csrfResult;

  try {
    const body = await request.json();
    const parsed = createFoiaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const referenceNumber = await generateReferenceNumber();

    // If no tenant specified, route to national tenant (first NATION type tenant)
    let tenantId = parsed.data.tenantId;
    if (!tenantId) {
      const nationalTenant = await prisma.tenant.findFirst({ where: { type: "NATION" } });
      if (nationalTenant) tenantId = nationalTenant.id;
    }

    if (!tenantId) {
      return NextResponse.json({ message: "No tenant available for routing" }, { status: 400 });
    }

    const foia = await prisma.foiaRequest.create({
      data: {
        referenceNumber,
        tenantId,
        requesterName: parsed.data.requesterName,
        requesterEmail: parsed.data.requesterEmail,
        requesterOrg: parsed.data.requesterOrg,
        description: parsed.data.description,
        status: "SUBMITTED",
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 day deadline
      },
    });

    return NextResponse.json(
      { referenceNumber: foia.referenceNumber, message: "Request submitted successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create FOIA error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  // CSRF check for mutating request
  const csrfResult = validateCsrf(request);
  if (csrfResult) return csrfResult;

  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, status, responseNotes } = body;

    if (!id) {
      return NextResponse.json({ message: "FOIA request ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (responseNotes) updateData.responseNotes = responseNotes;
    if (status === "COMPLETED" || status === "DENIED") updateData.respondedAt = new Date();

    const foia = await prisma.foiaRequest.update({
      where: { id },
      data: updateData,
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: `FOIA_${status ?? "UPDATED"}`,
      resource: "foiaRequest",
      resourceId: id,
    });

    return NextResponse.json(foia);
  } catch (error) {
    console.error("Update FOIA error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}