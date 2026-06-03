import { prisma } from "@/lib/prisma";
import { AlertOctagon, X } from "lucide-react";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  BOLO: "BOLO",
  APB: "APB",
  AMBER_ALERT: "AMBER ALERT",
  SILVER_ALERT: "SILVER ALERT",
};

const TYPE_COLORS: Record<string, string> = {
  BOLO: "bg-orange-500",
  APB: "bg-red-600",
  AMBER_ALERT: "bg-amber-500",
  SILVER_ALERT: "bg-blue-600",
};

interface AlertBannerProps {
  tenantId: string;
}

export async function AlertBanner({ tenantId }: AlertBannerProps) {
  // Auto-expire before querying
  await prisma.alert.updateMany({
    where: { tenantId, status: "ACTIVE", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });

  const activeAlerts = await prisma.alert.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ tenantId }, { scopeTenantId: null }],
    },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    take: 3,
  });

  if (activeAlerts.length === 0) return null;

  return (
    <div className="border-b">
      {activeAlerts.map((alert) => (
        <Link
          key={alert.id}
          href="/operations/alerts"
          className={`flex items-center gap-3 px-4 py-1.5 text-white text-xs font-medium ${TYPE_COLORS[alert.type] ?? "bg-red-600"} hover:brightness-95 transition-all`}
        >
          <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
          <span className="font-bold">{TYPE_LABELS[alert.type] ?? alert.type}</span>
          <span className="truncate">{alert.title}</span>
          {alert.expiresAt && (
            <span className="ml-auto shrink-0 opacity-80">
              Expires {new Date(alert.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </Link>
      ))}
      {activeAlerts.length === 0 && null}
    </div>
  );
}
