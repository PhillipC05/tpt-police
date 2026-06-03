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
import { Search, Plus, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface FieldContact {
  id: string;
  contactType: string;
  contactDate: string;
  location: string | null;
  subjectName: string | null;
  subjectIdNumber: string | null;
  vehiclePlate: string | null;
  outcome: string | null;
  createdAt: string;
  officer: { id: string; name: string; badgeNumber: string | null };
  person: { id: string; firstName: string; lastName: string; idNumber: string | null } | null;
}

const TYPE_LABELS: Record<string, string> = {
  TRAFFIC_STOP: "Traffic Stop",
  FIELD_INTERVIEW: "Field Interview",
  PEDESTRIAN_STOP: "Pedestrian Stop",
  WARRANT_CHECK: "Warrant Check",
};

const TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  TRAFFIC_STOP: "default",
  FIELD_INTERVIEW: "secondary",
  PEDESTRIAN_STOP: "outline",
  WARRANT_CHECK: "destructive",
};

export function FieldContactsClient() {
  const [contacts, setContacts] = useState<FieldContact[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contactType: "TRAFFIC_STOP",
    contactDate: "",
    location: "",
    subjectName: "",
    subjectDob: "",
    subjectIdNumber: "",
    vehiclePlate: "",
    vehicleMake: "",
    vehicleModel: "",
    outcome: "",
    notes: "",
  });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("contactType", typeFilter);
      const res = await fetch(`/api/field-contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        const filtered = search
          ? data.filter((c: FieldContact) =>
              c.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
              c.subjectIdNumber?.toLowerCase().includes(search.toLowerCase()) ||
              c.vehiclePlate?.toLowerCase().includes(search.toLowerCase()) ||
              c.location?.toLowerCase().includes(search.toLowerCase())
            )
          : data;
        setContacts(filtered);
      }
    } catch {
      toast.error("Failed to load field contacts");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleCreate = async () => {
    if (!form.contactDate || !form.contactType) {
      toast.error("Contact type and date are required");
      return;
    }
    try {
      const res = await fetch("/api/field-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contactDate: new Date(form.contactDate).toISOString(),
          subjectName: form.subjectName || undefined,
          subjectDob: form.subjectDob || undefined,
          subjectIdNumber: form.subjectIdNumber || undefined,
          vehiclePlate: form.vehiclePlate || undefined,
          vehicleMake: form.vehicleMake || undefined,
          vehicleModel: form.vehicleModel || undefined,
          outcome: form.outcome || undefined,
          notes: form.notes || undefined,
          location: form.location || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Field contact recorded");
      setOpen(false);
      setForm({ contactType: "TRAFFIC_STOP", contactDate: "", location: "", subjectName: "", subjectDob: "", subjectIdNumber: "", vehiclePlate: "", vehicleMake: "", vehicleModel: "", outcome: "", notes: "" });
      fetchContacts();
    } catch {
      toast.error("Failed to record field contact");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, plate or location..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="TRAFFIC_STOP">Traffic Stop</SelectItem>
            <SelectItem value="FIELD_INTERVIEW">Field Interview</SelectItem>
            <SelectItem value="PEDESTRIAN_STOP">Pedestrian Stop</SelectItem>
            <SelectItem value="WARRANT_CHECK">Warrant Check</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />Record Contact
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Field Contact</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Contact Type <span className="text-destructive">*</span></Label>
                  <Select value={form.contactType} onValueChange={(v) => setForm((f) => ({ ...f, contactType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date &amp; Time <span className="text-destructive">*</span></Label>
                  <Input type="datetime-local" value={form.contactDate} onChange={(e) => setForm((f) => ({ ...f, contactDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Street address or intersection" />
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">Subject Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.subjectDob} onChange={(e) => setForm((f) => ({ ...f, subjectDob: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>ID Number</Label>
                <Input value={form.subjectIdNumber} onChange={(e) => setForm((f) => ({ ...f, subjectIdNumber: e.target.value }))} />
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">Vehicle Details</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Plate</Label>
                  <Input value={form.vehiclePlate} onChange={(e) => setForm((f) => ({ ...f, vehiclePlate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Make</Label>
                  <Input value={form.vehicleMake} onChange={(e) => setForm((f) => ({ ...f, vehicleMake: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Model</Label>
                  <Input value={form.vehicleModel} onChange={(e) => setForm((f) => ({ ...f, vehicleModel: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Outcome</Label>
                <Input value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} placeholder="e.g. Warning issued, No action, Arrested" />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate}>Record Contact</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No field contacts found</div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ClipboardList className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={TYPE_VARIANTS[c.contactType]}>{TYPE_LABELS[c.contactType] ?? c.contactType}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(c.contactDate).toLocaleString()}</span>
                      {c.location && <span className="text-xs text-muted-foreground">· {c.location}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                      {c.subjectName && <span><span className="text-muted-foreground">Subject:</span> {c.subjectName}{c.subjectIdNumber && ` (${c.subjectIdNumber})`}</span>}
                      {c.vehiclePlate && <span><span className="text-muted-foreground">Plate:</span> {c.vehiclePlate}</span>}
                      {c.outcome && <span><span className="text-muted-foreground">Outcome:</span> {c.outcome}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Officer: {c.officer.name} ({c.officer.badgeNumber ?? "—"})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
