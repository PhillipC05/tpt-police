import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Users, ClipboardList, Search } from "lucide-react";
import { FieldContactsClient } from "@/components/operations/field-contacts-client";

export default async function FieldContactsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [trafficToday, interviewsToday, pedestrianToday, warrantsToday, byOfficer, byType] = await Promise.all([
    prisma.fieldContact.count({ where: { tenantId: tid, contactType: "TRAFFIC_STOP", createdAt: { gte: todayStart } } }),
    prisma.fieldContact.count({ where: { tenantId: tid, contactType: "FIELD_INTERVIEW", createdAt: { gte: todayStart } } }),
    prisma.fieldContact.count({ where: { tenantId: tid, contactType: "PEDESTRIAN_STOP", createdAt: { gte: todayStart } } }),
    prisma.fieldContact.count({ where: { tenantId: tid, contactType: "WARRANT_CHECK", createdAt: { gte: todayStart } } }),
    prisma.fieldContact.groupBy({
      by: ["officerId"] as const,
      _count: { id: true },
      where: { tenantId: tid, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }) as unknown as Promise<{ officerId: string; _count: { id: number } }[]>,
    prisma.fieldContact.groupBy({
      by: ["contactType"] as const,
      _count: { id: true },
      where: { tenantId: tid, createdAt: { gte: thirtyDaysAgo } },
    }) as unknown as Promise<{ contactType: string; _count: { id: number } }[]>,
  ]);

  const officerIds = byOfficer.map((o) => o.officerId);
  const officerNames = await prisma.user.findMany({
    where: { id: { in: officerIds } },
    select: { id: true, name: true, badgeNumber: true },
  });

  const TYPE_LABELS: Record<string, string> = {
    TRAFFIC_STOP: "Traffic Stop",
    FIELD_INTERVIEW: "Field Interview",
    PEDESTRIAN_STOP: "Pedestrian Stop",
    WARRANT_CHECK: "Warrant Check",
  };

  const stats = [
    { label: "Traffic Stops Today", value: trafficToday, icon: Car, color: "text-blue-500" },
    { label: "Field Interviews Today", value: interviewsToday, icon: Users, color: "text-green-500" },
    { label: "Pedestrian Stops Today", value: pedestrianToday, icon: ClipboardList, color: "text-purple-500" },
    { label: "Warrant Checks Today", value: warrantsToday, icon: Search, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Field Contacts</h1>
        <p className="text-muted-foreground">Traffic stops, field interviews, and pedestrian contacts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
            </Card>
          );
        })}
      </div>

      {/* Community Oversight — 30-day aggregate */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts by Type (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byType.map((t) => (
                <div key={t.contactType} className="flex items-center justify-between text-sm">
                  <span>{TYPE_LABELS[t.contactType] ?? t.contactType}</span>
                  <span className="font-medium">{t._count.id}</span>
                </div>
              ))}
              {byType.length === 0 && <p className="text-muted-foreground text-sm">No data</p>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Officers by Contacts (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byOfficer.map((o) => {
                const officer = officerNames.find((u) => u.id === o.officerId);
                return (
                  <div key={o.officerId} className="flex items-center justify-between text-sm">
                    <span>{officer?.name ?? "Unknown"}{officer?.badgeNumber ? ` (${officer.badgeNumber})` : ""}</span>
                    <span className="font-medium">{o._count.id}</span>
                  </div>
                );
              })}
              {byOfficer.length === 0 && <p className="text-muted-foreground text-sm">No data</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <FieldContactsClient />
    </div>
  );
}
