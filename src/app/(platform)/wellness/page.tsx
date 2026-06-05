import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Smile, Frown, Brain } from "lucide-react";
import { WellnessClient } from "@/components/wellness/wellness-client";

export default async function WellnessPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [checkins, flagged, counselling, avgMood] = await Promise.all([
    prisma.wellnessCheckin.count({ where: { officer: { tenantId: tid } } }),
    prisma.wellnessCheckin.count({ where: { officer: { tenantId: tid }, flagged: true } }),
    prisma.counsellingSession.count({ where: { officer: { tenantId: tid } } }),
    prisma.wellnessCheckin.aggregate({
      where: { officer: { tenantId: tid } },
      _avg: { moodScore: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Officer Wellness</h1>
        <p className="text-muted-foreground">Mental health check-ins, counselling, and well-being support.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            <Heart className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{checkins}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Mood Score</CardTitle>
            <Smile className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgMood._avg.moodScore?.toFixed(1) || "N/A"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <Frown className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{flagged}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Counselling</CardTitle>
            <Brain className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{counselling}</div></CardContent>
        </Card>
      </div>

      <WellnessClient userRole={session.user.role} />
    </div>
  );
}