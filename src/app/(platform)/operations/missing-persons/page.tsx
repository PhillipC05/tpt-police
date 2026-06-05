import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserX, Clock, MapPin } from "lucide-react";
import { MissingPersonsClient } from "@/components/operations/missing-persons-client";

export default async function MissingPersonsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [active, found, recent] = await Promise.all([
    prisma.case.count({ where: { tenantId: tid, type: "MISSING_PERSON", status: "ACTIVE" } }),
    prisma.case.count({ where: { tenantId: tid, type: "MISSING_PERSON", status: "CLOSED" } }),
    prisma.case.count({
      where: { tenantId: tid, type: "MISSING_PERSON", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Missing Persons</h1>
        <p className="text-muted-foreground">Track missing persons cases, multi-precinct coordination, and alerts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Missing</CardTitle>
            <UserX className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{active}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Found / Closed</CardTitle>
            <Search className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{found}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent (30 days)</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{recent}</div></CardContent>
        </Card>
      </div>

      <MissingPersonsClient />
    </div>
  );
}