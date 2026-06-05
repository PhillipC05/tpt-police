"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Gavel, Plus } from "lucide-react";
import { toast } from "sonner";

interface CourtAppearance {
  id: string;
  courtDate: string;
  courtName: string;
  matterType: string;
  status: string;
  overtimeTriggered: boolean;
  reminderSent: boolean;
  notes: string | null;
  case: { id: string; caseNumber: string; title: string; type: string } | null;
}

export function CourtAppearancesClient() {
  const [appearances, setAppearances] = useState<CourtAppearance[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    officerId: "",
    caseId: "",
    courtDate: "",
    courtName: "",
    matterType: "WITNESS",
    subpoenaFileUrl: "",
    notes: "",
  });

  const fetchAppearances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/court-appearances");
      if (res.ok) {
        const data = await res.json();
        const filtered = search
          ? data.filter((a: CourtAppearance) =>
              a.courtName.toLowerCase().includes(search.toLowerCase()) ||
              a.case?.caseNumber?.toLowerCase().includes(search.toLowerCase())
            )
          : data;
        setAppearances(filtered);
      }
    } catch {
      toast.error("Failed to load court appearances");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchAppearances(); }, [fetchAppearances]);

  const handleCreate = async () => {
    if (!form.officerId || !form.courtDate || !form.courtName) {
      toast.error("Officer ID, court date, and court name are required");
      return;
    }
    try {
      const res = await fetch("/api/court-appearances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          courtDate: new Date(form.courtDate).toISOString(),
          caseId: form.caseId || undefined,
          subpoenaFileUrl: form.subpoenaFileUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Court appearance scheduled");
      setOpen(false);
      setForm({ officerId: "", caseId: "", courtDate: "", courtName: "", matterType: "WITNESS", subpoenaFileUrl: "", notes: "" });
      fetchAppearances();
    } catch {
      toast.error("Failed to schedule court appearance");
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/court-appearances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Appearance updated");
      fetchAppearances();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleSendReminders = async () => {
    try {
      const res = await fetch("/api/court-appearances/remind?days=3", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`${data.reminded} reminder${data.reminded === 1 ? "" : "s"} sent`);
    } catch {
      toast.error("Failed to send reminders");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search court or case..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={handleSendReminders}>Send Reminders</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />Schedule
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Schedule Court Appearance</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Officer ID <span className="text-destructive">*</span></Label>
                  <Input value={form.officerId} onChange={(e) => setForm((f) => ({ ...f, officerId: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Case ID</Label>
                  <Input value={form.caseId} onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Court Name <span className="text-destructive">*</span></Label>
                <Input value={form.courtName} onChange={(e) => setForm((f) => ({ ...f, courtName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Court Date <span className="text-destructive">*</span></Label>
                  <Input type="datetime-local" value={form.courtDate} onChange={(e) => setForm((f) => ({ ...f, courtDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Matter Type</Label>
                  <Select value={form.matterType} onValueChange={(v) => setForm((f) => ({ ...f, matterType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WITNESS">Witness</SelectItem>
                      <SelectItem value="PROSECUTION">Prosecution</SelectItem>
                      <SelectItem value="HEARING">Hearing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Subpoena File URL</Label>
                <Input value={form.subpoenaFileUrl} onChange={(e) => setForm((f) => ({ ...f, subpoenaFileUrl: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate}>Schedule</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading appearances...</div>
      ) : appearances.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No court appearances found</div>
      ) : (
        <div className="space-y-3">
          {appearances.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Gavel className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge>{a.status}</Badge>
                        <Badge variant="secondary">{a.matterType}</Badge>
                        {a.overtimeTriggered && <Badge variant="destructive" className="text-xs">Overtime</Badge>}
                      </div>
                      <p className="font-medium mt-0.5">{a.courtName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(a.courtDate).toLocaleDateString()} at {new Date(a.courtDate).toLocaleTimeString()}
                      </p>
                      {a.case && (
                        <p className="text-xs text-muted-foreground">
                          Case: {a.case.caseNumber} — {a.case.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a.status === "SCHEDULED" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(a.id, "ATTENDED")}>Attended</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleUpdateStatus(a.id, "MISSED")}>Missed</Button>
                      </>
                    )}
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