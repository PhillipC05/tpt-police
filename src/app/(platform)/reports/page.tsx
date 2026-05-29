import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "@/components/reports/analytics-client";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reporting & Analytics</h1>
        <p className="text-muted-foreground">Crime statistics, performance metrics, cross-precinct comparisons, and custom reports.</p>
      </div>

      <AnalyticsClient />
    </div>
  );
}