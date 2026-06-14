import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GangDetailClient } from "@/components/intelligence/gang-detail-client";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "destructive",
  INACTIVE: "secondary",
  DISBANDED: "outline",
};

export default async function GangDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (!DETECTIVE_ROLES.includes(session.user.role)) redirect("/dashboard");

  const { id } = await params;

  const gang = await prisma.gang.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              idNumber: true,
              dateOfBirth: true,
              threatLevel: true,
            },
          },
        },
        orderBy: { role: "asc" },
      },
    },
  });

  if (!gang) return <div className="p-8 text-center text-muted-foreground">Gang record not found</div>;

  // Non-super-admins can only view their own tenant's gangs
  if (session.user.role !== "SUPER_ADMIN" && gang.tenantId !== session.user.tenantId) {
    return <div className="p-8 text-center text-muted-foreground">Not found</div>;
  }

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_GANG_DETAIL",
    resource: "gang",
    resourceId: id,
    metadata: { gangName: gang.name },
  });

  const canEdit = ADMIN_ROLES.includes(session.user.role) && gang.tenantId === session.user.tenantId;
  const canManageMembers = DETECTIVE_ROLES.includes(session.user.role) && gang.tenantId === session.user.tenantId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/intelligence/gangs">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{gang.name}</h1>
            <Badge variant={STATUS_COLORS[gang.status] as "destructive" | "secondary" | "outline"}>
              {gang.status}
            </Badge>
            <Badge variant="outline">{gang.type.replace(/_/g, " ")}</Badge>
          </div>
          {gang.aliases.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Also known as: {gang.aliases.join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Territory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{gang.territory || "Not documented"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{gang.description || "No description"}</p>
          </CardContent>
        </Card>
      </div>

      <GangDetailClient
        gang={{ id: gang.id, name: gang.name, status: gang.status }}
        members={gang.members}
        canEdit={canEdit}
        canManageMembers={canManageMembers}
      />
    </div>
  );
}
