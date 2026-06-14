import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewGangClient } from "@/components/intelligence/new-gang-client";

const ADMIN_ROLES = ["PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export default async function NewGangPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!ADMIN_ROLES.includes(session.user.role)) redirect("/intelligence/gangs");

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/intelligence/gangs">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Register New Gang</h1>
        <p className="text-sm text-muted-foreground">Add a criminal organization or network to the intelligence registry</p>
      </div>

      <NewGangClient />
    </div>
  );
}
