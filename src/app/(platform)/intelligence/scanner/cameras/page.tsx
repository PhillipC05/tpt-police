import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SurveillanceCameraClient } from "@/components/intelligence/surveillance-camera-client";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export default async function SurveillanceCamerasPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!DETECTIVE_ROLES.includes(session.user.role)) redirect("/dashboard");

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_SURVEILLANCE_CAMERAS",
    resource: "surveillanceCamera",
  });

  const cameras = await prisma.surveillanceCamera.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { sessions: true } } },
    orderBy: { name: "asc" },
  });

  const canEdit = ADMIN_ROLES.includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/intelligence/scanner">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">CCTV & Surveillance Cameras</h1>
        <p className="text-sm text-muted-foreground">
          Manage fixed camera feeds connected to the identity scanner
        </p>
      </div>

      <SurveillanceCameraClient cameras={cameras} canEdit={canEdit} />
    </div>
  );
}
