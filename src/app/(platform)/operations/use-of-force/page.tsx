import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { UseOfForceClient } from "@/components/operations/use-of-force-client";

export default async function UseOfForcePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [submitted, underReview, reviewed, last30] = await Promise.all([
    prisma.useOfForce.count({ where: { tenantId: tid, status: "SUBMITTED" } }),
    prisma.useOfForce.count({ where: { tenantId: tid, status: "UNDER_REVIEW" } }),
    prisma.useOfForce.count({ where: { tenantId: tid, status: "REVIEWED" } }),
    prisma.useOfForce.count({ where: { tenantId: tid, createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Use of Force</h1>
        <p className="text-muted-foreground">Submit and review use of force incident reports.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{submitted}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{underReview}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{reviewed}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{last30}</div></CardContent>
        </Card>
      </div>

      <UseOfForceClient userRole={session.user.role} />
    </div>
  );
}
