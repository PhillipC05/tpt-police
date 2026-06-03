import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileWarning, AlertOctagon, UserX } from "lucide-react";
import Link from "next/link";
import { LiveDashboardClient } from "@/components/dispatch/live-dashboard-client";

export default async function DispatchPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [outstandingWarrants, activeAlerts, inCustody] = await Promise.all([
    prisma.warrant.count({ where: { tenantId: tid, status: "ISSUED" } }),
    prisma.alert.count({ where: { tenantId: tid, status: "ACTIVE" } }),
    prisma.booking.count({ where: { tenantId: tid, status: "BOOKED" } }),
  ]);

  const quickStats = [
    { label: "Outstanding Warrants", value: outstandingWarrants, icon: FileWarning, color: "text-orange-500", href: "/operations/warrants" },
    { label: "Active Alerts / BOLOs", value: activeAlerts, icon: AlertOctagon, color: "text-red-500", href: "/operations/alerts" },
    { label: "In Custody", value: inCustody, icon: UserX, color: "text-blue-500", href: "/operations/bookings" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dispatch Operations</h1>
        <p className="text-muted-foreground">Real-time incident monitoring, officer status, and dispatch integration.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickStats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{s.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <LiveDashboardClient />
    </div>
  );
}