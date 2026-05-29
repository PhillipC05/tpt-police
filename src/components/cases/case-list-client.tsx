"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FolderOpen, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  assignments: Array<{ user: { id: string; name: string; badgeNumber: string | null } }>;
  _count: { evidence: number; persons: number; notes: number };
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  ACTIVE: "Active",
  REVIEW: "Review",
  PROSECUTION: "Prosecution",
  CLOSED: "Closed",
};

const STATUS_VARIANTS: Record<string, string> = {
  OPEN: "outline",
  ACTIVE: "default",
  REVIEW: "secondary",
  PROSECUTION: "destructive",
  CLOSED: "secondary",
};

const CASE_TYPE_LABELS: Record<string, string> = {
  THEFT: "Theft", ASSAULT: "Assault", HOMICIDE: "Homicide", FRAUD: "Fraud",
  DRUG_OFFENCE: "Drug Offence", CYBERCRIME: "Cybercrime", DOMESTIC_VIOLENCE: "Domestic Violence",
  MISSING_PERSON: "Missing Person", TRAFFIC: "Traffic", PUBLIC_ORDER: "Public Order", OTHER: "Other",
};

export function CaseListClient() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "THEFT" as string,
    title: "",
    description: "",
    location: "",
    incidentDate: "",
  });

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/cases?${params}`);
      if (res.ok) setCases(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          incidentDate: formData.incidentDate ? new Date(formData.incidentDate).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        toast.success("Case created");
        setOpen(false);
        setFormData({ type: "THEFT", title: "", description: "", location: "", incidentDate: "" });
        fetchCases();
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Failed to create case");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Case List</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button variant="default" />}>
                <Plus className="w-4 h-4 mr-2" />
                New Case
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create New Case</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Case Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                  </div>
                  <div>
                    <Label>Incident Date</Label>
                    <Input type="date" value={formData.incidentDate} onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button onClick={handleCreate}>Create Case</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by case number, title, or description..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No cases found</div>
          ) : (
            <div className="divide-y">
              {cases.map((c) => (
                <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 rounded-lg transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{c.caseNumber}</span>
                      <span className="text-sm text-muted-foreground">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 ml-6">
                      <span>{CASE_TYPE_LABELS[c.type] ?? c.type}</span>
                      <span>{c._count.evidence} evidence</span>
                      <span>{c._count.persons} persons</span>
                      {c.assignments.map((a) => (
                        <span key={a.user.id}>{a.user.name}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(STATUS_VARIANTS[c.status] as "default" | "secondary" | "destructive" | "outline") ?? "outline"}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}