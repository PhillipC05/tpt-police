"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, AlertTriangle, Users, Baby, FileText } from "lucide-react";
import type { ThreatLevel } from "@prisma/client";

interface ScanConfig {
  masterEnabled: boolean;
  scanMissingPersons: boolean;
  scanActiveWarrants: boolean;
  scanGangMembers: boolean;
  minThreatLevelScan: ThreatLevel;
  minConfidence: number;
  requiresApproval: boolean;
}

interface Props {
  initialConfig: ScanConfig | null;
  canEdit: boolean;
}

const SENSITIVITY_COLORS = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-red-600 dark:text-red-400",
};

export function ScannerConfigClient({ initialConfig, canEdit }: Props) {
  const defaults: ScanConfig = {
    masterEnabled: false,
    scanMissingPersons: true,
    scanActiveWarrants: false,
    scanGangMembers: false,
    minThreatLevelScan: "NONE",
    minConfidence: 85,
    requiresApproval: false,
  };

  const [config, setConfig] = useState<ScanConfig>(initialConfig ?? defaults);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function save(patch: Partial<ScanConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/facial/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Failed to save");
        setConfig(config);
      }
    });
  }

  const toggle = (field: keyof ScanConfig, value: boolean) => {
    if (!canEdit) return;
    save({ [field]: value });
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
      )}

      <Card className={config.masterEnabled ? "border-primary/50" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${config.masterEnabled ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="font-semibold text-sm">Master Scanner Switch</p>
                <p className="text-xs text-muted-foreground">
                  {config.masterEnabled ? "Identity scanning is ACTIVE" : "Identity scanning is disabled"}
                </p>
              </div>
            </div>
            <Switch
              checked={config.masterEnabled}
              onCheckedChange={(v) => toggle("masterEnabled", v)}
              disabled={!canEdit || isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scan Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 pb-4 border-b">
            <div className="flex items-start gap-3">
              <Baby className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Missing Persons & Lost Children</Label>
                  <Badge variant="outline" className={`text-xs ${SENSITIVITY_COLORS.low}`}>Low sensitivity</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Matches against active MISSING_PERSON cases. Recommended for all operations.
                </p>
              </div>
            </div>
            <Switch
              checked={config.scanMissingPersons}
              onCheckedChange={(v) => toggle("scanMissingPersons", v)}
              disabled={!canEdit || isPending}
            />
          </div>

          <div className="flex items-start justify-between gap-4 pb-4 border-b">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 mt-0.5 text-yellow-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Active Arrest Warrants</Label>
                  <Badge variant="outline" className={`text-xs ${SENSITIVITY_COLORS.medium}`}>Moderate sensitivity</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Alerts when a person with an active ARREST warrant is identified.
                </p>
              </div>
            </div>
            <Switch
              checked={config.scanActiveWarrants}
              onCheckedChange={(v) => toggle("scanActiveWarrants", v)}
              disabled={!canEdit || isPending}
            />
          </div>

          <div className="flex items-start justify-between gap-4 pb-4 border-b">
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Known Gang Members</Label>
                  <Badge variant="outline" className={`text-xs ${SENSITIVITY_COLORS.high}`}>High sensitivity</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Matches persons linked to registered gang records. Consider enabling supervisor approval.
                </p>
              </div>
            </div>
            <Switch
              checked={config.scanGangMembers}
              onCheckedChange={(v) => toggle("scanGangMembers", v)}
              disabled={!canEdit || isPending}
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Threat Level Threshold</Label>
                  <Badge variant="outline" className={`text-xs ${SENSITIVITY_COLORS.high}`}>High sensitivity</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Alert when person&apos;s threat classification meets or exceeds this level. NONE = disabled.
                </p>
              </div>
            </div>
            <Select
              value={config.minThreatLevelScan}
              onValueChange={(v) => {
                if (!canEdit) return;
                save({ minThreatLevelScan: v as ThreatLevel });
              }}
              disabled={!canEdit || isPending}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Disabled</SelectItem>
                <SelectItem value="MEDIUM">Medium+</SelectItem>
                <SelectItem value="HIGH">High+</SelectItem>
                <SelectItem value="CRITICAL">Critical only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Governance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Confidence Threshold</Label>
              <p className="text-xs text-muted-foreground">
                Minimum match confidence to trigger an alert ({config.minConfidence}%)
              </p>
            </div>
            <Select
              value={String(config.minConfidence)}
              onValueChange={(v) => {
                if (!canEdit) return;
                save({ minConfidence: parseInt(v, 10) });
              }}
              disabled={!canEdit || isPending}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[70, 75, 80, 85, 90, 95, 99].map((v) => (
                  <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-4 pt-3 border-t">
            <div>
              <Label className="text-sm font-medium">Require Supervisor Approval</Label>
              <p className="text-xs text-muted-foreground">
                Queue matches for review before alerting officers. Recommended for gang/threat scanning.
              </p>
            </div>
            <Switch
              checked={config.requiresApproval}
              onCheckedChange={(v) => toggle("requiresApproval", v)}
              disabled={!canEdit || isPending}
            />
          </div>
        </CardContent>
      </Card>

      {!canEdit && (
        <p className="text-xs text-muted-foreground text-center">
          PRECINCT_ADMIN or higher required to modify scanner configuration
        </p>
      )}
    </div>
  );
}
