import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function POST() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const policy = await prisma.dataRetentionPolicy.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    if (!policy) {
      return NextResponse.json({ message: "No retention policy configured" }, { status: 400 });
    }

    const now = new Date();
    let totalDeleted = 0;

    // ── Purge expired audit logs ─────────────────────────────────────
    if (policy.auditLogRetentionDays > 0) {
      const cutoff = new Date(now.getTime() - policy.auditLogRetentionDays * 86400000);
      const deleted = await prisma.auditLog.deleteMany({
        where: {
          tenantId: session.user.tenantId,
          createdAt: { lt: cutoff },
        },
      });
      totalDeleted += deleted.count;
    }

    // ── Purge closed cases past retention ────────────────────────────
    if (policy.caseRetentionDays > 0) {
      const cutoff = new Date(now.getTime() - policy.caseRetentionDays * 86400000);
      const expiredCases = await prisma.case.findMany({
        where: {
          tenantId: session.user.tenantId,
          status: "CLOSED",
          closedAt: { lt: cutoff },
        },
        select: { id: true },
      });

      if (expiredCases.length > 0) {
        const caseIds = expiredCases.map((c) => c.id);

        // Delete child records first
        await prisma.evidenceCustody.deleteMany({ where: { evidence: { caseId: { in: caseIds } } } });
        await prisma.evidence.deleteMany({ where: { caseId: { in: caseIds } } });
        await prisma.caseNote.deleteMany({ where: { caseId: { in: caseIds } } });
        await prisma.casePersonLink.deleteMany({ where: { caseId: { in: caseIds } } });
        await prisma.caseShare.deleteMany({ where: { caseId: { in: caseIds } } });
        await prisma.courtHandoff.deleteMany({ where: { caseId: { in: caseIds } } });
        await prisma.caseAssignment.deleteMany({ where: { caseId: { in: caseIds } } });

        const { count } = await prisma.case.deleteMany({ where: { id: { in: caseIds } } });
        totalDeleted += count;
      }
    }

    // ── Purge expired person records ─────────────────────────────────
    if (policy.personRecordRetention > 0) {
      const cutoff = new Date(now.getTime() - policy.personRecordRetention * 86400000);
      const expiredPersons = await prisma.person.findMany({
        where: {
          createdAt: { lt: cutoff },
          caseLinks: { none: { case: { tenantId: session.user.tenantId } } },
        },
        select: { id: true },
      });

      if (expiredPersons.length > 0) {
        const personIds = expiredPersons.map((p) => p.id);

        await prisma.statement.deleteMany({ where: { personId: { in: personIds } } });
        await prisma.casePersonLink.deleteMany({ where: { personId: { in: personIds } } });

        const { count } = await prisma.person.deleteMany({ where: { id: { in: personIds } } });
        totalDeleted += count;
      }
    }

    // ── Purge expired FOIA requests ──────────────────────────────────
    if (policy.foiaRetentionDays > 0) {
      const cutoff = new Date(now.getTime() - policy.foiaRetentionDays * 86400000);
      const { count } = await prisma.foiaRequest.deleteMany({
        where: {
          tenantId: session.user.tenantId,
          createdAt: { lt: cutoff },
          status: { in: ["COMPLETED", "DENIED"] },
        },
      });
      totalDeleted += count;
    }

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "DATA_PURGE_EXECUTED",
      resource: "dataRetentionPolicy",
      resourceId: policy.id,
      metadata: { deletedRecords: totalDeleted },
    });

    return NextResponse.json({
      message: "Purge completed",
      deleted: totalDeleted,
    });
  } catch (error) {
    logger.error("Purge error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}