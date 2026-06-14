import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sess = await prisma.faceScanSession.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!sess) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const updated = await prisma.faceScanSession.update({
    where: { id },
    data: { endedAt: new Date() },
  });

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "END_FACE_SCAN_SESSION",
    resource: "faceScanSession",
    resourceId: id,
    metadata: { matchCount: sess.matchCount, frameCount: sess.frameCount },
  });

  return NextResponse.json(updated);
}
