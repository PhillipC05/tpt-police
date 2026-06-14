import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { GangsClient } from "@/components/intelligence/gangs-client";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export default async function GangsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!DETECTIVE_ROLES.includes(session.user.role)) redirect("/dashboard");

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_GANG_REGISTRY",
    resource: "gang",
  });

  const tid = session.user.tenantId;
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const gangs = await prisma.gang.findMany({
    where: isSuperAdmin ? undefined : { tenantId: tid },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const canCreate = ADMIN_ROLES.includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gang Registry</h1>
          <p className="text-sm text-muted-foreground">Track criminal organizations, street gangs, and affiliated networks</p>
        </div>
        {canCreate && (
          <Link href="/intelligence/gangs/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />New Gang
            </Button>
          </Link>
        )}
      </div>

      <GangsClient gangs={gangs} canCreate={canCreate} />
    </div>
  );
}
