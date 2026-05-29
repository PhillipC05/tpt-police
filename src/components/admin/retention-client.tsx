"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Shield, Save, Clock, Trash2, FileText, UserSquare2 } from "lucide-react";

interface RetentionPolicy {
  id: string;
  tenantId: string;
  auditLogRetentionDays: number;
  caseRetentionDays: number;
  personRecordRetention: number;
  foiaRetentionDays: number;
  autoPurgeEnabled: boolean;
}

const DEFAULTS: RetentionPolicy = {
  id: "",
  tenantId: "",
  auditLogRetentionDays: 365,
  caseRetentionDays: 2555,
  personRecordRetention: 2555,
  foiaRetentionDays: 1825,
  autoPurgeEnabled: false,
};

export function RetentionClient() {
  const [policy, setPolicy] = useState<RetentionPolicy>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purgeRunning, setPurgeRunning] = useState(false);

  const fetchPolicy = async () => {
    try {
      const res = await fetch("/api/admin/retention");
      if (res.ok) {
        const data = await res.json();
        setPolicy({ ...DEFAULTS, ...data });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/retention", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy),
      });
      if (res.ok) {
        toast.success("Retention policy saved");
        fetchPolicy();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save retention policy");
      }
    } catch {
      toast.error("Failed to save retention policy");
    } finally {
      setSaving(false);
    }
  };

  const handleRunPurge = async () => {
    if (!confirm("This will permanently delete expired records according to the retention policy. Continue?")) return;
    setPurgeRunning(true);
    try {
      const res = await fetch("/api/admin/retention/purge", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Purge complete: ${data.deleted} records removed`);
      } else {
        const err = await res.json();
        toast.error(err.message || "Purge failed");
      }
    } catch {
      toast.error("Failed to run purge");
    } finally {
      setPurgeRunning(false);
    }
  };

  const daysToYears = (days: number) => (days / 365).toFixed(1);
  const yearsToDays = (years: number) => Math.round(years * 365);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading retention policy...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Data Retention Policy
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure how long different types of data are retained. Expired records can be permanently purged.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Retention Periods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Audit Logs
                </Label>
                <p className="text-xs text-muted-foreground">
                  System audit trail and activity logs
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={policy.auditLogRetentionDays}
                  onChange={(e) => setPolicy({ ...policy, auditLogRetentionDays: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                  min={30}
                  max={3650}
                />
                <span className="text-sm text-muted-foreground w-20">days ({daysToYears(policy.auditLogRetentionDays)} yr)</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Cases
                </Label>
                <p className="text-xs text-muted-foreground">
                  Criminal case records including notes and evidence references
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={policy.caseRetentionDays}
                  onChange={(e) => setPolicy({ ...policy, caseRetentionDays: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                  min={365}
                  max={7300}
                />
                <span className="text-sm text-muted-foreground w-20">days ({daysToYears(policy.caseRetentionDays)} yr)</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <UserSquare2 className="w-4 h-4 text-muted-foreground" />
                  Person Records
                </Label>
                <p className="text-xs text-muted-foreground">
                  Suspects, witnesses, victims, and persons of interest
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={policy.personRecordRetention}
                  onChange={(e) => setPolicy({ ...policy, personRecordRetention: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                  min={365}
                  max={7300}
                />
                <span className="text-sm text-muted-foreground w-20">days ({daysToYears(policy.personRecordRetention)} yr)</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  FOIA Requests
                </Label>
                <p className="text-xs text-muted-foreground">
                  Freedom of Information request records and responses
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={policy.foiaRetentionDays}
                  onChange={(e) => setPolicy({ ...policy, foiaRetentionDays: parseInt(e.target.value) || 0 })}
                  className="w-20 text-center"
                  min={365}
                  max={3650}
                />
                <span className="text-sm text-muted-foreground w-20">days ({daysToYears(policy.foiaRetentionDays)} yr)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Auto-Purge Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Automatic Purge</Label>
              <p className="text-xs text-muted-foreground">
                Automatically delete records that exceed their retention period
              </p>
            </div>
            <Switch
              checked={policy.autoPurgeEnabled}
              onCheckedChange={(checked) => setPolicy({ ...policy, autoPurgeEnabled: checked })}
            />
          </div>
          {policy.autoPurgeEnabled && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠ Automatic purge is enabled. Expired records will be permanently deleted without manual review.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Policy"}
        </Button>
        <Button variant="outline" onClick={handleRunPurge} disabled={purgeRunning}>
          <Trash2 className="w-4 h-4 mr-2" />
          {purgeRunning ? "Purging..." : "Run Manual Purge Now"}
        </Button>
      </div>
    </div>
  );
}