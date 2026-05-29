import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, ClipboardList, UserPlus } from "lucide-react";
import { StaffDirectoryClient } from "@/components/hr/staff-directory-client";
import { OrgChartSection } from "@/components/hr/org-chart-section";


export default async function HrPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [staffCount, pendingLeaveCount, reviewsCount] = await Promise.all([
    prisma.user.count({ where: { tenantId: session.user.tenantId, status: "ACTIVE" } }),
    prisma.leaveRequest.count({ where: { tenantId: session.user.tenantId, status: "PENDING" } }),
    prisma.performanceReview.count({
      where: { userId: { in: (await prisma.user.findMany({ where: { tenantId: session.user.tenantId }, select: { id: true } })).map((u: { id: string }) => u.id) } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff & HR</h1>
        <p className="text-muted-foreground">Manage personnel, leave, and performance records.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Leave</CardTitle>
            <Calendar className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeaveCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Reviews Completed</CardTitle>
            <ClipboardList className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Onboarding</CardTitle>
            <UserPlus className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
      </div>

      <StaffDirectoryClient />

      {/* Org chart visualization */}
      <div className="pt-6">
        {/* Client component: loads staff and renders hierarchy */}
        <OrgChartSection />
      </div>
    </div>

  );
}

