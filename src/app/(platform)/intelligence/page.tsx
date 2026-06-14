import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, Users, AlertTriangle, Shield } from "lucide-react";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
  NONE: "outline",
};

export default async function IntelligenceHubPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!DETECTIVE_ROLES.includes(session.user.role)) redirect("/dashboard");

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_INTELLIGENCE_HUB",
    resource: "intelligence",
  });

  const tid = session.user.tenantId;

  const [threatCounts, activeGangs, highThreatPersons, recentAssociations] = await Promise.all([
    prisma.person.groupBy({
      by: ["threatLevel"],
      where: { threatLevel: { not: "NONE" } },
      _count: true,
    }),
    prisma.gang.count({ where: { tenantId: tid, status: "ACTIVE" } }),
    prisma.person.findMany({
      where: { threatLevel: { in: ["HIGH", "CRITICAL"] } },
      include: {
        gangMemberships: {
          include: { gang: { select: { id: true, name: true } } },
          take: 2,
        },
        _count: { select: { warrants: true } },
      },
      orderBy: [{ threatLevel: "desc" }, { updatedAt: "desc" }],
      take: 10,
    }),
    prisma.personAssociation.findMany({
      where: { tenantId: tid },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true } },
        personB: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const criticalCount = threatCounts.find((t) => t.threatLevel === "CRITICAL")?._count ?? 0;
  const highCount = threatCounts.find((t) => t.threatLevel === "HIGH")?._count ?? 0;
  const mediumCount = threatCounts.find((t) => t.threatLevel === "MEDIUM")?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intelligence Hub</h1>
          <p className="text-sm text-muted-foreground">Gang registry, criminal networks, and persons of interest</p>
        </div>
        <div className="flex gap-2">
          <Link href="/intelligence/gangs">
            <Button variant="outline">View Gangs</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive shrink-0" />
            <div>
              <p className="text-2xl font-bold">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critical Threat</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{highCount}</p>
              <p className="text-xs text-muted-foreground">High Threat</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="w-8 h-8 text-yellow-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{mediumCount}</p>
              <p className="text-xs text-muted-foreground">Medium Threat</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{activeGangs}</p>
              <p className="text-xs text-muted-foreground">Active Gangs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              High-Priority Persons of Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            {highThreatPersons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No high or critical threat persons on record</p>
            ) : (
              <div className="space-y-2">
                {highThreatPersons.map((person) => (
                  <Link
                    key={person.id}
                    href={`/persons/${person.id}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {person.firstName} {person.lastName}
                      </p>
                      {person.gangMemberships.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {person.gangMemberships.map((m) => m.gang.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {person._count.warrants > 0 && (
                        <Badge variant="outline" className="text-xs">{person._count.warrants} warrant{person._count.warrants !== 1 ? "s" : ""}</Badge>
                      )}
                      <Badge variant={THREAT_COLORS[person.threatLevel] as "destructive" | "secondary" | "outline"}>
                        {person.threatLevel}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t">
              <Link href="/intelligence/persons" className="block">
                <Button variant="ghost" size="sm" className="w-full">
                  View all flagged persons <Eye className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Recent Association Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAssociations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No associations recorded</p>
            ) : (
              <div className="space-y-2">
                {recentAssociations.map((assoc) => (
                  <div key={assoc.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                    <span className="truncate">
                      <Link href={`/persons/${assoc.personA.id}`} className="font-medium hover:underline">
                        {assoc.personA.firstName} {assoc.personA.lastName}
                      </Link>
                      {" ↔ "}
                      <Link href={`/persons/${assoc.personB.id}`} className="font-medium hover:underline">
                        {assoc.personB.firstName} {assoc.personB.lastName}
                      </Link>
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      {assoc.relationshipType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
