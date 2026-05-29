import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CaseDetailClient } from "@/components/cases/case-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const caseRecord = await prisma.case.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      assignments: {
        include: { user: { select: { id: true, name: true, badgeNumber: true, role: true } } },
      },
      _count: { select: { evidence: true, persons: true, notes: true } },
    },
  });

  if (!caseRecord) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{caseRecord.caseNumber}</h1>
          <Badge variant={caseRecord.status === "OPEN" ? "outline" : caseRecord.status === "ACTIVE" ? "default" : caseRecord.status === "PROSECUTION" ? "destructive" : "secondary"}>
            {caseRecord.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">{caseRecord.title}</p>
      </div>

      <CaseDetailClient caseId={id} />
    </div>
  );
}