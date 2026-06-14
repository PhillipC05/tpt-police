"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createGang } from "@/app/(platform)/intelligence/actions";
import type { GangType, GangStatus } from "@prisma/client";

const TYPE_LABELS: Record<GangType, string> = {
  STREET_GANG: "Street Gang",
  ORGANIZED_CRIME: "Organized Crime",
  EXTREMIST: "Extremist",
  CARTEL: "Cartel",
  MOTORCYCLE_CLUB: "Motorcycle Club",
  OTHER: "Other",
};

export function NewGangClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [type, setType] = useState<GangType>("STREET_GANG");
  const [status, setStatus] = useState<GangStatus>("ACTIVE");
  const [territory, setTerritory] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createGang({
        name: name.trim(),
        aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
        type,
        status,
        territory: territory.trim() || undefined,
        description: description.trim() || undefined,
      });

      if (result.error) {
        setError(typeof result.error === "string" ? result.error : "Please check the form fields");
      } else if (result.success && result.id) {
        router.push(`/intelligence/gangs/${result.id}`);
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Gang name *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Northside Crew" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="aliases">Aliases / alternative names</Label>
          <Input id="aliases" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder="Comma-separated, e.g. NSC, North Crew" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as GangType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GangStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="DISBANDED">Disbanded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="territory">Known territory</Label>
          <Input id="territory" value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="e.g. Northside district, between 5th and 12th Ave" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description / intelligence notes</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Criminal activities, structure, known operations..."
            rows={4}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending ? "Registering..." : "Register Gang"}
          </Button>
          <Button variant="ghost" onClick={() => router.push("/intelligence/gangs")}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
