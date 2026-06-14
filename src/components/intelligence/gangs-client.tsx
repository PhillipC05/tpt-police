"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users } from "lucide-react";
import type { Gang, GangType, GangStatus } from "@prisma/client";

interface GangWithCount extends Gang {
  _count: { members: number };
}

interface Props {
  gangs: GangWithCount[];
  canCreate: boolean;
}

const STATUS_COLORS: Record<GangStatus, string> = {
  ACTIVE: "destructive",
  INACTIVE: "secondary",
  DISBANDED: "outline",
};

const TYPE_LABELS: Record<GangType, string> = {
  STREET_GANG: "Street Gang",
  ORGANIZED_CRIME: "Organized Crime",
  EXTREMIST: "Extremist",
  CARTEL: "Cartel",
  MOTORCYCLE_CLUB: "Motorcycle Club",
  OTHER: "Other",
};

export function GangsClient({ gangs }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = gangs.filter((g) => {
    const matchSearch =
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || g.type === typeFilter;
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or alias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="DISBANDED">Disbanded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {gangs.length === 0 ? "No gangs registered yet" : "No gangs match your filters"}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((gang) => (
            <Link key={gang.id} href={`/intelligence/gangs/${gang.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm leading-tight">{gang.name}</p>
                    <Badge
                      variant={STATUS_COLORS[gang.status] as "destructive" | "secondary" | "outline"}
                      className="text-xs shrink-0"
                    >
                      {gang.status}
                    </Badge>
                  </div>
                  {gang.aliases.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      AKA: {gang.aliases.join(", ")}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="outline" className="text-xs">{TYPE_LABELS[gang.type]}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />{gang._count.members}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
