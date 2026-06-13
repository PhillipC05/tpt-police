import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle, AlertTriangle, Video } from "lucide-react";
import { BWCClient } from "@/components/bwc/bwc-client";

export default async function BWCPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [cameras, events] = await Promise.all([
    prisma.bodyCamera.findMany({
      where: { assignedTo: { tenantId: tid } },
      include: { assignedTo: { select: { id: true, name: true, badgeNumber: true } } },
      orderBy: { serialNumber: "asc" },
    }),
    prisma.bWCEvent.findMany({
      where: { officer: { tenantId: tid } },
      include: {
        camera: { select: { serialNumber: true, model: true } },
        officer: { select: { id: true, name: true, badgeNumber: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
  ]);

  const active = cameras.filter((c) => c.status === "ASSIGNED").length;
  const needsMaintenance = cameras.filter((c) => c.status === "FAULTY").length;
  const complianceRate = cameras.length > 0 ? Math.round((active / cameras.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Body Worn Cameras</h1>
        <p className="text-muted-foreground">Camera inventory, footage events, and compliance monitoring.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cameras</CardTitle>
            <Camera className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{cameras.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{active}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Need Maintenance</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{needsMaintenance}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Video className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceRate}%</div>
          </CardContent>
        </Card>
      </div>

      <BWCClient
        initialCameras={JSON.parse(JSON.stringify(cameras))}
        initialEvents={JSON.parse(JSON.stringify(events))}
        userRole={session.user.role}
      />
    </div>
  );
}
