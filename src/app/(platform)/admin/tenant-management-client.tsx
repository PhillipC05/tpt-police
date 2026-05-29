"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";

const tenantSchema = z.object({
  name: z.string().min(2, "Tenant name is required"),
  type: z.enum(["PROVINCE", "CITY", "PRECINCT"]),
  parentId: z.string().optional(),
});

type TenantFormData = z.infer<typeof tenantSchema>;

export function TenantManagementClient() {
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; type: string; _count: { children: number } }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) setTenants(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTenants(); }, []);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
  });

  const onSubmit = async (data: TenantFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create tenant");
      toast.success("Tenant created successfully");
      reset();
      setShowForm(false);
      fetchTenants();
    } catch {
      toast.error("Failed to create tenant");
    } finally {
      setSubmitting(false);
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "NATION": return "default";
      case "PROVINCE": return "secondary";
      case "CITY": return "outline";
      case "PRECINCT": return "destructive";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tenants</CardTitle>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit(onSubmit)} className="mb-6 p-4 border rounded-lg space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Tenant Name</Label>
                  <Input id="name" placeholder="e.g. Eastern Province" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select onValueChange={(v) => setValue("type", v as TenantFormData["type"])}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROVINCE">Province</SelectItem>
                      <SelectItem value="CITY">City</SelectItem>
                      <SelectItem value="PRECINCT">Precinct</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent ID (optional)</Label>
                  <Input id="parentId" placeholder="Parent tenant ID" {...register("parentId")} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating…" : "Create"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Children</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No tenants found</TableCell>
                </TableRow>
              ) : tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {t.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeColor(t.type) as "default" | "secondary" | "outline" | "destructive"}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{t._count.children ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}