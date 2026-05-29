import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        badgeNumber: true,
        rank: true,
        department: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, name: true, type: true } },
        accounts: {
          select: { provider: true, providerAccountId: true },
        },
        auditLogs: {
          select: { action: true, resource: true, resourceId: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1000,
        },
        assignedCases: {
          select: {
            case: { select: { caseNumber: true, title: true, type: true, status: true, createdAt: true } },
            isLead: true,
            assignedAt: true,
          },
        },
        leaveRequests: { select: { type: true, status: true, startDate: true, endDate: true, createdAt: true } },
        issuedAssets: {
          select: {
            asset: { select: { name: true, category: true, serialNumber: true } },
            issuedAt: true,
            returnedAt: true,
          },
        },
        assignedVehicles: {
          select: {
            vehicle: { select: { make: true, model: true, plate: true } },
            assignedAt: true,
            returnedAt: true,
          },
        },
        shifts: {
          select: {
            shift: { select: { name: true, type: true, startTime: true, endTime: true } },
            isOvertime: true,
            createdAt: true,
          },
        },
        performanceReviews: {
          select: { rating: true, period: true, notes: true, createdAt: true },
        },
        disciplinaryIncidents: {
          select: { incident: true, date: true, severity: true, description: true, status: true },
        },
        trainingCertifications: {
          select: { name: true, issuingBody: true, issuedAt: true, expiresAt: true, status: true },
        },
        payrollEntries: {
          select: {
            payrollPeriod: { select: { name: true, startDate: true, endDate: true } },
            baseHours: true,
            overtimeHours: true,
            grossPay: true,
            netPay: true,
          },
        },
        expenseClaims: {
          select: { title: true, amount: true, category: true, status: true, createdAt: true },
        },
        tipsSubmitted: {
          select: { type: true, description: true, isAnonymous: true, createdAt: true },
        },
        notes: {
          select: { case: { select: { caseNumber: true } }, content: true, createdAt: true },
          take: 500,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "DATA_EXPORT_REQUESTED",
      resource: "user",
      resourceId: userId,
    });

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      user,
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}