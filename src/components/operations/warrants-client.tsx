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
import { Search, Plus, FileWarning } from "lucide-react";
import { toast } from "sonner";

interface Warrant {
  id: string;
  warrantNumber: string;
  type: string;
  status: string;
  subject: string;
  issuingMagistrate: string | null;
  expiresAt: string | null;
  createdAt: string;
  person: { id: string; firstName: string; lastName: string; idNumber: string | null } | null;
  issuedBy: { id: string; name: string; badgeNumber: string | null };
  servedBy: { id: string; name: string; badgeNumber: string | null } | null;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ISSUED: "default",
  SERVED: "secondary",
  RETURNED: "outline",
  EXPIRED: "destructive",
};

const TYPE_LABELS: Record<string, string> = {
  ARREST: "Arrest",
  SEARCH: "Search",
  PROTECTION: "Protection Order",
};

export function WarrantsClient() {
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "ARREST",
    subject: "",
    description: "",
    issuingMagistrate: "",
    expiresAt: "",
    notes: "",
  });

  const fetchWarrants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/warrants?${params}`);
      if (res.ok) {
        const data = await res.json();
        const filtered = search
          ? data.filter((w: Warrant) =>
              w.warrantNumber.toLowerCase().includes(search.toLowerCase()) ||
              w.subject.toLowerCase().includes(search.toLowerCase())
            )
          : data;
        setWarrants(filtered);
      }
    } catch {
      toast.error("Failed to load warrants");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchWarrants(); }, [fetchWarrants]);

  const handleCreate = async () => {
    if (!form.subject || !form.description) {
      toast.error("Subject and description are required");
      return;
    }
    try {
      const res = await fetch("/api/warrants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Warrant created");
      setOpen(false);
      setForm({ type: "ARREST", subject: "", description: "", issuingMagistrate: "", expiresAt: "", notes: "" });
      fetchWarrants();
    } catch {
      toast.error("Failed to create warrant");
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/warrants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          servedAt: status === "SERVED" ? new Date().toISOString() : undefined,
          returnedAt: status === "RETURNED" ? new Date().toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Warrant marked as ${status.toLowerCase()}`);
      fetchWarrants();
    } catch {
      toast.error("Failed to update warrant");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number or subject..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
            <SelectItem value="SERVED">Served</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />
            New Warrant
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Issue New Warrant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Warrant Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARREST">Arrest Warrant</SelectItem>
                    <SelectItem value="SEARCH">Search Warrant</SelectItem>
                    <SelectItem value="PROTECTION">Protection Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Subject Name</Label>
                <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Full name of subject" />
              </div>
              <div className="space-y-1">
                <Label>Description / Grounds</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Issuing Magistrate</Label>
                  <Input value={form.issuingMagistrate} onChange={(e) => setForm((f) => ({ ...f, issuingMagistrate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Expires At</Label>
                  <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate}>Issue Warrant</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading warrants...</div>
      ) : warrants.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No warrants found</div>
      ) : (
        <div className="space-y-3">
          {warrants.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <FileWarning className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">{w.warrantNumber}</span>
                        <Badge variant={STATUS_VARIANTS[w.status]}>{w.status}</Badge>
                        <Badge variant="outline">{TYPE_LABELS[w.type] ?? w.type}</Badge>
                      </div>
                      <p className="font-medium mt-0.5">{w.subject}</p>
                      {w.person && (
                        <p className="text-xs text-muted-foreground">
                          Linked: {w.person.firstName} {w.person.lastName}
                          {w.person.idNumber && ` (${w.person.idNumber})`}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Issued by {w.issuedBy.name}
                        {w.issuingMagistrate && ` · Magistrate: ${w.issuingMagistrate}`}
                        {w.expiresAt && ` · Expires ${new Date(w.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  {w.status === "ISSUED" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(w.id, "SERVED")}>Mark Served</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleStatusUpdate(w.id, "RETURNED")}>Return</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
