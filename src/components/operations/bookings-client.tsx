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
import { Search, Plus, UserX, Download, Camera, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  charges: string[];
  bailAmount: number | null;
  bailStatus: string | null;
  holdingCell: string | null;
  mugShotUrl: string | null;
  arrestedAt: string;
  releasedAt: string | null;
  createdAt: string;
  person: { id: string; firstName: string; lastName: string; idNumber: string | null; dateOfBirth: string | null };
  arrestingOfficer: { id: string; name: string; badgeNumber: string | null };
  case: { id: string; caseNumber: string; title: string } | null;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  BOOKED: "destructive",
  BAILED: "secondary",
  RELEASED: "outline",
  TRANSFERRED: "secondary",
  CHARGED: "default",
};

export function BookingsClient() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("BOOKED");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [chargesInput, setChargesInput] = useState("");
  const [form, setForm] = useState({
    personId: "",
    caseId: "",
    bailAmount: "",
    holdingCell: "",
    afisReference: "",
    arrestedAt: "",
    notes: "",
  });
  const [mugshotUploading, setMugshotUploading] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/bookings?${params}`);
      if (res.ok) {
        const data = await res.json();
        const filtered = search
          ? data.filter((b: Booking) =>
              b.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
              `${b.person.firstName} ${b.person.lastName}`.toLowerCase().includes(search.toLowerCase())
            )
          : data;
        setBookings(filtered);
      }
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCreate = async () => {
    const charges = chargesInput.split("\n").map((c) => c.trim()).filter(Boolean);
    if (!form.personId || !form.arrestedAt || charges.length === 0) {
      toast.error("Person ID, arrest time, and at least one charge are required");
      return;
    }
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          charges,
          bailAmount: form.bailAmount ? parseFloat(form.bailAmount) : undefined,
          arrestedAt: new Date(form.arrestedAt).toISOString(),
          caseId: form.caseId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      toast.success("Booking created");
      setOpen(false);
      setForm({ personId: "", caseId: "", bailAmount: "", holdingCell: "", afisReference: "", arrestedAt: "", notes: "" });
      setChargesInput("");
      fetchBookings();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create booking");
    }
  };

  const handleRelease = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RELEASED", releasedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Booking updated to Released");
      fetchBookings();
    } catch {
      toast.error("Failed to update booking");
    }
  };

  const handleMugshotUpload = async (bookingId: string, file: File) => {
    setMugshotUploading(bookingId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/bookings/${bookingId}/mugshot`, { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Mugshot uploaded");
      fetchBookings();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to upload mugshot");
    } finally {
      setMugshotUploading(null);
    }
  };

  const handleExport = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/export`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking-sheet-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export booking sheet");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by booking # or name..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="BOOKED">Booked</SelectItem>
            <SelectItem value="BAILED">Bailed</SelectItem>
            <SelectItem value="CHARGED">Charged</SelectItem>
            <SelectItem value="RELEASED">Released</SelectItem>
            <SelectItem value="TRANSFERRED">Transferred</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />New Booking
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Booking</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Person ID <span className="text-destructive">*</span></Label>
                  <Input value={form.personId} onChange={(e) => setForm((f) => ({ ...f, personId: e.target.value }))} placeholder="Person record ID" />
                </div>
                <div className="space-y-1">
                  <Label>Case ID (optional)</Label>
                  <Input value={form.caseId} onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))} placeholder="Linked case ID" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Charges (one per line) <span className="text-destructive">*</span></Label>
                <Textarea value={chargesInput} onChange={(e) => setChargesInput(e.target.value)} rows={3} placeholder="Assault&#10;Possession of illegal firearm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Arrested At <span className="text-destructive">*</span></Label>
                  <Input type="datetime-local" value={form.arrestedAt} onChange={(e) => setForm((f) => ({ ...f, arrestedAt: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Holding Cell</Label>
                  <Input value={form.holdingCell} onChange={(e) => setForm((f) => ({ ...f, holdingCell: e.target.value }))} placeholder="e.g. Cell 3A" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Bail Amount</Label>
                  <Input type="number" value={form.bailAmount} onChange={(e) => setForm((f) => ({ ...f, bailAmount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <Label>AFIS Reference</Label>
                  <Input value={form.afisReference} onChange={(e) => setForm((f) => ({ ...f, afisReference: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreate}>Create Booking</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No bookings found</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {b.mugShotUrl ? (
                      <img src={b.mugShotUrl} alt="Mugshot" className="w-12 h-14 rounded object-cover shrink-0 border" />
                    ) : (
                      <div className="w-12 h-14 rounded bg-muted flex items-center justify-center shrink-0 border">
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">{b.bookingNumber}</span>
                        <Badge variant={STATUS_VARIANTS[b.status]}>{b.status}</Badge>
                        {b.case && <Badge variant="outline" className="text-xs">{b.case.caseNumber}</Badge>}
                      </div>
                      <p className="font-medium mt-0.5 truncate">
                        {b.person.firstName} {b.person.lastName}
                        {b.person.idNumber && <span className="text-muted-foreground text-sm ml-2">({b.person.idNumber})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Arrested {new Date(b.arrestedAt).toLocaleString()}
                        {b.holdingCell && ` · Cell ${b.holdingCell}`}
                        {b.bailAmount && ` · Bail R${b.bailAmount.toLocaleString()}`}
                      </p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {b.charges.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleMugshotUpload(b.id, file);
                          e.target.value = "";
                        }}
                        disabled={mugshotUploading === b.id}
                      />
                      <Button size="sm" variant="ghost" disabled={mugshotUploading === b.id}>
                        {mugshotUploading === b.id ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleExport(b.id)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    {b.status === "BOOKED" && (
                      <Button size="sm" variant="outline" onClick={() => handleRelease(b.id)}>Release</Button>
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