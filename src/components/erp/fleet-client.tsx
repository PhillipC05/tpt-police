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
import { Truck, Plus, Search, Fuel, AlertTriangle } from "lucide-react";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate: string;
  vin: string | null;
  status: string;
  colour: string | null;
  mileage: number | null;
  nextServiceAt: string | null;
  assignments: Array<{ id: string; user: { id: string; name: string; badgeNumber: string | null }; returnedAt: string | null }>;
  maintenance: Array<{ id: string; description: string; performedAt: string; cost: number | null }>;
}

export function FleetClient() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"inventory" | "fuel" | "incidents">("inventory");

  const fetchVehicles = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/erp/fleet?${params}`);
      if (res.ok) setVehicles(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter, search]);

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      make: form.get("make") as string,
      model: form.get("model") as string,
      year: parseInt(form.get("year") as string),
      plate: form.get("plate") as string,
      vin: form.get("vin") as string || undefined,
      colour: form.get("colour") as string || undefined,
      mileage: form.get("mileage") ? parseInt(form.get("mileage") as string) : undefined,
    };

    try {
      const res = await fetch("/api/erp/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Vehicle added");
        setVehicleDialogOpen(false);
        fetchVehicles();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to add vehicle");
      }
    } catch {
      toast.error("Failed to add vehicle");
    }
  };

  const handleAddFuel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      vehicleId: selectedVehicle!,
      litres: parseFloat(form.get("litres") as string),
      cost: parseFloat(form.get("cost") as string),
      odometer: form.get("odometer") ? parseInt(form.get("odometer") as string) : undefined,
    };

    try {
      const res = await fetch("/api/erp/fleet/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Fuel log added");
        setFuelDialogOpen(false);
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to add fuel log");
      }
    } catch {
      toast.error("Failed to add fuel log");
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "AVAILABLE": return "secondary" as const;
      case "ASSIGNED": return "default" as const;
      case "MAINTENANCE": return "destructive" as const;
      case "DECOMMISSIONED": return "outline" as const;
      default: return "secondary" as const;
    }
  };

  const tabs = [
    { id: "inventory" as const, label: "Vehicle Inventory", icon: Truck },
    { id: "fuel" as const, label: "Fuel Logs", icon: Fuel },
    { id: "incidents" as const, label: "Vehicle Incidents", icon: AlertTriangle },
  ];

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading fleet data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "inventory" && (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicles..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(v: string | null) => setStatusFilter(v ?? "all")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Vehicle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddVehicle} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="make">Make</Label>
                      <Input id="make" name="make" required placeholder="e.g. Ford" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" name="model" required placeholder="e.g. Explorer" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input id="year" name="year" type="number" required placeholder="2024" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plate">Plate</Label>
                      <Input id="plate" name="plate" required placeholder="ABC-123" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vin">VIN</Label>
                      <Input id="vin" name="vin" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="colour">Colour</Label>
                      <Input id="colour" name="colour" placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Mileage (km)</Label>
                      <Input id="mileage" name="mileage" type="number" placeholder="Optional" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">Add Vehicle</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.length === 0 ? (
              <Card className="md:col-span-3">
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">No vehicles found</p>
                </CardContent>
              </Card>
            ) : vehicles.map((v) => (
              <Card key={v.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm">{v.make} {v.model}</CardTitle>
                      <p className="text-xs text-muted-foreground">{v.year} · {v.plate}</p>
                    </div>
                    <Badge variant={statusColor(v.status)}>{v.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {v.vin && <p>VIN: {v.vin}</p>}
                  {v.colour && <p>Colour: {v.colour}</p>}
                  {v.mileage != null && <p>Mileage: {v.mileage.toLocaleString()} km</p>}
                  {v.nextServiceAt && <p>Service due: {new Date(v.nextServiceAt).toLocaleDateString()}</p>}
                  {v.assignments.length > 0 && (
                    <p>Assigned to: {v.assignments.map((a) => a.user.name).join(", ")}</p>
                  )}
                  {v.maintenance.length > 0 && (
                    <p>Last maintenance: {new Date(v.maintenance[0].performedAt).toLocaleDateString()}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {activeTab === "fuel" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Select value={selectedVehicle ?? ""} onValueChange={(v: string | null) => setSelectedVehicle(v)}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.plate} - {v.make} {v.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={fuelDialogOpen} onOpenChange={setFuelDialogOpen}>
              <DialogTrigger render={<Button disabled={!selectedVehicle} />}>
                <Fuel className="w-4 h-4 mr-2" />
                Add Fuel Log
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Fuel Log</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddFuel} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="litres">Litres</Label>
                    <Input id="litres" name="litres" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost ($)</Label>
                    <Input id="cost" name="cost" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="odometer">Odometer (km)</Label>
                    <Input id="odometer" name="odometer" type="number" placeholder="Optional" />
                  </div>
                  <Button type="submit" className="w-full">Add Entry</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {!selectedVehicle ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Select a vehicle to view fuel logs</p>
              </CardContent>
            </Card>
          ) : (
            <FuelLogList vehicleId={selectedVehicle} />
          )}
        </div>
      )}

      {activeTab === "incidents" && (
        <div className="space-y-4">
          <VehicleIncidentList vehicles={vehicles} />
        </div>
      )}
    </div>
  );
}

function FuelLogList({ vehicleId }: { vehicleId: string }) {
  const [logs, setLogs] = useState<Array<{ id: string; litres: number; cost: number; odometer: number | null; filledAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/erp/fleet/fuel?vehicleId=${vehicleId}`)
      .then((res) => res.json())
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [vehicleId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading fuel logs...</p>;

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground">No fuel logs for this vehicle</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Fuel Log History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
              <span>{new Date(log.filledAt).toLocaleDateString()}</span>
              <span>{log.litres.toFixed(1)} L</span>
              <span>${log.cost.toFixed(2)}</span>
              {log.odometer && <span>{log.odometer.toLocaleString()} km</span>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleIncidentList({ vehicles }: { vehicles: Vehicle[] }) {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Array<{ id: string; description: string; incidentDate: string; severity: string; cost: number | null; resolved: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!selectedVehicle) return;
    setLoading(true);
    fetch(`/api/erp/fleet/incidents?vehicleId=${selectedVehicle}`)
      .then((res) => res.json())
      .then(setIncidents)
      .finally(() => setLoading(false));
  }, [selectedVehicle]);

  const handleAddIncident = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = {
      vehicleId: selectedVehicle!,
      description: form.get("description") as string,
      severity: form.get("severity") as string,
      cost: form.get("cost") ? parseFloat(form.get("cost") as string) : undefined,
    };

    try {
      const res = await fetch("/api/erp/fleet/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Incident recorded");
        setDialogOpen(false);
        if (selectedVehicle) {
          const r = await fetch(`/api/erp/fleet/incidents?vehicleId=${selectedVehicle}`);
          setIncidents(await r.json());
        }
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to record incident");
      }
    } catch {
      toast.error("Failed to record incident");
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch("/api/erp/fleet/incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resolved: true }),
      });
      if (res.ok) {
        toast.success("Incident resolved");
        if (selectedVehicle) {
          const r = await fetch(`/api/erp/fleet/incidents?vehicleId=${selectedVehicle}`);
          setIncidents(await r.json());
        }
      }
    } catch {
      toast.error("Failed to resolve incident");
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "LOW": return "secondary" as const;
      case "MEDIUM": return "default" as const;
      case "HIGH": return "destructive" as const;
      case "CRITICAL": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={selectedVehicle ?? ""} onValueChange={(v: string | null) => setSelectedVehicle(v)}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select vehicle" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.plate} - {v.make} {v.model}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button disabled={!selectedVehicle} />}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Report Incident
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Vehicle Incident</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddIncident} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select name="severity" defaultValue="MEDIUM">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost ($)</Label>
                <Input id="cost" name="cost" type="number" step="0.01" placeholder="Optional" />
              </div>
              <Button type="submit" className="w-full">Report Incident</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!selectedVehicle ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Select a vehicle to view incidents</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading incidents...</p>
      ) : incidents.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No incidents recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <Card key={inc.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={severityColor(inc.severity)}>{inc.severity}</Badge>
                      <Badge variant={inc.resolved ? "outline" : "secondary"}>
                        {inc.resolved ? "Resolved" : "Open"}
                      </Badge>
                    </div>
                    <p className="text-sm mt-2">{inc.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inc.incidentDate).toLocaleDateString()}
                      {inc.cost != null && ` · $${inc.cost.toFixed(2)}`}
                    </p>
                  </div>
                  {!inc.resolved && (
                    <Button variant="outline" size="sm" onClick={() => handleResolve(inc.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}