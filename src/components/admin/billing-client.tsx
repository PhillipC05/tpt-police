"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, Plus, DollarSign, Users, HardDrive } from "lucide-react";

interface Subscription {
  id: string;
  tenantId: string;
  plan: string;
  billingCycle: string;
  amount: number;
  activeUsers: number;
  storageLimit: string;
  status: string;
  startDate: string;
  endDate: string | null;
  tenant: { id: string; name: string; type: string };
}

interface Tenant {
  id: string;
  name: string;
  type: string;
}

export function BillingClient() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [subsRes, tenantsRes] = await Promise.all([
        fetch("/api/admin/billing"),
        fetch("/api/admin/tenants"),
      ]);
      if (subsRes.ok) setSubscriptions(await subsRes.json());
      if (tenantsRes.ok) setTenants(await tenantsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: form.get("tenantId"),
          plan: form.get("plan"),
          billingCycle: form.get("billingCycle"),
          amount: parseFloat(form.get("amount") as string),
          activeUsers: parseInt(form.get("activeUsers") as string) || undefined,
          storageLimit: form.get("storageLimit") as string || undefined,
          startDate: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        toast.success("Subscription created");
        setDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create subscription");
      }
    } catch {
      toast.error("Failed to create subscription");
    }
  };

  const handleUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success("Subscription updated");
        fetchData();
      }
    } catch {
      toast.error("Failed to update subscription");
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "ACTIVE": return "secondary" as const;
      case "PAST_DUE": return "destructive" as const;
      case "CANCELLED": return "outline" as const;
      case "EXPIRED": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading billing data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Billing & Subscription Management</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-2" />
            New Subscription
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Subscription</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Tenant</Label>
                <Select name="tenantId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.filter((t) => !subscriptions.find((s) => s.tenantId === t.id)).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan</Label>
                <Select name="plan" defaultValue="PROFESSIONAL">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">Basic</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                    <SelectItem value="GOVERNMENT">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Billing Cycle</Label>
                <Select name="billingCycle" defaultValue="MONTHLY">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required />
              </div>
              <div>
                <Label htmlFor="activeUsers">Active Users</Label>
                <Input id="activeUsers" name="activeUsers" type="number" />
              </div>
              <div>
                <Label htmlFor="storageLimit">Storage Limit</Label>
                <Input id="storageLimit" name="storageLimit" placeholder="e.g. 10GB" />
              </div>
              <Button type="submit" className="w-full">Create Subscription</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No subscriptions yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{sub.tenant.name}</span>
                      <Badge variant="outline">{sub.tenant.type}</Badge>
                      <Badge variant={statusColor(sub.status)}>{sub.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {sub.plan} · {sub.billingCycle}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        ${sub.amount.toLocaleString()}/{sub.billingCycle === "MONTHLY" ? "mo" : "yr"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {sub.activeUsers} users
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {sub.storageLimit}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Started {new Date(sub.startDate).toLocaleDateString()}
                      {sub.endDate ? ` · Ends ${new Date(sub.endDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {sub.status === "ACTIVE" && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdate(sub.id, "CANCELLED")}>
                        Cancel
                      </Button>
                    )}
                    {sub.status === "PAST_DUE" && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdate(sub.id, "ACTIVE")}>
                        Reactivate
                      </Button>
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