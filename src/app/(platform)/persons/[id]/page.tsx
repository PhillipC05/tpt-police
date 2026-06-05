import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PersonHistoryClient } from "@/components/persons/person-history-client";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) return <div className="p-8 text-center text-muted-foreground">Person not found</div>;

  // Check juvenile restriction
  const isJuvenile = person.dateOfBirth
    ? new Date().getFullYear() - new Date(person.dateOfBirth).getFullYear() < 18
    : false;

  if (isJuvenile && !["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return <div className="p-8 text-center text-muted-foreground">Juvenile records require DETECTIVE role or higher.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {person.photoUrl ? (
            <img src={person.photoUrl} alt="" className="w-16 h-20 rounded-lg object-cover border" />
          ) : (
            <div className="w-16 h-20 rounded-lg bg-muted flex items-center justify-center border">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{person.firstName} {person.lastName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {person.idNumber && <span>ID: {person.idNumber}</span>}
              {person.dateOfBirth && <span>DOB: {new Date(person.dateOfBirth).toLocaleDateString()}</span>}
              {person.gender && <span>{person.gender}</span>}
              {person.nationality && <span>{person.nationality}</span>}
            </div>
          </div>
        </div>
        <Link href={`/api/persons/${id}/rap-sheet`}>
          <Button variant="outline" size="sm" className="shrink-0">
            <Download className="w-4 h-4 mr-2" />Rap Sheet
          </Button>
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Phone:</span> {person.phone || "N/A"}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Email:</span> {person.email || "N/A"}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Address:</span> {person.address || "N/A"}</CardContent></Card>
        <Card><CardContent className="p-3 text-sm"><span className="text-muted-foreground">Notes:</span> {person.notes || "N/A"}</CardContent></Card>
        {isJuvenile && <Card><CardContent className="p-3 text-sm"><span className="text-yellow-500 font-medium">Juvenile Record</span></CardContent></Card>}
      </div>

      <PersonHistoryClient personId={id} />
    </div>
  );
}