import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel, CalendarCheck, CalendarX, Clock } from "lucide-react";
import { CourtAppearancesClient } from "@/components/operations/court-appearances-client";

export default async function CourtAppearancesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [scheduled, attended, missed, upcoming] = await Promise.all([
    prisma.courtAppearance.count({ where: { tenantId: tid, status: "SCHEDULED" } }),
    prisma.courtAppearance.count({ where: { tenantId: tid, status: "ATTENDED" } }),
    prisma.courtAppearance.count({ where: { tenantId: tid, status: "MISSED" } }),
    prisma.courtAppearance.count({ where: { tenantId: tid, courtDate: { gte: today, lte: weekEnd }, status: "SCHEDULED" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Court Appearances</h1>
        <p className="text-muted-foreground">Schedule and track officer court appearances, subpoenas, and reminders.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{scheduled}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming 7 Days</CardTitle>
            <Gavel className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{upcoming}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attended</CardTitle>
            <CalendarCheck className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{attended}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Missed</CardTitle>
            <CalendarX className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{missed}</div></CardContent>
        </Card>
      </div>

      <CourtAppearancesClient />
    </div>
  );
}