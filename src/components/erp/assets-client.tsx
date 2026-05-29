"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Box, Plus, Search, UserCheck, RotateCcw, QrCode } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  qrCode: string | null;
  status: string;
  notes: string | null;
  purchasedAt: string | null;
  issuances: Array<{ id: string; user: { id: string; name: string; badgeNumber: string | null }; returnedAt: string | null }>;
}

export function AssetsClient() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [staff, setStaff] = useState<Array<{ id: string; name: string; badgeNumber: string | null }>>([]);

  const fetchAssets = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/erp/assets?${params}`);
      if (res.ok) setAssets(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/hr/staff");
      if (res.ok) setStaff(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchAssets();
    fetchStaff();
  }, [statusFilter, search]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/erp/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      if (res.ok) {
        toast.success("Asset added");
        setAddDialogOpen(false);
        fetchAssets();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to add asset");
      }
    } catch {
      toast.error("Failed to add asset");
    }
  };

  const handleIssue = async (userId: string, condition?: string) => {
    if (!selectedAsset || !userId) return;
    try {
      const res = await fetch("/api/erp/assets/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: selectedAsset, userId, condition }),
      });
      if (res.ok) {
        toast.success("Asset issued");
        setIssueDialogOpen(false);
        fetchAssets();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to issue asset");
      }
    } catch {
      toast.error("Failed to issue asset");
    }
  };

  const handleReturn = async (issuanceId: string) => {
    try {
      const res = await fetch("/api/erp/assets/issue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: issuanceId }),
      });
      if (res.ok) {
        toast.success("Asset returned");
        fetchAssets();
      }
    } catch {
      toast.error("Failed to return asset");
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "AVAILABLE": return "secondary" as const;
      case "ISSUED": return "default" as const;
      case "MAINTENANCE": return "destructive" as const;
      case "DECOMMISSIONED": return "outline" as const;
      case "LOST": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading assets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="ISSUED">Issued</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Glock 17" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" required placeholder="e.g. Weapon, Radio, Uniform" />
              </div>
              <div>
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input id="serialNumber" name="serialNumber" placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="purchasedAt">Purchase Date</Label>
                <Input id="purchasedAt" name="purchasedAt" type="datetime-local" />
              </div>
              <Button type="submit" className="w-full">Add Asset</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assets.length === 0 ? (
          <Card className="md:col-span-3">
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No assets found</p>
            </CardContent>
          </Card>
        ) : assets.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm">{a.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{a.category}{a.serialNumber ? ` · ${a.serialNumber}` : ""}</p>
                </div>
                <Badge variant={statusColor(a.status)}>{a.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-2">
                {a.qrCode && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <QrCode className="w-3 h-3" />
                    {a.qrCode}
                  </div>
                )}
                {a.purchasedAt && <p>Purchased: {new Date(a.purchasedAt).toLocaleDateString()}</p>}
                {a.notes && <p>{a.notes}</p>}
                {a.issuances.length > 0 && (
                  <div>
                    <p className="font-medium mb-1">Currently issued to:</p>
                    {a.issuances.map((iss) => (
                      <div key={iss.id} className="flex items-center justify-between">
                        <span>{iss.user.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleReturn(iss.id)}>
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Return
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {a.status === "AVAILABLE" && (
                  <Dialog open={issueDialogOpen && selectedAsset === a.id} onOpenChange={(open) => { setIssueDialogOpen(open); setSelectedAsset(open ? a.id : null); }}>
                    <DialogTrigger render={<Button size="sm" className="w-full mt-2" />}>
                      <UserCheck className="w-3 h-3 mr-1" />
                      Issue
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Issue Asset: {a.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Issue To</Label>
                          <Select onValueChange={(userId: string | null) => { if (userId) handleIssue(userId, "Good"); }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select officer" />
                            </SelectTrigger>
                            <SelectContent>
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.badgeNumber ?? "N/A"})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}