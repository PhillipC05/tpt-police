import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertOctagon, Radio, Baby, User } from "lucide-react";
import { AlertsClient } from "@/components/operations/alerts-client";

export default async function AlertsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;
  const [bolos, apbs, ambers, silvers] = await Promise.all([
    prisma.alert.count({ where: { tenantId: tid, status: "ACTIVE", type: "BOLO" } }),
    prisma.alert.count({ where: { tenantId: tid, status: "ACTIVE", type: "APB" } }),
    prisma.alert.count({ where: { tenantId: tid, status: "ACTIVE", type: "AMBER_ALERT" } }),
    prisma.alert.count({ where: { tenantId: tid, status: "ACTIVE", type: "SILVER_ALERT" } }),
  ]);

  const stats = [
    { label: "BOLOs", value: bolos, icon: AlertOctagon, color: "text-orange-500" },
    { label: "APBs", value: apbs, icon: Radio, color: "text-red-500" },
    { label: "Amber Alerts", value: ambers, icon: Baby, color: "text-yellow-500" },
    { label: "Silver Alerts", value: silvers, icon: User, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alerts &amp; BOLOs</h1>
        <p className="text-muted-foreground">Active lookouts, bulletins, and missing person alerts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
            </Card>
          );
        })}
      </div>

      <AlertsClient />
    </div>
  );
}
