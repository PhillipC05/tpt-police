"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Users, BadgeCheck, FileText } from "lucide-react";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  badgeNumber: string | null;
  rank: string | null;
  department: string | null;
  phone: string | null;
  photoUrl: string | null;
  createdAt: string;
  _count: { assignedCases: number };
}

const ROLE_LABELS: Record<string, string> = {
  DETECTIVE: "Detective",
  OFFICER: "Officer",
  DISPATCHER: "Dispatcher",
  PRECINCT_ADMIN: "Precinct Admin",
};

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  SUSPENDED: "destructive",
  ON_LEAVE: "outline",
};

export function StaffDirectoryClient() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "OFFICER",
    badgeNumber: "",
    rank: "",
    department: "",
    phone: "",
  });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/hr/staff?${params}`);
      if (res.ok) {
        setStaff(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/hr/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("Staff member created");
        setOpen(false);
        setFormData({ name: "", email: "", role: "OFFICER", badgeNumber: "", rank: "", department: "", phone: "" });
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.message ?? "Failed to create staff");
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
            <CardTitle className="text-lg">Staff Directory</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button variant="default" />}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Staff
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Staff Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Badge Number</Label>
                      <Input value={formData.badgeNumber ?? ""} onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })} />
                    </div>
                    <div>
                      <Label>Rank</Label>
                      <Input value={formData.rank ?? ""} onChange={(e) => setFormData({ ...formData, rank: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Department</Label>
                      <Input value={formData.department ?? ""} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={formData.phone ?? ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                    <Button onClick={handleCreate}>Create Staff</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or badge number..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading staff...</div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No staff members found</div>
          ) : (
            <div className="divide-y">
              {staff.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        {member.rank && <span className="text-xs text-muted-foreground">({member.rank})</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {member.badgeNumber && (
                          <span className="flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" />#{member.badgeNumber}
                          </span>
                        )}
                        {member.department && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />{member.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={(STATUS_VARIANTS[member.status] as "default" | "secondary" | "destructive" | "outline") ?? "outline"}>
                      {member.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{ROLE_LABELS[member.role] ?? member.role}</span>
                    <span className="text-xs text-muted-foreground">{member._count.assignedCases} cases</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}