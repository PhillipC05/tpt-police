import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Star } from "lucide-react";
import { CommunityClient } from "@/components/community/community-client";

export default async function CommunityPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [eventCount, watchGroupCount, commendationCount] = await Promise.all([
    prisma.communityEvent.count({ where: { tenantId: tid } }),
    prisma.neighbourhoodWatch.count({ where: { tenantId: tid } }),
    prisma.officerCommendation.count({ where: { tenantId: tid } }),
  ]);

  const [events, watchGroups, commendations] = await Promise.all([
    prisma.communityEvent.findMany({
      where: { tenantId: tid },
      orderBy: { eventDate: "asc" },
      take: 50,
    }),
    prisma.neighbourhoodWatch.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.officerCommendation.findMany({
      where: { tenantId: tid },
      include: { officer: { select: { id: true, name: true, badgeNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Community Engagement</h1>
        <p className="text-muted-foreground">Events, neighbourhood watch, and commendations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Calendar className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{eventCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Watch Groups</CardTitle>
            <Users className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{watchGroupCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commendations</CardTitle>
            <Star className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{commendationCount}</div></CardContent>
        </Card>
      </div>

      <CommunityClient
        initialEvents={JSON.parse(JSON.stringify(events))}
        initialWatchGroups={JSON.parse(JSON.stringify(watchGroups))}
        initialCommendations={JSON.parse(JSON.stringify(commendations))}
        userRole={session.user.role}
      />
    </div>
  );
}
