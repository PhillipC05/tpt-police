"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Camera, MapPin } from "lucide-react";
import type { SurveillanceCamera, SurveillanceCameraStatus } from "@prisma/client";

interface CameraWithCount extends SurveillanceCamera {
  _count: { sessions: number };
}

interface Props {
  cameras: CameraWithCount[];
  canEdit: boolean;
}

const STATUS_COLORS: Record<SurveillanceCameraStatus, string> = {
  ONLINE: "secondary",
  OFFLINE: "destructive",
  MAINTENANCE: "outline",
};

export function SurveillanceCameraClient({ cameras: initialCameras, canEdit }: Props) {
  const [cameras, setCameras] = useState(initialCameras);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [status, setStatus] = useState<SurveillanceCameraStatus>("ONLINE");

  function handleAdd() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/surveillance/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || undefined,
          streamUrl: streamUrl.trim() || undefined,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Failed to add camera");
      } else {
        setCameras((prev) => [...prev, { ...data, _count: { sessions: 0 } }]);
        setName("");
        setLocation("");
        setStreamUrl("");
        setStatus("ONLINE");
        setShowForm(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          {!showForm ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Camera
            </Button>
          ) : (
            <div className="w-full border rounded-lg p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">Register new surveillance camera</p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Street Corner" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 5th Ave & Main St" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stream URL (RTSP/HLS)</Label>
                  <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="rtsp://..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as SurveillanceCameraStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">Online</SelectItem>
                      <SelectItem value="OFFLINE">Offline</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleAdd} disabled={!name.trim() || isPending}>Add Camera</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setError(null); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {cameras.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No surveillance cameras registered
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cameras.map((cam) => (
            <Card key={cam.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Camera className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <p className="font-medium text-sm truncate">{cam.name}</p>
                  </div>
                  <Badge variant={STATUS_COLORS[cam.status] as "secondary" | "destructive" | "outline"} className="text-xs shrink-0">
                    {cam.status}
                  </Badge>
                </div>
                {cam.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />{cam.location}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{cam._count.sessions} scan sessions</span>
                  <Badge variant={cam.scanEnabled ? "outline" : "secondary"} className="text-xs">
                    {cam.scanEnabled ? "Scan on" : "Scan off"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
