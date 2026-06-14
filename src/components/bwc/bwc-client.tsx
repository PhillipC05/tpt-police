"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

interface Camera {
  id: string;
  serialNumber: string;
  model: string;
  deviceType: string;
  status: string;
  lastSyncAt: string | null;
  assignedTo: { id: string; name: string; badgeNumber: string | null } | null;
}

interface BWCEvent {
  id: string;
  activationType: string;
  startedAt: string;
  endedAt: string | null;
  flagged: boolean;
  footageUrl: string | null;
  camera: { serialNumber: string; model: string };
  officer: { id: string; name: string; badgeNumber: string | null };
}

interface Props {
  initialCameras: Camera[];
  initialEvents: BWCEvent[];
  userRole: string;
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-gray-100 text-gray-800",
  ASSIGNED: "bg-green-100 text-green-800",
  CHARGING: "bg-blue-100 text-blue-800",
  FAULTY: "bg-yellow-100 text-yellow-800",
  DECOMMISSIONED: "bg-red-100 text-red-800",
};

const ACTIVATION_BADGE: Record<string, string> = {
  MANUAL: "bg-blue-100 text-blue-800",
  AUTO: "bg-green-100 text-green-800",
  INCIDENT: "bg-red-100 text-red-800",
};

export function BWCClient({ initialCameras, initialEvents }: Props) {
  const [cameraSearch, setCameraSearch] = useState("");

  const filteredCameras = initialCameras.filter(
    (c) =>
      c.serialNumber.toLowerCase().includes(cameraSearch.toLowerCase()) ||
      c.model.toLowerCase().includes(cameraSearch.toLowerCase()) ||
      c.assignedTo?.name.toLowerCase().includes(cameraSearch.toLowerCase()) ||
      c.assignedTo?.badgeNumber?.toLowerCase().includes(cameraSearch.toLowerCase()),
  );

  return (
    <Tabs defaultValue="cameras">
      <TabsList>
        <TabsTrigger value="cameras">Camera Inventory</TabsTrigger>
        <TabsTrigger value="events">Footage Events</TabsTrigger>
      </TabsList>

      <TabsContent value="cameras" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by serial, model, officer…"
                  value={cameraSearch}
                  onChange={(e) => setCameraSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Officer</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Last Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCameras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No cameras found.
                    </TableCell>
                  </TableRow>
                )}
                {filteredCameras.map((cam) => (
                  <TableRow key={cam.id}>
                    <TableCell className="font-mono text-xs">{cam.serialNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {cam.model}
                        {cam.deviceType === "SMART_GLASSES" && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Smart Glasses</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[cam.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {cam.status}
                      </span>
                    </TableCell>
                    <TableCell>{cam.assignedTo?.name ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cam.assignedTo?.badgeNumber ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cam.lastSyncAt ? new Date(cam.lastSyncAt).toLocaleString() : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="events" className="mt-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Officer</TableHead>
                  <TableHead>Camera</TableHead>
                  <TableHead>Activation</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Flagged</TableHead>
                  <TableHead>Footage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No footage events recorded.
                    </TableCell>
                  </TableRow>
                )}
                {initialEvents.map((ev) => {
                  const durationMs = ev.endedAt
                    ? new Date(ev.endedAt).getTime() - new Date(ev.startedAt).getTime()
                    : null;
                  const durationMin = durationMs ? Math.round(durationMs / 60000) : null;
                  return (
                    <TableRow key={ev.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{ev.officer.name}</div>
                        <div className="text-xs text-muted-foreground">{ev.officer.badgeNumber ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{ev.camera.serialNumber}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTIVATION_BADGE[ev.activationType] ?? ""}`}>
                          {ev.activationType}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(ev.startedAt).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{durationMin != null ? `${durationMin}m` : "Ongoing"}</TableCell>
                      <TableCell>
                        {ev.flagged ? (
                          <Badge variant="destructive" className="text-xs">Flagged</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ev.footageUrl ? (
                          <a
                            href={ev.footageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
