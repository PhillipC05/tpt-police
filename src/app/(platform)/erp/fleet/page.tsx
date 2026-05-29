import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FleetClient } from "@/components/erp/fleet-client";

export default async function FleetPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fleet Management</h1>
        <p className="text-muted-foreground">Vehicle inventory, fuel logs, and vehicle incidents.</p>
      </div>

      <FleetClient />
    </div>
  );
}
