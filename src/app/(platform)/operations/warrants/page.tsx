import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileWarning, CheckCircle, RotateCcw, Clock } from "lucide-react";
import { WarrantsClient } from "@/components/operations/warrants-client";

export default async function WarrantsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;
  const [issued, served, returned] = await Promise.all([
    prisma.warrant.count({ where: { tenantId: tid, status: "ISSUED" } }),
    prisma.warrant.count({ where: { tenantId: tid, status: "SERVED" } }),
    prisma.warrant.count({ where: { tenantId: tid, status: { in: ["RETURNED", "EXPIRED"] } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Warrants</h1>
        <p className="text-muted-foreground">Arrest, search, and protection order warrants.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileWarning className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{issued}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Served</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{served}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Returned / Expired</CardTitle>
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{returned}</div></CardContent>
        </Card>
      </div>

      <WarrantsClient />
    </div>
  );
}
