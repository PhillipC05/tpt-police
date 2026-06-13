import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, FlaskConical, Package, Clock } from "lucide-react";
import { EvidenceRoomClient } from "@/components/evidence/evidence-room-client";

export default async function EvidenceRoomPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [totalEvidence, pendingLab, recentEvidence, overdueLabCount] = await Promise.all([
    prisma.evidence.count({ where: { case: { tenantId: tid } } }),
    prisma.labSubmission.count({ where: { tenantId: tid, status: { in: ["SUBMITTED", "IN_ANALYSIS"] } } }),
    prisma.evidence.findMany({
      where: { case: { tenantId: tid } },
      include: {
        case: { select: { id: true, title: true, caseNumber: true } },
        custodyChain: { orderBy: { createdAt: "desc" }, take: 1, include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.labSubmission.count({
      where: {
        tenantId: tid,
        status: { in: ["SUBMITTED", "IN_ANALYSIS"] },
        createdAt: { lte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const labSubmissions = await prisma.labSubmission.findMany({
    where: { tenantId: tid },
    include: { evidence: { select: { id: true, description: true, tagNumber: true, type: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Evidence Room</h1>
        <p className="text-muted-foreground">Evidence inventory, chain of custody, and lab submissions.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Archive className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalEvidence}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Lab</CardTitle>
            <FlaskConical className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingLab}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Lab</CardTitle>
            <Clock className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{overdueLabCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lab Submissions</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{labSubmissions.length}</div></CardContent>
        </Card>
      </div>

      <EvidenceRoomClient
        initialEvidence={JSON.parse(JSON.stringify(recentEvidence))}
        initialLabSubmissions={JSON.parse(JSON.stringify(labSubmissions))}
        userRole={session.user.role}
      />
    </div>
  );
}
