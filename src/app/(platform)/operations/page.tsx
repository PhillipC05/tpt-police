import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileWarning, UserX, AlertOctagon, ClipboardList, AlertTriangle, Scale, Gavel, Search } from "lucide-react";
import Link from "next/link";

export default async function OperationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [activeWarrants, activeAlerts, todayBookings, pendingUoF, todayContacts, pendingComplaints, upcomingCourt, activeMissing] = await Promise.all([
    prisma.warrant.count({ where: { tenantId: tid, status: "ISSUED" } }),
    prisma.alert.count({ where: { tenantId: tid, status: "ACTIVE" } }),
    prisma.booking.count({ where: { tenantId: tid, status: "BOOKED", createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.useOfForce.count({ where: { tenantId: tid, status: "SUBMITTED" } }),
    prisma.fieldContact.count({ where: { tenantId: tid, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.civilianComplaint.count({ where: { tenantId: tid, status: "RECEIVED" } }),
    prisma.courtAppearance.count({ where: { tenantId: tid, status: "SCHEDULED", courtDate: { gte: new Date() } } }),
    prisma.case.count({ where: { tenantId: tid, type: "MISSING_PERSON", status: "ACTIVE" } }),
  ]);

  const modules = [
    { href: "/operations/warrants", icon: FileWarning, title: "Warrants", description: "Manage arrest, search, and protection warrants", stat: activeWarrants, statLabel: "outstanding", color: "text-orange-500" },
    { href: "/operations/alerts", icon: AlertOctagon, title: "Alerts & BOLOs", description: "Broadcast APBs, BOLOs, and missing person alerts", stat: activeAlerts, statLabel: "active", color: "text-red-500" },
    { href: "/operations/bookings", icon: UserX, title: "Bookings", description: "Arrest processing, charges, and holding cell management", stat: todayBookings, statLabel: "in custody today", color: "text-blue-500" },
    { href: "/operations/use-of-force", icon: AlertTriangle, title: "Use of Force", description: "Submit and review use of force reports", stat: pendingUoF, statLabel: "pending review", color: "text-yellow-500" },
    { href: "/operations/field-contacts", icon: ClipboardList, title: "Field Contacts", description: "Traffic stops, field interviews, and pedestrian contacts", stat: todayContacts, statLabel: "today", color: "text-purple-500" },
    { href: "/operations/complaints", icon: Scale, title: "Internal Affairs", description: "Civilian complaint review and investigation queue", stat: pendingComplaints, statLabel: "pending review", color: "text-indigo-500" },
    { href: "/operations/court-appearances", icon: Gavel, title: "Court Appearances", description: "Schedule and track officer court appearances", stat: upcomingCourt, statLabel: "upcoming", color: "text-teal-500" },
    { href: "/operations/missing-persons", icon: Search, title: "Missing Persons", description: "Track missing persons cases and multi-precinct coordination", stat: activeMissing, statLabel: "active", color: "text-pink-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
        <p className="text-muted-foreground">Warrants, bookings, alerts, use of force, and field contacts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{m.stat}</div>
                  <p className="text-xs text-muted-foreground">{m.statLabel}</p>
                  <p className="text-sm text-muted-foreground mt-2">{m.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}