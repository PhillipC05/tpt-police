import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { CaseListClient } from "@/components/cases/case-list-client";

export default async function CasesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [openCases, totalCases] = await Promise.all([
    prisma.case.count({ where: { tenantId: session.user.tenantId, status: { in: ["OPEN", "ACTIVE"] } } }),
    prisma.case.count({ where: { tenantId: session.user.tenantId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Case Management</h1>
        <p className="text-muted-foreground">Manage investigations, evidence, and case files.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Cases</CardTitle>
            <FolderOpen className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <FolderOpen className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCases > 0
                ? `${Math.round(((totalCases - openCases) / totalCases) * 100)}%`
                : "\u2014"}
            </div>
          </CardContent>
        </Card>
      </div>

      <CaseListClient />
    </div>
  );
}
