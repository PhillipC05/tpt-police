"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Shield, Car, FileWarning, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface HistoryData {
  person: { firstName: string; lastName: string };
  isJuvenile: boolean;
  history: {
    cases: { id: string; caseNumber: string; title: string; type: string; status: string; role: string; createdAt: string }[];
    bookings: { id: string; bookingNumber: string; status: string; charges: string[]; arrestedAt: string }[];
    fieldContacts: { id: string; contactType: string; contactDate: string; location: string | null; outcome: string | null }[];
    warrants: { id: string; warrantNumber: string; type: string; status: string; issuedBy: string; issuedAt: string }[];
  };
}

export function PersonHistoryClient({ personId }: { personId: string }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/persons/${personId}/history`);
      if (res.ok) {
        setData(await res.json());
      } else if (res.status === 403) {
        toast.error("Juvenile records restricted");
      } else {
        toast.error("Failed to load history");
      }
    } catch {
      toast.error("Failed to load person history");
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!data) return <div className="text-center py-8 text-muted-foreground">Could not load history</div>;

  const { history } = data;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Unified History</h2>

      <div className="grid gap-3">
        {/* Cases */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />Cases ({history.cases.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.cases.length === 0 ? <p className="text-sm text-muted-foreground">No case history</p> : history.cases.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                <div>
                  <Link href={`/cases/${c.id}`} className="font-medium text-sm hover:underline">{c.caseNumber}</Link>
                  <p className="text-xs text-muted-foreground">{c.title} · Role: {c.role}</p>
                </div>
                <Badge variant="outline" className="text-xs">{c.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bookings */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" />Bookings ({history.bookings.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.bookings.length === 0 ? <p className="text-sm text-muted-foreground">No booking history</p> : history.bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                <div>
                  <span className="font-mono text-sm font-medium">{b.bookingNumber}</span>
                  <p className="text-xs text-muted-foreground">{new Date(b.arrestedAt).toLocaleDateString()} · {(b.charges as string[]).slice(0, 2).join(", ")}{b.charges.length > 2 ? "..." : ""}</p>
                </div>
                <Badge variant="outline" className="text-xs">{b.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Field Contacts */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Car className="w-4 h-4" />Field Contacts ({history.fieldContacts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.fieldContacts.length === 0 ? <p className="text-sm text-muted-foreground">No field contacts</p> : history.fieldContacts.slice(0, 5).map((fc) => (
              <div key={fc.id} className="border-b pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{fc.contactType}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(fc.contactDate).toLocaleDateString()}</span>
                </div>
                {fc.location && <p className="text-xs text-muted-foreground">{fc.location}</p>}
                {fc.outcome && <p className="text-xs">{fc.outcome}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Warrants */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileWarning className="w-4 h-4" />Warrants ({history.warrants.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.warrants.length === 0 ? <p className="text-sm text-muted-foreground">No warrant history</p> : history.warrants.slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-start justify-between border-b pb-2 last:border-0">
                <div>
                  <span className="font-mono text-sm font-medium">{w.warrantNumber}</span>
                  <p className="text-xs text-muted-foreground">{w.type} · Issued by {w.issuedBy}</p>
                </div>
                <Badge variant={w.status === "ACTIVE" ? "destructive" : "outline"} className="text-xs">{w.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}