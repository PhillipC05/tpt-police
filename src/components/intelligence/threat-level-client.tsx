"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield } from "lucide-react";
import { setPersonThreatLevel } from "@/app/(platform)/intelligence/actions";
import type { ThreatLevel } from "@prisma/client";

const THREAT_COLORS: Record<ThreatLevel, string> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
  NONE: "outline",
};

const THREAT_OPTIONS: { value: ThreatLevel; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

interface Props {
  personId: string;
  currentLevel: ThreatLevel;
}

export function ThreatLevelClient({ personId, currentLevel }: Props) {
  const [level, setLevel] = useState<ThreatLevel>(currentLevel);
  const [editing, setEditing] = useState(false);
  const [pending, setSelected] = useState<ThreatLevel>(currentLevel);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      const result = await setPersonThreatLevel(personId, pending);
      if (result.error) {
        setError(result.error);
      } else {
        setLevel(pending);
        setEditing(false);
        setError(null);
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Threat Classification</span>
          </div>
          {!editing ? (
            <div className="flex items-center gap-2">
              <Badge variant={THREAT_COLORS[level] as "destructive" | "secondary" | "outline"}>
                {level === "NONE" ? "Not classified" : `${level} THREAT`}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={pending} onValueChange={(v) => setSelected(v as ThreatLevel)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THREAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleSave} disabled={isPending}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setSelected(level); setError(null); }}>Cancel</Button>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
