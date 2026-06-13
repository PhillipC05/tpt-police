"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CommunityEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  eventDate: string;
  isPublic: boolean;
}

interface WatchGroup {
  id: string;
  name: string;
  area: string | null;
  active: boolean;
  memberCount: number;
  createdAt: string;
  coordinatorName: string;
}

interface Commendation {
  id: string;
  citizenName: string | null;
  description: string;
  createdAt: string;
  officer: { id: string; name: string; badgeNumber: string | null };
}

interface Props {
  initialEvents: CommunityEvent[];
  initialWatchGroups: WatchGroup[];
  initialCommendations: Commendation[];
  userRole: string;
}


export function CommunityClient({ initialEvents, initialWatchGroups, initialCommendations }: Props) {
  return (
    <Tabs defaultValue="events">
      <TabsList>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="watch">Watch Groups</TabsTrigger>
        <TabsTrigger value="commendations">Commendations</TabsTrigger>
      </TabsList>

      <TabsContent value="events" className="mt-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Visibility</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialEvents.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No events found.</TableCell></TableRow>
                )}
                {initialEvents.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div className="font-medium">{ev.title}</div>
                      {ev.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{ev.description}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{ev.location ?? "—"}</TableCell>
                    <TableCell className="text-sm">{new Date(ev.eventDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={ev.isPublic ? "default" : "secondary"} className="text-xs">
                        {ev.isPublic ? "Public" : "Internal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="watch" className="mt-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Coordinator</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialWatchGroups.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No watch groups found.</TableCell></TableRow>
                )}
                {initialWatchGroups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-sm">{g.area}</TableCell>
                    <TableCell className="text-sm">{g.coordinatorName}</TableCell>
                    <TableCell className="text-sm">{g.memberCount}</TableCell>
                    <TableCell>
                      <Badge variant={g.active ? "default" : "secondary"} className="text-xs">
                        {g.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(g.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="commendations" className="mt-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Officer</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Narrative</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialCommendations.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No commendations found.</TableCell></TableRow>
                )}
                {initialCommendations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.officer ? (
                        <div>
                          <div className="font-medium text-sm">{c.officer.name}</div>
                          <div className="text-xs text-muted-foreground">{c.officer.badgeNumber ?? ""}</div>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{c.citizenName ?? "Anonymous"}</TableCell>
                    <TableCell className="text-sm max-w-sm truncate">{c.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
