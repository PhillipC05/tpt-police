import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SchedulingClient } from "@/components/hr/scheduling-client";

export default async function SchedulingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shift Scheduling</h1>
        <p className="text-muted-foreground">Build rosters, manage shifts, track overtime, and handle swap requests.</p>
      </div>

      <SchedulingClient />
    </div>
  );
}