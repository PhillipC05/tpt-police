"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Drone, Plus } from "lucide-react";
import { toast } from "sonner";

interface DroneItem {
  id: string;
  serialNumber: string;
  model: string;
  status: string;
  batteryPercent: number;
  certificationExpiry: string | null;
  deployments: { id: string; operator: { name: string }; launchedAt: string; landedAt: string | null; incident: { type: string } | null }[];
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  AVAILABLE: "default",
  DEPLOYED: "destructive",
  CHARGING: "secondary",
  MAINTENANCE: "outline",
  DECOMMISSIONED: "outline",
};

export function DronesClient() {
  const [drones, setDrones] = useState<DroneItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ serialNumber: "", model: "", status: "AVAILABLE" });

  const fetchDrones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/erp/drones");
      if (res.ok) {
        const data = await res.json();
        const filtered = search ? data.filter((d: DroneItem) => d.serialNumber.toLowerCase().includes(search.toLowerCase()) || d.model.toLowerCase().includes(search.toLowerCase())) : data;
        setDrones(filtered);
      }
    } catch { toast.error("Failed to load drones"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchDrones(); }, [fetchDrones]);

  const handleCreate = async () => {
    if (!form.serialNumber || !form.model) { toast.error("Serial number and model required"); return; }
    try {
      const res = await fetch("/api/erp/drones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success("Drone registered");
      setOpen(false);
      setForm({ serialNumber: "", model: "", status: "AVAILABLE" });
      fetchDrones();
    } catch { toast.error("Failed to register drone"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by serial or model..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus className="w-4 h-4 mr-2" />Register Drone</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Register Drone</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1"><Label>Serial Number</Label><Input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Model</Label><Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} /></div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate}>Register</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Loading...</div>
      : drones.length === 0 ? <div className="text-center py-8 text-muted-foreground">No drones registered</div>
      : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {drones.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Drone className="w-5 h-5 mt-1 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{d.serialNumber}</span>
                      <Badge variant={STATUS_VARIANTS[d.status] || "outline"}>{d.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{d.model}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${d.batteryPercent > 50 ? "bg-green-500" : d.batteryPercent > 20 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${d.batteryPercent}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{d.batteryPercent}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{d.deployments.length} deployment{d.deployments.length !== 1 ? "s" : ""}</p>
                    {d.certificationExpiry && new Date(d.certificationExpiry) < new Date() && <Badge variant="destructive" className="text-xs mt-1">Certification Expired</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}