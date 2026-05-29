import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LiveDashboardClient } from "@/components/dispatch/live-dashboard-client";

export default async function DispatchPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dispatch Operations</h1>
        <p className="text-muted-foreground">Real-time incident monitoring, officer status, and dispatch integration.</p>
      </div>

      <LiveDashboardClient />
    </div>
  );
}