import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Users, Truck, AlertCircle } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const tenantId = session.user.tenantId;

  const [openCases, staffCount, activeIncidents] = await Promise.all([
    prisma.case.count({ where: { tenantId, status: { in: ["OPEN", "ACTIVE"] } } }),
    prisma.user.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.incident.count({ where: { tenantId, status: "ACTIVE" } }),
  ]);

  const stats = [
    { title: "Open Cases", value: openCases, icon: FolderOpen, color: "text-blue-500" },
    { title: "Active Staff", value: staffCount, icon: Users, color: "text-green-500" },
    { title: "Live Incidents", value: activeIncidents, icon: AlertCircle, color: "text-red-500" },
    { title: "Fleet Vehicles", value: "—", icon: Truck, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session.user.name}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
