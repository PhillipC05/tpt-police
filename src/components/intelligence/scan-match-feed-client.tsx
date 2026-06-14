"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { User, RefreshCw } from "lucide-react";
import type { ThreatLevel } from "@prisma/client";

interface MatchPerson {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  threatLevel: ThreatLevel;
}

interface MatchSession {
  sourceType: string;
  bwcCamera?: { serialNumber: string; deviceType: string } | null;
  surveillanceCam?: { name: string; location: string | null } | null;
}

interface Match {
  id: string;
  confidence: number;
  matchReasons: string[];
  capturedAt: string;
  thumbnailUrl: string | null;
  actionTaken: string | null;
  person: MatchPerson;
  session: MatchSession;
  alertedUser?: { name: string; badgeNumber: string | null } | null;
}

const REASON_COLORS: Record<string, string> = {
  MISSING_PERSON: "destructive",
  ARREST_WARRANT: "destructive",
  GANG_MEMBER: "secondary",
  HIGH_THREAT: "secondary",
  CRITICAL_THREAT: "destructive",
  MEDIUM_THREAT: "outline",
};

const THREAT_COLORS: Record<ThreatLevel, string> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
  NONE: "outline",
};

export function ScanMatchFeedClient() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [reasonFilter, setReasonFilter] = useState("");

  const fetchMatches = useCallback(async () => {
    const params = new URLSearchParams();
    if (reasonFilter) params.set("reason", reasonFilter);
    const res = await fetch(`/api/facial/matches?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    setMatches(data.matches ?? []);
    setTotal(data.total ?? 0);
    setLastRefresh(new Date());
    setLoading(false);
  }, [reasonFilter]);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 15000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  function sourceLabel(session: MatchSession): string {
    if (session.sourceType === "BWC" && session.bwcCamera) {
      return session.bwcCamera.deviceType === "SMART_GLASSES"
        ? `Smart Glasses ${session.bwcCamera.serialNumber}`
        : `BWC ${session.bwcCamera.serialNumber}`;
    }
    if (session.sourceType === "CCTV" && session.surveillanceCam) {
      return session.surveillanceCam.name;
    }
    return session.sourceType.replace(/_/g, " ");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Filter by reason (e.g. ARREST_WARRANT)..."
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value.toUpperCase())}
          className="flex-1"
        />
        <button
          onClick={fetchMatches}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {total} total · refreshed {lastRefresh.toLocaleTimeString()}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No matches found</p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <Card key={match.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-14 rounded-lg bg-muted flex items-center justify-center border shrink-0 overflow-hidden">
                    {match.thumbnailUrl || match.person.photoUrl ? (
                      <img
                        src={match.thumbnailUrl ?? match.person.photoUrl!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <Link href={`/persons/${match.person.id}`} className="font-semibold text-sm hover:underline">
                          {match.person.firstName} {match.person.lastName}
                        </Link>
                        {match.person.threatLevel !== "NONE" && (
                          <Badge variant={THREAT_COLORS[match.person.threatLevel] as "destructive" | "secondary" | "outline"} className="text-xs ml-2">
                            {match.person.threatLevel}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(match.capturedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {match.matchReasons.map((r) => (
                        <Badge
                          key={r}
                          variant={(REASON_COLORS[r] ?? "outline") as "destructive" | "secondary" | "outline"}
                          className="text-xs"
                        >
                          {r.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="text-xs">
                        {Math.round(match.confidence)}% confidence
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {sourceLabel(match.session)}
                      </Badge>
                    </div>

                    {match.actionTaken && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">
                        Action: {match.actionTaken}
                      </p>
                    )}
                    {match.alertedUser && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Alerted: {match.alertedUser.name}
                        {match.alertedUser.badgeNumber ? ` (${match.alertedUser.badgeNumber})` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
