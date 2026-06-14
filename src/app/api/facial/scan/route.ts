import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { identifyFace, isFacialConfigured } from "@/lib/facial";
import { sendPushToTenant, sendPushToUser } from "@/lib/push";
import { CameraSourceType } from "@prisma/client";

const THREAT_RANK: Record<string, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

const scanSchema = z.object({
  imageBase64: z.string().min(1),
  sourceType: z.nativeEnum(CameraSourceType),
  sessionId: z.string().optional(),
  bwcCameraId: z.string().optional(),
  droneDeploymentId: z.string().optional(),
  surveillanceCamId: z.string().optional(),
  officerId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const tid = session.user.tenantId;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  const { imageBase64, sourceType, sessionId, bwcCameraId, droneDeploymentId, surveillanceCamId, officerId } = parsed.data;

  // Check tenant scan config
  const config = await prisma.scanConfig.findUnique({ where: { tenantId: tid } });
  if (!config?.masterEnabled) {
    return NextResponse.json({ message: "Face scanning is not enabled for this tenant", matches: [] }, { status: 200 });
  }

  // Always audit — even no-match scans
  await writeAuditLog({
    userId: session.user.id,
    tenantId: tid,
    action: "FACIAL_SCAN_SUBMITTED",
    resource: "facial_recognition",
    metadata: { sourceType, sessionId, configured: isFacialConfigured() },
  });

  let sessionRecord = sessionId
    ? await prisma.faceScanSession.findFirst({ where: { id: sessionId, tenantId: tid } })
    : null;

  if (!sessionRecord) {
    sessionRecord = await prisma.faceScanSession.create({
      data: {
        sourceType,
        bwcCameraId: bwcCameraId ?? null,
        droneDeploymentId: droneDeploymentId ?? null,
        surveillanceCamId: surveillanceCamId ?? null,
        officerId: officerId ?? session.user.id,
        tenantId: tid,
        configSnapshot: JSON.parse(JSON.stringify(config)),
      },
    });
  } else {
    await prisma.faceScanSession.update({
      where: { id: sessionRecord.id },
      data: { frameCount: { increment: 1 } },
    });
  }

  // Identify face
  let identifyResult;
  try {
    identifyResult = await identifyFace(imageBase64);
  } catch (err) {
    logger.error("Facial recognition API error", { error: String(err), tenantId: tid });
    return NextResponse.json({ message: "Identification service error", matches: [] }, { status: 200 });
  }

  const aboveThreshold = identifyResult.matches.filter(
    (m) => m.confidence >= config.minConfidence && m.personId,
  );

  if (aboveThreshold.length === 0) {
    return NextResponse.json({ matches: [], source: identifyResult.source });
  }

  const results = [];

  for (const candidate of aboveThreshold) {
    const person = await prisma.person.findUnique({
      where: { id: candidate.personId! },
      include: {
        gangMemberships: { where: { gang: { tenantId: tid } }, take: 1 },
      },
    });
    if (!person) continue;

    const matchReasons: string[] = [];

    if (config.scanMissingPersons) {
      const missingCase = await prisma.case.findFirst({
        where: {
          type: "MISSING_PERSON",
          status: { in: ["OPEN", "ACTIVE"] },
          persons: { some: { personId: person.id } },
        },
      });
      if (missingCase) matchReasons.push("MISSING_PERSON");
    }

    if (config.scanActiveWarrants) {
      const warrant = await prisma.warrant.findFirst({
        where: { personId: person.id, status: "ISSUED", type: "ARREST" },
      });
      if (warrant) matchReasons.push("ARREST_WARRANT");
    }

    if (config.scanGangMembers && person.gangMemberships.length > 0) {
      matchReasons.push("GANG_MEMBER");
    }

    const minThreatRank = THREAT_RANK[config.minThreatLevelScan] ?? 0;
    const personThreatRank = THREAT_RANK[person.threatLevel] ?? 0;
    if (minThreatRank > 0 && personThreatRank >= minThreatRank) {
      matchReasons.push(`${person.threatLevel}_THREAT`);
    }

    if (matchReasons.length === 0) continue;

    const alertedUserId = officerId ?? session.user.id;

    const match = await prisma.facialMatch.create({
      data: {
        personId: person.id,
        sessionId: sessionRecord.id,
        confidence: candidate.confidence,
        matchReasons,
        alertedUserId,
        alertedAt: new Date(),
        tenantId: tid,
      },
    });

    await prisma.faceScanSession.update({
      where: { id: sessionRecord.id },
      data: { matchCount: { increment: 1 } },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: tid,
      action: "FACIAL_MATCH_FOUND",
      resource: "facial_recognition",
      resourceId: match.id,
      metadata: {
        personId: person.id,
        confidence: candidate.confidence,
        matchReasons,
      },
    });

    // Fire notifications
    const isCritical = matchReasons.includes("MISSING_PERSON") || matchReasons.includes("ARREST_WARRANT");
    const pushPayload = {
      title: isCritical ? "⚠ Identity Match — Immediate Action" : "Identity Match Detected",
      body: `${person.firstName} ${person.lastName} — ${matchReasons.join(", ")} (${Math.round(candidate.confidence)}% confidence)`,
      url: `/persons/${person.id}`,
      tag: `facial-match-${match.id}`,
    };

    if (isCritical) {
      await sendPushToTenant(tid, pushPayload);
    } else {
      await sendPushToUser(alertedUserId, pushPayload);
    }

    results.push({
      matchId: match.id,
      personId: person.id,
      personName: `${person.firstName} ${person.lastName}`,
      confidence: candidate.confidence,
      matchReasons,
      requiresApproval: config.requiresApproval,
    });
  }

  return NextResponse.json({ matches: results, source: identifyResult.source });
}
