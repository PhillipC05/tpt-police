"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DollarSign, Plus, TrendingUp, PieChart, FileText, Download } from "lucide-react";

interface BudgetItem {
  id: string;
  financialYear: string;
  category: string;
  totalAmount: number;
  spentAmount: number;
  _count: { purchaseOrders: number };
}

interface PurchaseOrder {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  vendor: string | null;
  status: string;
  budget: { financialYear: string; category: string } | null;
  createdAt: string;
}

export function BudgetClient() {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"budgets" | "orders">("budgets");
  const [yearFilter, setYearFilter] = useState("all");
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const yearParam = yearFilter !== "all" ? `?financialYear=${yearFilter}` : "";
      const [budgetsRes, ordersRes] = await Promise.all([
        fetch(`/api/erp/budget${yearParam}`),
        fetch(`/api/erp/budget?type=purchase-orders${yearParam}`),
      ]);
      if (budgetsRes.ok) setBudgets(await budgetsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [yearFilter]);

  const handleAddBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/erp/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financialYear: form.get("financialYear"),
          category: form.get("category"),
          totalAmount: parseFloat(form.get("totalAmount") as string),
        }),
      });
      if (res.ok) {
        toast.success("Budget created");
        setBudgetDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create budget");
      }
    } catch {
      toast.error("Failed to create budget");
    }
  };

  const handleAddOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/erp/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _type: "purchase-order",
          budgetId: form.get("budgetId") || undefined,
          title: form.get("title"),
          description: form.get("description") || undefined,
          amount: parseFloat(form.get("amount") as string),
          vendor: form.get("vendor") || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Purchase order created");
        setOrderDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to create purchase order");
      }
    } catch {
      toast.error("Failed to create purchase order");
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "DRAFT": return "secondary" as const;
      case "SUBMITTED": return "default" as const;
      case "APPROVED": return "secondary" as const;
      case "REJECTED": return "destructive" as const;
      case "COMPLETED": return "outline" as const;
      default: return "secondary" as const;
    }
  };

  const budgetUtilization = (budget: BudgetItem) => {
    return budget.totalAmount > 0 ? (budget.spentAmount / budget.totalAmount) * 100 : 0;
  };

  const years = Array.from(new Set(budgets.map((b) => b.financialYear))).sort();

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading budget data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("budgets")}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === "budgets" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            Budget Overview
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === "orders" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground"
            }`}
          >
            Purchase Orders
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={yearFilter} onValueChange={(v: string | null) => setYearFilter(v ?? "all")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeTab === "budgets" ? (
            <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="w-4 h-4 mr-2" />
                New Budget
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Budget</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddBudget} className="space-y-4">
                  <div>
                    <Label htmlFor="financialYear">Financial Year</Label>
                    <Input id="financialYear" name="financialYear" required placeholder="e.g. 2025-2026" />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" name="category" required placeholder="e.g. Equipment, Operations" />
                  </div>
                  <div>
                    <Label htmlFor="totalAmount">Total Amount ($)</Label>
                    <Input id="totalAmount" name="totalAmount" type="number" step="0.01" required />
                  </div>
                  <Button type="submit" className="w-full">Create Budget</Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="w-4 h-4 mr-2" />
                New Purchase Order
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddOrder} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" required />
                  </div>
                  <div>
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input id="vendor" name="vendor" />
                  </div>
                  <div>
                    <Label htmlFor="budgetId">Budget (optional)</Label>
                    <Select name="budgetId">
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgets.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.financialYear} - {b.category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Create Purchase Order</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {activeTab === "budgets" ? (
        budgets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No budgets created</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {budgets.map((b) => {
                const util = budgetUtilization(b);
                return (
                  <Card key={b.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm">{b.category}</CardTitle>
                          <p className="text-xs text-muted-foreground">{b.financialYear}</p>
                        </div>
                        <Badge variant={util > 90 ? "destructive" : util > 75 ? "default" : "secondary"}>
                          {util.toFixed(0)}% used
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-medium">${b.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spent</span>
                          <span className="font-medium">${b.spentAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className="font-medium">${(b.totalAmount - b.spentAmount).toLocaleString()}</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              util > 90 ? "bg-destructive" : util > 75 ? "bg-amber-500" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(util, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{b._count.purchaseOrders} purchase orders</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )
      ) : (
        orders.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">No purchase orders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Card key={o.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{o.title}</span>
                        <Badge variant={statusColor(o.status)}>{o.status}</Badge>
                      </div>
                      {o.description && (
                        <p className="text-sm text-muted-foreground">{o.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        ${o.amount.toLocaleString()}{o.vendor ? ` · ${o.vendor}` : ""}
                        {o.budget ? ` · ${o.budget.financialYear} - ${o.budget.category}` : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}