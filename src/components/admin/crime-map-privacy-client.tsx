"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, Save } from "lucide-react";
import { toast } from "sonner";

interface PrivacySettings {
  id: string;
  tenantId: string;
  heatmapEnabled: boolean;
  showIncidentMarkers: boolean;
  anonymizeLocations: boolean;
  locationJitterKm: number;
  minIncidentsForDisplay: number;
}

export function CrimeMapPrivacyClient() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/crime-map-privacy");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        toast.error("Failed to load crime map privacy settings");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/crime-map-privacy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatmapEnabled: settings.heatmapEnabled,
          showIncidentMarkers: settings.showIncidentMarkers,
          anonymizeLocations: settings.anonymizeLocations,
          locationJitterKm: settings.locationJitterKm,
          minIncidentsForDisplay: settings.minIncidentsForDisplay,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const updated = await res.json();
      setSettings(updated);
      toast.success("Crime map privacy settings saved");
    } catch (err) {
      toast.error("Failed to save privacy settings");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5" />
          Crime Map Privacy Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure how incident data is displayed on the public crime map. These settings
          control data anonymization and visibility to protect sensitive information.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="heatmap-toggle-admin">Heatmap Overlay</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display a density heatmap of incidents on the public crime map
              </p>
            </div>
            <Switch
              id="heatmap-toggle-admin"
              checked={settings?.heatmapEnabled ?? true}
              onCheckedChange={(v) => setSettings((prev) => prev ? { ...prev, heatmapEnabled: v } : prev)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="markers-toggle">Incident Markers</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show clickable incident cluster markers on the map
              </p>
            </div>
            <Switch
              id="markers-toggle"
              checked={settings?.showIncidentMarkers ?? true}
              onCheckedChange={(v) => setSettings((prev) => prev ? { ...prev, showIncidentMarkers: v } : prev)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="anonymize-toggle">Anonymize Locations</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Apply random jitter to incident locations to prevent identifying exact addresses
              </p>
            </div>
            <Switch
              id="anonymize-toggle"
              checked={settings?.anonymizeLocations ?? true}
              onCheckedChange={(v) => setSettings((prev) => prev ? { ...prev, anonymizeLocations: v } : prev)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="jitter-km">Location Jitter (km)</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Random offset range for anonymizing locations
              </p>
              <Input
                id="jitter-km"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={settings?.locationJitterKm ?? 0.5}
                onChange={(e) => setSettings((prev) => prev ? { ...prev, locationJitterKm: parseFloat(e.target.value) || 0 } : prev)}
              />
            </div>
            <div>
              <Label htmlFor="min-incidents">Min Incidents Per Cluster</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                Minimum incidents needed before a cluster is shown
              </p>
              <Input
                id="min-incidents"
                type="number"
                min={1}
                max={100}
                step={1}
                value={settings?.minIncidentsForDisplay ?? 3}
                onChange={(e) => setSettings((prev) => prev ? { ...prev, minIncidentsForDisplay: parseInt(e.target.value) || 3 } : prev)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}