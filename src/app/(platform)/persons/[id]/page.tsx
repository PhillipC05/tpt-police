import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PersonHistoryClient } from "@/components/persons/person-history-client";
import { PersonAssociationsClient } from "@/components/intelligence/person-associations-client";
import { ThreatLevelClient } from "@/components/intelligence/threat-level-client";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

const THREAT_COLORS: Record<string, string> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
  NONE: "outline",
};

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      gangMemberships: {
        include: { gang: { select: { id: true, name: true, type: true, status: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!person) return <div className="p-8 text-center text-muted-foreground">Person not found</div>;

  const isJuvenile = person.dateOfBirth
    ? new Date().getFullYear() - new Date(person.dateOfBirth).getFullYear() < 18
    : false;

  if (isJuvenile && !DETECTIVE_ROLES.includes(session.user.role)) {
    return <div className="p-8 text-center text-muted-foreground">Juvenile records require DETECTIVE role or higher.</div>;
  }

  const canEditIntelligence = DETECTIVE_ROLES.includes(session.user.role);

  // Log read access for intelligence fields when viewer has detective+ access
  if (canEditIntelligence) {
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "VIEW_PERSON_INTELLIGENCE",
      resource: "person",
      resourceId: id,
      metadata: { name: `${person.firstName} ${person.lastName}`, threatLevel: person.threatLevel },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {person.photoUrl ? (
            <img src={person.photoUrl} alt="" className="w-16 h-20 rounded-lg object-cover border" />
          ) : (
            <div className="w-16 h-20 rounded-lg bg-muted flex items-center justify-center border">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{person.firstName} {person.lastName}</h1>
              {person.threatLevel !== "NONE" && (
                <Badge variant={THREAT_COLORS[person.threatLevel] as "destructive" | "secondary" | "outline"}>
                  {person.threatLevel} THREAT
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {person.idNumber && <span>ID: {person.idNumber}</span>}
              {person.dateOfBirth && <span>DOB: {new Date(person.dateOfBirth).toLocaleDateString()}</span>}
              {person.gender && <span>{person.gender}</span>}
              {person.nationality && <span>{person.nationality}</span>}
            </div>
          </div>
        </div>
        <Link href={`/api/persons/${id}/rap-sheet`}>
          <Button variant="outline" size="sm" className="shrink-0">
            <Download className="w-4 h-4 mr-2" />Rap Sheet
          </Button>
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Phone:</span> {person.phone || "N/A"}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Email:</span> {person.email || "N/A"}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Address:</span> {person.address || "N/A"}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Notes:</span> {person.notes || "N/A"}</CardContent></Card>
        {isJuvenile && <Card><CardContent className="p-3 text-sm"><span className="text-yellow-500 font-medium">Juvenile Record</span></CardContent></Card>}
      </div>

      {canEditIntelligence && (
        <ThreatLevelClient
          personId={id}
          currentLevel={person.threatLevel}
        />
      )}

      {canEditIntelligence && person.gangMemberships.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gang Affiliations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {person.gangMemberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1">
                  <Link href={`/intelligence/gangs/${m.gang.id}`} className="text-sm font-medium hover:underline">
                    {m.gang.name}
                  </Link>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-xs">{m.gang.type.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className="text-xs">{m.role}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canEditIntelligence && (
        <PersonAssociationsClient personId={id} canEdit={canEditIntelligence} />
      )}

      <PersonHistoryClient personId={id} />
    </div>
  );
}
