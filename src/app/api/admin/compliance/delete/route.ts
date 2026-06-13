import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function DELETE() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const userId = session.user.id;

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Admins cannot delete themselves (must be done by SUPER_ADMIN)
    if (["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { message: "Administrator accounts cannot be self-deleted. Contact a higher-level admin." },
        { status: 403 }
      );
    }

    // Log the deletion request before removing data
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "DATA_DELETION_REQUESTED",
      resource: "user",
      resourceId: userId,
      metadata: { gdprRequest: true },
    });

    // Anonymise tips submitted by this user (keep the tip, remove personal association)
    await prisma.crimeTip.updateMany({
      where: { submittedById: userId },
      data: { submittedById: null, isAnonymous: true },
    });

    // Delete personal data in dependent tables (order matters for FK constraints)
    await prisma.caseNote.deleteMany({ where: { authorId: userId } });
    await prisma.leaveRequest.deleteMany({ where: { userId } });
    await prisma.performanceReview.deleteMany({ where: { userId } });
    await prisma.disciplinaryIncident.deleteMany({ where: { userId } });
    await prisma.trainingCertification.deleteMany({ where: { userId } });
    await prisma.payrollEntry.deleteMany({ where: { userId } });
    await prisma.expenseClaim.deleteMany({ where: { userId } });
    await prisma.shiftSwap.deleteMany({ where: { requestingUserId: userId } });
    await prisma.shiftSwap.deleteMany({ where: { targetUserId: userId } });
    await prisma.shiftAssignment.deleteMany({ where: { userId } });
    await prisma.vehicleAssignment.deleteMany({ where: { userId } });
    await prisma.assetIssuance.deleteMany({ where: { userId } });
    await prisma.evidenceCustody.deleteMany({ where: { userId } });
    await prisma.caseAssignment.deleteMany({ where: { userId } });

    // Delete auth sessions and accounts
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });

    // Anonymise audit logs (keep the record for compliance, remove personal reference)
    await prisma.auditLog.updateMany({
      where: { userId },
      data: { userId: null },
    });

    // Finally, delete the user record
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({
      message: "Your account and associated personal data have been deleted.",
      deletedAccount: user.email,
    });
  } catch (error) {
    logger.error("Data deletion error:", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}