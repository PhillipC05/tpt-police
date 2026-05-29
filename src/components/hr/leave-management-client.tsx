"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface LeaveRequest {
  id: string;
  userId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  approvedById: string | null;
  createdAt: string;
  user: { id: string; name: string; badgeNumber: string | null; department: string | null };
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Annual",
  SICK: "Sick",
  MATERNITY: "Maternity",
  PATERNITY: "Paternity",
  STUDY: "Study",
  SPECIAL: "Special",
};

const STATUS_VARIANTS: Record<string, string> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

export function LeaveManagementClient() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "ANNUAL" as string,
    startDate: "",
    endDate: "",
    reason: "",
  });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/leave");
      if (res.ok) setLeaves(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/hr/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
        }),
      });
      if (res.ok) {
        toast.success("Leave request submitted");
        setOpen(false);
        setFormData({ type: "ANNUAL", startDate: "", endDate: "", reason: "" });
        fetchLeaves();
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Failed to submit leave");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/hr/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(`Leave ${status.toLowerCase()}`);
        fetchLeaves();
      } else {
        toast.error("Failed to update leave");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Leave Requests</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button variant="default" />}>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                </div>
                <div className="flex gap-2 justify-end">
                  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                  <Button onClick={handleCreate}>Submit</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No leave requests</div>
        ) : (
          <div className="divide-y">
            {leaves.map((leave) => (
              <div key={leave.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{leave.user.name}</span>
                    {leave.user.badgeNumber && <span className="text-xs text-muted-foreground">#{leave.user.badgeNumber}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{LEAVE_TYPE_LABELS[leave.type] ?? leave.type}</span>
                    <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={(STATUS_VARIANTS[leave.status] as "default" | "secondary" | "destructive" | "outline") ?? "outline"}>
                    {leave.status}
                  </Badge>
                  {leave.status === "PENDING" && (
                    <>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleStatusUpdate(leave.id, "APPROVED")}>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleStatusUpdate(leave.id, "REJECTED")}>
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}