"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface UofFReport {
  id: string;
  forceTypes: string[];
  narrative: string;
  incidentDate: string;
  officerInjured: boolean;
  subjectInjured: boolean;
  status: string;
  createdAt: string;
  officer: { id: string; name: string; badgeNumber: string | null };
  supervisor: { id: string; name: string; badgeNumber: string | null } | null;
}

const FORCE_TYPES = ["VERBAL", "PHYSICAL", "RESTRAINT", "CEW", "FIREARM", "OTHER"];
const FORCE_LABELS: Record<string, string> = {
  VERBAL: "Verbal",
  PHYSICAL: "Physical",
  RESTRAINT: "Restraint",
  CEW: "CEW / Taser",
  FIREARM: "Firearm",
  OTHER: "Other",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SUBMITTED: "outline",
  UNDER_REVIEW: "default",
  REVIEWED: "secondary",
  ESCALATED: "destructive",
};

export function UseOfForceClient({ userRole }: { userRole: string }) {
  const [reports, setReports] = useState<UofFReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState("REVIEWED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [form, setForm] = useState({
    forceTypes: [] as string[],
    narrative: "",
    incidentDate: "",
    subjectResistance: "",
    officerInjured: false,
    subjectInjured: false,
  });

  const canReview = ["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(userRole);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/use-of-force");
      if (res.ok) setReports(await res.json());
    } catch {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const toggleForceType = (type: string) => {
    setForm((f) => ({
      ...f,
      forceTypes: f.forceTypes.includes(type)
        ? f.forceTypes.filter((t) => t !== type)
        : [...f.forceTypes, type],
    }));
  };

  const handleSubmit = async () => {
    if (!form.forceTypes.length || !form.narrative || !form.incidentDate) {
      toast.error("Force type, narrative, and incident date are required");
      return;
    }
    try {
      const res = await fetch("/api/use-of-force", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          incidentDate: new Date(form.incidentDate).toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Use of force report submitted");
      setOpen(false);
      setForm({ forceTypes: [], narrative: "", incidentDate: "", subjectResistance: "", officerInjured: false, subjectInjured: false });
      fetchReports();
    } catch {
      toast.error("Failed to submit report");
    }
  };

  const handleReview = async () => {
    if (!reviewId) return;
    try {
      const res = await fetch(`/api/use-of-force/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, supervisorNotes: reviewNotes }),
      });
      if (!res.ok) throw new Error();
      toast.success("Review submitted");
      setReviewId(null);
      setReviewNotes("");
      fetchReports();
    } catch {
      toast.error("Failed to submit review");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />
            Submit Report
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Use of Force Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Force Types Used (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {FORCE_TYPES.map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={`ft-${type}`}
                        checked={form.forceTypes.includes(type)}
                        onCheckedChange={() => toggleForceType(type)}
                      />
                      <Label htmlFor={`ft-${type}`} className="font-normal">{FORCE_LABELS[type]}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Incident Date &amp; Time</Label>
                <Input type="datetime-local" value={form.incidentDate} onChange={(e) => setForm((f) => ({ ...f, incidentDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Subject Resistance Level</Label>
                <Input value={form.subjectResistance} onChange={(e) => setForm((f) => ({ ...f, subjectResistance: e.target.value }))} placeholder="e.g. Passive, Active, Assaultive" />
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="off-inj" checked={form.officerInjured} onCheckedChange={(v) => setForm((f) => ({ ...f, officerInjured: !!v }))} />
                  <Label htmlFor="off-inj" className="font-normal">Officer injured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="sub-inj" checked={form.subjectInjured} onCheckedChange={(v) => setForm((f) => ({ ...f, subjectInjured: !!v }))} />
                  <Label htmlFor="sub-inj" className="font-normal">Subject injured</Label>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Narrative</Label>
                <Textarea value={form.narrative} onChange={(e) => setForm((f) => ({ ...f, narrative: e.target.value }))} rows={4} placeholder="Describe the incident and use of force in detail..." />
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleSubmit}>Submit Report</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No use of force reports found</div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 mt-1 text-yellow-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_VARIANTS[r.status]}>{r.status.replace(/_/g, " ")}</Badge>
                        {r.forceTypes.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">{FORCE_LABELS[t] ?? t}</Badge>
                        ))}
                        {(r.officerInjured || r.subjectInjured) && (
                          <Badge variant="destructive" className="text-xs">Injuries Reported</Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1">Officer: {r.officer.name} ({r.officer.badgeNumber ?? "—"})</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.incidentDate).toLocaleString()}
                        {r.supervisor && ` · Reviewed by ${r.supervisor.name}`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.narrative}</p>
                    </div>
                  </div>
                  {canReview && r.status === "SUBMITTED" && (
                    <Button size="sm" variant="outline" onClick={() => setReviewId(r.id)}>Review</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!reviewId} onOpenChange={(v) => !v && setReviewId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supervisor Review</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Decision</Label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REVIEWED">Reviewed — No Further Action</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review — Pending Investigation</SelectItem>
                  <SelectItem value="ESCALATED">Escalated — Requires Investigation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewId(null)}>Cancel</Button>
              <Button onClick={handleReview}>Submit Review</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
