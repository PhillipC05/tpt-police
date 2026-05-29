"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Plus, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  processedAt: string | null;
  paidAt: string | null;
  _count: { entries: number };
}

interface PayrollEntry {
  id: string;
  baseHours: number;
  overtimeHours: number;
  overtimeRate: number;
  allowances: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  status: string;
  user: { id: string; name: string; badgeNumber: string; department: string | null };
}

export function PayrollClient() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodEntries, setSelectedPeriodEntries] = useState<PayrollEntry[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [newPeriod, setNewPeriod] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  const fetchPeriods = async () => {
    try {
      const res = await fetch("/api/hr/payroll");
      if (res.ok) setPeriods(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEntries = async (periodId: string) => {
    try {
      const res = await fetch(`/api/hr/payroll?periodId=${periodId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPeriodEntries(data);
        setSelectedPeriodId(periodId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPeriods().finally(() => setLoading(false));
  }, []);

  const createPeriod = async () => {
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPeriod,
          startDate: new Date(newPeriod.startDate).toISOString(),
          endDate: new Date(newPeriod.endDate).toISOString(),
        }),
      });
      if (res.ok) {
        toast.success("Payroll period created");
        setCreateOpen(false);
        setNewPeriod({ name: "", startDate: "", endDate: "" });
        fetchPeriods();
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Failed to create period");
      }
    } catch {
      toast.error("Failed to create period");
    }
  };

  const updatePeriodStatus = async (periodId: string, action: string) => {
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, action }),
      });
      if (res.ok) {
        toast.success(`Period ${action.toLowerCase()}ed`);
        fetchPeriods();
      }
    } catch {
      toast.error("Failed to update period");
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      PROCESSED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return variants[status] ?? "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Clock className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payroll Periods</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />
            New Period
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Payroll Period</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Period Name</Label>
                <Input value={newPeriod.name} onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })} placeholder="e.g. June 2026" />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={newPeriod.startDate} onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={newPeriod.endDate} onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })} />
              </div>
              <Button onClick={createPeriod} className="w-full">Create Period</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {periods.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <DollarSign className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No payroll periods created</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {periods.map((period) => (
          <Card key={period.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">{period.name}</CardTitle>
                <Badge className={statusBadge(period.status)}>{period.status}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{period._count.entries} entries</span>
                {period.status === "PENDING" && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => updatePeriodStatus(period.id, "PROCESS")}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Process
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => updatePeriodStatus(period.id, "CANCEL")}>
                      <XCircle className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </>
                )}
                {period.status === "PROCESSED" && (
                  <Button variant="outline" size="sm" onClick={() => updatePeriodStatus(period.id, "PAY")}>
                    <DollarSign className="w-4 h-4 mr-1" /> Mark Paid
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => fetchEntries(period.id)}>
                  <Calendar className="w-4 h-4 mr-1" /> View
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPeriodId && selectedPeriodEntries.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold">Payroll Entries</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Officer</th>
                  <th className="text-right py-2 px-3">Base Hours</th>
                  <th className="text-right py-2 px-3">OT Hours</th>
                  <th className="text-right py-2 px-3">Allowances</th>
                  <th className="text-right py-2 px-3">Deductions</th>
                  <th className="text-right py-2 px-3">Gross Pay</th>
                  <th className="text-right py-2 px-3">Net Pay</th>
                  <th className="text-center py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedPeriodEntries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3">{entry.user.name}</td>
                    <td className="text-right py-2 px-3">{entry.baseHours}</td>
                    <td className="text-right py-2 px-3">{entry.overtimeHours}</td>
                    <td className="text-right py-2 px-3">${entry.allowances.toFixed(2)}</td>
                    <td className="text-right py-2 px-3">${entry.deductions.toFixed(2)}</td>
                    <td className="text-right py-2 px-3">${entry.grossPay.toFixed(2)}</td>
                    <td className="text-right py-2 px-3 font-medium">${entry.netPay.toFixed(2)}</td>
                    <td className="text-center py-2 px-3"><Badge className={statusBadge(entry.status)}>{entry.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}