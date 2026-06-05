import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drone, BatteryFull, AlertTriangle, CheckCircle } from "lucide-react";
import { DronesClient } from "@/components/erp/drones-client";

export default async function DronesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [available, deployed, charging, maintenance] = await Promise.all([
    prisma.drone.count({ where: { tenantId: tid, status: "AVAILABLE" } }),
    prisma.drone.count({ where: { tenantId: tid, status: "DEPLOYED" } }),
    prisma.drone.count({ where: { tenantId: tid, status: "CHARGING" } }),
    prisma.drone.count({ where: { tenantId: tid, status: "MAINTENANCE" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Drone Fleet</h1>
        <p className="text-muted-foreground">Manage drone inventory, deployments, and flight certifications.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{available}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deployed</CardTitle>
            <Drone className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{deployed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Charging</CardTitle>
            <BatteryFull className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{charging}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{maintenance}</div></CardContent>
        </Card>
      </div>

      <DronesClient />
    </div>
  );
}