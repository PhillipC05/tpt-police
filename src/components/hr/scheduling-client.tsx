"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Plus, Users, ArrowLeftRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Shift {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  assignments: Array<{
    id: string;
    isOvertime: boolean;
    notes: string | null;
    user: { id: string; name: string; badgeNumber: string; role: string };
  }>;
}

interface StaffMember {
  id: string;
  name: string;
  badgeNumber: string | null;
  role: string;
}

export function SchedulingClient() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string>("");

  const [newShift, setNewShift] = useState({
    name: "",
    type: "MORNING",
    startDate: "",
    endDate: "",
  });

  const [swapData, setSwapData] = useState({
    targetUserId: "",
    reason: "",
  });

  const fetchShifts = async () => {
    try {
      const res = await fetch("/api/hr/shifts");
      if (res.ok) setShifts(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/hr/staff");
      if (res.ok) setStaff(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    Promise.all([fetchShifts(), fetchStaff()]).finally(() => setLoading(false));
  }, []);

  const createShift = async () => {
    try {
      const res = await fetch("/api/hr/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newShift,
          startDate: new Date(newShift.startDate).toISOString(),
          endDate: new Date(newShift.endDate).toISOString(),
        }),
      });
      if (res.ok) {
        toast.success("Shift created");
        setCreateOpen(false);
        setNewShift({ name: "", type: "MORNING", startDate: "", endDate: "" });
        fetchShifts();
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Failed to create shift");
      }
    } catch {
      toast.error("Failed to create shift");
    }
  };

  const assignOfficer = async (shiftId: string, userId: string, isOvertime = false) => {
    try {
      const res = await fetch("/api/hr/shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId, userId, isOvertime }),
      });
      if (res.ok) {
        toast.success(isOvertime ? "Overtime assigned" : "Officer assigned");
        fetchShifts();
      }
    } catch {
      toast.error("Failed to assign officer");
    }
  };

  const removeShift = async (id: string) => {
    try {
      const res = await fetch(`/api/hr/shifts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Shift deleted");
        fetchShifts();
      }
    } catch {
      toast.error("Failed to delete shift");
    }
  };

  const requestSwap = async () => {
    if (!selectedShift || !swapData.targetUserId) {
      toast.error("Select a shift and target officer");
      return;
    }
    try {
      const res = await fetch("/api/hr/shifts/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: selectedShift, ...swapData }),
      });
      if (res.ok) {
        toast.success("Swap request sent");
        setSwapOpen(false);
        setSwapData({ targetUserId: "", reason: "" });
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Failed to request swap");
      }
    } catch {
      toast.error("Failed to request swap");
    }
  };

  const typeColors: Record<string, string> = {
    MORNING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    AFTERNOON: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    NIGHT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    CUSTOM: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Clock className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Shift Management</h2>
        <div className="flex gap-2">
          <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
            <DialogTrigger render={<Button variant="outline" />}>
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Request Swap
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Shift Swap</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Select Shift</Label>
                  <Select value={selectedShift} onValueChange={(v: string | null) => setSelectedShift(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                    <SelectContent>
                      {shifts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({new Date(s.startTime).toLocaleDateString()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Swap With</Label>
                  <Select value={swapData.targetUserId} onValueChange={(v: string | null) => setSwapData({ ...swapData, targetUserId: v ?? "" })}>
                    <SelectTrigger><SelectValue placeholder="Select officer" /></SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.badgeNumber ?? "N/A"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reason (optional)</Label>
                  <Input value={swapData.reason} onChange={(e) => setSwapData({ ...swapData, reason: e.target.value })} placeholder="Reason for swap" />
                </div>
                <Button onClick={requestSwap} className="w-full">Submit Swap Request</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="w-4 h-4 mr-2" />
              Create Shift
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Shift</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Shift Name</Label>
                  <Input value={newShift.name} onChange={(e) => setNewShift({ ...newShift, name: e.target.value })} placeholder="e.g. Monday Patrol Alpha" />
                </div>
                <div>
                  <Label>Shift Type</Label>
                  <Select value={newShift.type} onValueChange={(v: string | null) => setNewShift({ ...newShift, type: v ?? "MORNING" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MORNING">Morning</SelectItem>
                      <SelectItem value="AFTERNOON">Afternoon</SelectItem>
                      <SelectItem value="NIGHT">Night</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date & Time</Label>
                  <Input type="datetime-local" value={newShift.startDate} onChange={(e) => setNewShift({ ...newShift, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>End Date & Time</Label>
                  <Input type="datetime-local" value={newShift.endDate} onChange={(e) => setNewShift({ ...newShift, endDate: e.target.value })} />
                </div>
                <Button onClick={createShift} className="w-full">Create Shift</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {shifts.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No shifts scheduled</p>
              </div>
            </CardContent>
          </Card>
        )}

        {shifts.map((shift) => (
          <Card key={shift.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">{shift.name}</CardTitle>
                <Badge className={typeColors[shift.type] ?? typeColors.CUSTOM}>{shift.type}</Badge>
                {shift.assignments.some((a) => a.isOvertime) && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Overtime
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={(userId: string | null) => assignOfficer(shift.id, userId ?? "")}>
                  <SelectTrigger className="w-[180px]">
                    <Users className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Assign officer" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeShift(shift.id)}>Remove</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(shift.startTime).toLocaleDateString()} - {new Date(shift.endTime).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(shift.startTime).toLocaleTimeString()} - {new Date(shift.endTime).toLocaleTimeString()}
                </span>
              </div>

              {shift.assignments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {shift.assignments.map((a) => (
                    <Badge key={a.id} variant={a.isOvertime ? "destructive" : "secondary"} className="text-xs">
                      {a.user.name}
                      {a.isOvertime && " (OT)"}
                      {a.notes && ` - ${a.notes}`}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No officers assigned yet</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}