import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { z } from "zod";

/**
 * Submission types the public portal supports.
 */
const SUBMISSION_TYPES = [
  "TIP",
  "COMPLAINT",
  "COMMENDATION",
  "MISSING_PERSON",
  "FOIA",
  "EVIDENCE",
] as const;

const submissionSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID is required"),
  type: z.enum(SUBMISSION_TYPES),
  description: z.string().min(1, "Description is required").max(10000),
  location: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isAnonymous: z.boolean().default(true),
  // Optional contact info (only used if not anonymous or if user wants follow-up)
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  // For the linked record approach — if citizen already has a case/complaint reference
  linkedRecordType: z.string().optional(),
  linkedRecordId: z.string().optional(),
});

function generateReferenceNumber(): string {
  const prefix = "TTP";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

/**
 * POST /api/public/submissions
 * Submit a tip, complaint, commendation, etc. to the public portal.
 * Supports both anonymous and authenticated (verified) submissions.
 */
export async function POST(request: Request) {
  // Rate limit: max 5 submissions per IP per 10 minutes
  const rlIdentifier = getRateLimitIdentifier(undefined, request);
  const rlResult = checkRateLimit(rlIdentifier, {
    max: 5,
    windowMs: 10 * 60 * 1000,
    prefix: "rl:public:submissions",
  });
  if (rlResult) return rlResult;

  // CSRF for mutating requests
  const csrfResult = validateCsrf(request);
  if (csrfResult) return csrfResult;

  try {
    const body = await request.json();
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if the tenant's portal config allows this type of submission
    const portalConfig = await prisma.publicPortalConfig.findUnique({
      where: { tenantId: parsed.data.tenantId },
    });

    if (portalConfig) {
      const featureKey = getFeatureKey(parsed.data.type);
      if (featureKey && !portalConfig[featureKey as keyof typeof portalConfig]) {
        return NextResponse.json(
          { message: `This portal feature (${parsed.data.type}) is currently disabled.` },
          { status: 403 }
        );
      }
    }

    // Try to get session — citizen may be logged in (verified user)
    const session = await auth();
    let citizenId: string | undefined;

    if (session?.user?.id && session.user.role === "PUBLIC") {
      // Look up the citizen's PublicProfile
      const profile = await prisma.publicProfile.findUnique({
        where: { userId: session.user.id },
      });
      if (profile) {
        citizenId = profile.id;
      }
    }

    const referenceNumber = generateReferenceNumber();

    // Create the public submission record
    const submission = await prisma.publicSubmission.create({
      data: {
        referenceNumber,
        tenantId: parsed.data.tenantId,
        citizenId: citizenId ?? null,
        type: parsed.data.type,
        status: "SUBMITTED",
        description: parsed.data.description,
        location: parsed.data.location,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        isAnonymous: parsed.data.isAnonymous,
        linkedRecordType: parsed.data.linkedRecordType ?? null,
        linkedRecordId: parsed.data.linkedRecordId ?? null,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "SUBMITTED",
            note: "Submission received",
          },
        },
      },
      include: {
        statusHistory: true,
      },
    });

    // If the submission is a TIP, also create a CrimeTip record for internal workflows
    if (parsed.data.type === "TIP") {
      await prisma.crimeTip.create({
        data: {
          tenantId: parsed.data.tenantId,
          type: "PUBLIC_PORTAL",
          description: parsed.data.description,
          location: parsed.data.location,
          latitude: parsed.data.latitude,
          longitude: parsed.data.longitude,
          contactEmail: parsed.data.contactEmail,
          contactPhone: parsed.data.contactPhone,
          isAnonymous: parsed.data.isAnonymous,
        },
      });
    }

    // If it's a COMPLAINT, create a CivilianComplaint record
    if (parsed.data.type === "COMPLAINT") {
      await prisma.civilianComplaint.create({
        data: {
          tenantId: parsed.data.tenantId,
          referenceNumber: `CC-${referenceNumber}`,
          complainantName: parsed.data.isAnonymous ? "Anonymous" : parsed.data.contactEmail ?? "Anonymous",
          complainantEmail: parsed.data.contactEmail,
          complainantPhone: parsed.data.contactPhone,
          incidentDate: new Date(),
          complaintType: "PUBLIC_PORTAL",
          description: parsed.data.description,
          status: "RECEIVED",
        },
      });
    }

    // If it's a COMMENDATION, create an OfficerCommendation record
    if (parsed.data.type === "COMMENDATION") {
      await prisma.officerCommendation.create({
        data: {
          tenantId: parsed.data.tenantId,
          officerId: parsed.data.linkedRecordId ?? "",
          citizenName: parsed.data.isAnonymous ? "Anonymous" : parsed.data.contactEmail ?? "Anonymous",
          citizenEmail: parsed.data.contactEmail,
          description: parsed.data.description,
        },
      });
    }

    return NextResponse.json(
      {
        message: "Submission received",
        referenceNumber: submission.referenceNumber,
        status: submission.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public submission error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/public/submissions?reference=xxx
 * Look up a submission by its reference number.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (reference) {
    // Anonymous lookup by reference number
    const submission = await prisma.publicSubmission.findUnique({
      where: { referenceNumber: reference },
      select: {
        referenceNumber: true,
        type: true,
        status: true,
        description: true,
        location: true,
        isAnonymous: true,
        publicResponse: true,
        createdAt: true,
        updatedAt: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: {
            toStatus: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ message: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json(submission);
  }

  // Otherwise, list submissions for the authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.publicProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ message: "Public profile not found" }, { status: 404 });
  }

  const submissions = await prisma.publicSubmission.findMany({
    where: { citizenId: profile.id },
    orderBy: { createdAt: "desc" },
    select: {
      referenceNumber: true,
      type: true,
      status: true,
      description: true,
      isAnonymous: true,
      publicResponse: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(submissions);
}

function getFeatureKey(type: string): string | null {
  const map: Record<string, string> = {
    TIP: "tipsEnabled",
    COMPLAINT: "complaintsEnabled",
    COMMENDATION: "commendationsEnabled",
    MISSING_PERSON: "missingPersonReports",
    FOIA: "tipsEnabled", // falls under general tips for now
    EVIDENCE: "evidenceUploads",
  };
  return map[type] ?? null;
}