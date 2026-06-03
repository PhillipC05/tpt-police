import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserX, Users, DoorOpen, ArrowRightLeft } from "lucide-react";
import { BookingsClient } from "@/components/operations/bookings-client";

export default async function BookingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tid = session.user.tenantId;

  const [booked, bailed, released, transferred, cellOccupancy] = await Promise.all([
    prisma.booking.count({ where: { tenantId: tid, status: "BOOKED" } }),
    prisma.booking.count({ where: { tenantId: tid, status: "BAILED" } }),
    prisma.booking.count({ where: { tenantId: tid, status: "RELEASED" } }),
    prisma.booking.count({ where: { tenantId: tid, status: "TRANSFERRED" } }),
    prisma.booking.findMany({
      where: { tenantId: tid, status: "BOOKED", holdingCell: { not: null } },
      select: {
        holdingCell: true,
        bookingNumber: true,
        person: { select: { firstName: true, lastName: true } },
        arrestedAt: true,
      },
      orderBy: { holdingCell: "asc" },
    }),
  ]);

  const stats = [
    { label: "In Custody", value: booked, icon: UserX, color: "text-red-500" },
    { label: "Bailed", value: bailed, icon: Users, color: "text-yellow-500" },
    { label: "Released", value: released, icon: DoorOpen, color: "text-green-500" },
    { label: "Transferred", value: transferred, icon: ArrowRightLeft, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground">Arrest processing, charges, holding cells, and bail management.</p>
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

      {cellOccupancy.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Holding Cell Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {cellOccupancy.map((b) => (
                <div key={b.bookingNumber} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Cell {b.holdingCell}</p>
                    <p className="font-medium text-sm">{b.person.firstName} {b.person.lastName}</p>
                    <p className="text-xs text-muted-foreground">{b.bookingNumber}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {Math.floor((Date.now() - new Date(b.arrestedAt).getTime()) / 3600000)}h
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <BookingsClient />
    </div>
  );
}
