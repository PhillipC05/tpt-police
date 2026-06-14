import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ScanMatchFeedClient } from "@/components/intelligence/scan-match-feed-client";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export default async function ScanMatchesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!DETECTIVE_ROLES.includes(session.user.role)) redirect("/dashboard");

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_MATCH_HISTORY",
    resource: "facial_recognition",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/intelligence/scanner">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Match History</h1>
        <p className="text-sm text-muted-foreground">
          Real-time identity match feed — auto-refreshes every 15 seconds
        </p>
      </div>

      <ScanMatchFeedClient />
    </div>
  );
}
