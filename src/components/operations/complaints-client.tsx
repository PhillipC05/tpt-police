"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Scale } from "lucide-react";
import { toast } from "sonner";

interface Complaint {
  id: string;
  referenceNumber: string;
  status: string;
  outcome: string | null;
  complaintType: string;
  description: string;
  incidentDate: string;
  createdAt: string;
  complainantName: string | null;
  subjectOfficer: { id: string; name: string; badgeNumber: string | null } | null;
  assignedReviewer: { id: string; name: string } | null;
  responseNotes: string | null;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  RECEIVED: "destructive",
  ASSIGNED: "secondary",
  INVESTIGATING: "default",
  RESOLVED: "outline",
};

export function ComplaintsClient() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateOutcome, setUpdateOutcome] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/complaints/review-queue" + (statusFilter !== "all" ? `?status=${statusFilter}` : ""));
      if (res.ok) {
        const data = await res.json();
        const filtered = search
          ? data.complaints.filter((c: Complaint) =>
              c.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
              c.subjectOfficer?.name.toLowerCase().includes(search.toLowerCase()) ||
              c.complaintType.toLowerCase().includes(search.toLowerCase())
            )
          : data.complaints;
        setComplaints(filtered);
      }
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      const res = await fetch("/api/complaints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          status: updateStatus || undefined,
          outcome: updateOutcome || undefined,
          responseNotes: updateNotes || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Complaint updated");
      setSelected(null);
      setUpdateStatus("");
      setUpdateOutcome("");
      setUpdateNotes("");
      fetchComplaints();
    } catch {
      toast.error("Failed to update complaint");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search complaints..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="INVESTIGATING">Investigating</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No complaints found</div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:bg-accent/50" onClick={() => { setSelected(c); setUpdateStatus(c.status); setUpdateOutcome(c.outcome || ""); setUpdateNotes(c.responseNotes || ""); }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Scale className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{c.referenceNumber}</span>
                      <Badge variant={STATUS_VARIANTS[c.status] || "outline"}>{c.status}</Badge>
                      {c.outcome && <Badge variant="outline">{c.outcome}</Badge>}
                      <Badge variant="secondary" className="text-xs">{c.complaintType}</Badge>
                    </div>
                    <p className="text-sm mt-1 line-clamp-2">{c.description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {c.subjectOfficer && <span>Officer: {c.subjectOfficer.name}</span>}
                      {c.complainantName && <span>Complainant: {c.complainantName}</span>}
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Complaint {selected.referenceNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground">Status</Label><p>{selected.status}</p></div>
                <div><Label className="text-muted-foreground">Type</Label><p>{selected.complaintType}</p></div>
                <div><Label className="text-muted-foreground">Officer</Label><p>{selected.subjectOfficer?.name || "N/A"}</p></div>
                <div><Label className="text-muted-foreground">Complainant</Label><p>{selected.complainantName || "Anonymous"}</p></div>
                <div><Label className="text-muted-foreground">Incident Date</Label><p>{new Date(selected.incidentDate).toLocaleDateString()}</p></div>
                <div><Label className="text-muted-foreground">Reviewer</Label><p>{selected.assignedReviewer?.name || "Unassigned"}</p></div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm">{selected.description}</p>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Outcome</Label>
                <Select value={updateOutcome} onValueChange={setUpdateOutcome}>
                  <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value="SUSTAINED">Sustained</SelectItem>
                    <SelectItem value="NOT_SUSTAINED">Not Sustained</SelectItem>
                    <SelectItem value="EXONERATED">Exonerated</SelectItem>
                    <SelectItem value="UNFOUNDED">Unfounded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Response Notes</Label>
                <Textarea value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleUpdate}>Update</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}