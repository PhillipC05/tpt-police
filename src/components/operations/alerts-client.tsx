"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertOctagon, Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface AlertItem {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  vehiclePlate: string | null;
  vehicleDescription: string | null;
  expiresAt: string | null;
  createdAt: string;
  person: { id: string; firstName: string; lastName: string } | null;
  issuedBy: { id: string; name: string; badgeNumber: string | null };
}

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  BOLO: "default",
  APB: "destructive",
  AMBER_ALERT: "destructive",
  SILVER_ALERT: "secondary",
};

const TYPE_LABELS: Record<string, string> = {
  BOLO: "BOLO",
  APB: "APB",
  AMBER_ALERT: "Amber Alert",
  SILVER_ALERT: "Silver Alert",
};

export function AlertsClient() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "BOLO",
    title: "",
    description: "",
    vehiclePlate: "",
    vehicleDescription: "",
    expiresAt: "",
  });

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts?status=ACTIVE");
      if (res.ok) {
        const data = await res.json();
        const filtered = search
          ? data.filter((a: AlertItem) =>
              a.title.toLowerCase().includes(search.toLowerCase()) ||
              a.description.toLowerCase().includes(search.toLowerCase())
            )
          : data;
        setAlerts(filtered);
      }
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleCreate = async () => {
    if (!form.title || !form.description) {
      toast.error("Title and description are required");
      return;
    }
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
          vehiclePlate: form.vehiclePlate || undefined,
          vehicleDescription: form.vehicleDescription || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Alert issued");
      setOpen(false);
      setForm({ type: "BOLO", title: "", description: "", vehiclePlate: "", vehicleDescription: "", expiresAt: "" });
      fetchAlerts();
    } catch {
      toast.error("Failed to issue alert");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Alert cancelled");
      fetchAlerts();
    } catch {
      toast.error("Failed to cancel alert");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search alerts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="destructive" />}>
            <Plus className="w-4 h-4 mr-2" />
            Issue Alert
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Issue Alert / BOLO</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Alert Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOLO">BOLO — Be On the Lookout</SelectItem>
                    <SelectItem value="APB">APB — All-Points Bulletin</SelectItem>
                    <SelectItem value="AMBER_ALERT">Amber Alert (Child Missing)</SelectItem>
                    <SelectItem value="SILVER_ALERT">Silver Alert (Elderly Missing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Title / Subject</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Armed robbery suspect" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} placeholder="Physical description, last known location, circumstances..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Vehicle Plate</Label>
                  <Input value={form.vehiclePlate} onChange={(e) => setForm((f) => ({ ...f, vehiclePlate: e.target.value }))} placeholder="e.g. CA 123-456" />
                </div>
                <div className="space-y-1">
                  <Label>Vehicle Description</Label>
                  <Input value={form.vehicleDescription} onChange={(e) => setForm((f) => ({ ...f, vehicleDescription: e.target.value }))} placeholder="e.g. White Toyota Corolla" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Expires At (optional)</Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button variant="destructive" onClick={handleCreate}>Issue Alert</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No active alerts</div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertOctagon className="w-4 h-4 mt-1 text-red-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={TYPE_VARIANTS[a.type]}>{TYPE_LABELS[a.type] ?? a.type}</Badge>
                        {a.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Expires {new Date(a.expiresAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold mt-0.5">{a.title}</p>
                      {a.person && (
                        <p className="text-sm">Subject: {a.person.firstName} {a.person.lastName}</p>
                      )}
                      {a.vehiclePlate && (
                        <p className="text-sm">Vehicle: {a.vehiclePlate}{a.vehicleDescription && ` — ${a.vehicleDescription}`}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued by {a.issuedBy.name} · {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleCancel(a.id)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
