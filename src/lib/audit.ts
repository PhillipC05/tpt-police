import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

interface AuditParams {
  userId?: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(params: AuditParams) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? undefined;
  const userAgent = headersList.get("user-agent") ?? undefined;

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: (params.metadata ?? undefined) as any,
      ipAddress: ip,
      userAgent,
    },
  });
}