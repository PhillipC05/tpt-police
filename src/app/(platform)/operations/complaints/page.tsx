import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Search, CheckCircle2, XCircle } from "lucide-react";
import { ComplaintsClient } from "@/components/operations/complaints-client";

export default async function ComplaintsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (!["SUPER_ADMIN", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN"].includes(session.user.role)) {
    redirect("/operations");
  }

  const tid = session.user.tenantId;

  const [received, investigating, resolved, sustained] = await Promise.all([
    prisma.civilianComplaint.count({ where: { tenantId: tid, status: "RECEIVED" } }),
    prisma.civilianComplaint.count({ where: { tenantId: tid, status: "INVESTIGATING" } }),
    prisma.civilianComplaint.count({ where: { tenantId: tid, status: "RESOLVED" } }),
    prisma.civilianComplaint.count({ where: { tenantId: tid, outcome: "SUSTAINED" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Civilian Complaints</h1>
        <p className="text-muted-foreground">Internal Affairs review queue and complaint management.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <Scale className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{received}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Investigating</CardTitle>
            <Search className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{investigating}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{resolved}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sustained</CardTitle>
            <XCircle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{sustained}</div></CardContent>
        </Card>
      </div>

      <ComplaintsClient />
    </div>
  );
}