import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ai } from "@/lib/ai";
import { logger } from "@/lib/logger";

const EIGHT_HOURS = 8 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const tid = session.user.tenantId;
    const since = new Date(Date.now() - EIGHT_HOURS);

    const [openIncidents, activeAlerts, updatedCases, onDutyCount] = await Promise.all([
      prisma.incident.findMany({
        where: { tenantId: tid, status: { notIn: ["RESOLVED", "CANCELLED"] }, reportedAt: { gte: since } },
        select: { id: true, type: true, status: true, description: true, location: true, reportedAt: true },
        orderBy: { reportedAt: "desc" },
        take: 20,
      }),
      prisma.alert.findMany({
        where: { tenantId: tid, status: "ACTIVE" },
        select: { id: true, type: true, title: true, description: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.case.count({
        where: { tenantId: tid, updatedAt: { gte: since }, status: { not: "CLOSED" } },
      }),
      prisma.officerLocation.count({
        where: { tenantId: tid, status: { in: ["ON_DUTY", "EN_ROUTE", "ON_SCENE"] }, updatedAt: { gte: since } },
      }),
    ]);

    const brief = {
      generatedAt: new Date().toISOString(),
      period: "Last 8 hours",
      openIncidents,
      activeAlerts,
      updatedCaseCount: updatedCases,
      officersOnDuty: onDutyCount,
      aiSummary: null as string | null,
    };

    if (ai.isConfigured() && (openIncidents.length > 0 || activeAlerts.length > 0)) {
      try {
        const incidentList = openIncidents
          .slice(0, 5)
          .map((i) => `- ${i.type} at ${i.location ?? "unknown location"}: ${i.description ?? "no details"}`)
          .join("\n");

        const alertList = activeAlerts
          .slice(0, 3)
          .map((a) => `- ${a.type}: ${a.title}`)
          .join("\n");

        const prompt = `Write a 3-4 sentence shift handover brief for an incoming police shift supervisor.

Open incidents in last 8 hours:
${incidentList || "None"}

Active alerts:
${alertList || "None"}

Updated cases: ${updatedCases}
Officers on duty: ${onDutyCount}

Be concise, factual, and professional.`;

        brief.aiSummary = await ai.complete(prompt);
      } catch (err) {
        logger.warn("AI shift brief failed, returning raw data", { error: err });
      }
    }

    return NextResponse.json(brief);
  } catch (error) {
    logger.error("Shift handover brief error", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
