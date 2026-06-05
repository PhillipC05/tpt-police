"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, UserX } from "lucide-react";
import { toast } from "sonner";

interface MissingCase {
  id: string;
  caseNumber: string;
  status: string;
  title: string;
  createdAt: string;
  persons: { person: { id: string; firstName: string; lastName: string; dateOfBirth: string | null; photoUrl: string | null } }[];
  assignments: { user: { id: string; name: string; badgeNumber: string | null } }[];
}

export function MissingPersonsClient() {
  const [cases, setCases] = useState<MissingCase[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/missing-persons");
      if (res.ok) {
        const data = await res.json();
        const filtered = search
          ? data.filter((c: MissingCase) =>
              c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
              c.persons.some((p) => `${p.person.firstName} ${p.person.lastName}`.toLowerCase().includes(search.toLowerCase()))
            )
          : data;
        setCases(filtered);
      }
    } catch {
      toast.error("Failed to load missing persons");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  return (
    <div className="space-y-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or case #..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : cases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No missing persons cases</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => {
            const subject = c.persons[0]?.person;
            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {subject?.photoUrl ? (
                      <img src={subject.photoUrl} alt="" className="w-12 h-14 rounded object-cover shrink-0 border" />
                    ) : (
                      <div className="w-12 h-14 rounded bg-muted flex items-center justify-center shrink-0 border"><UserX className="w-5 h-5 text-muted-foreground" /></div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={c.status === "ACTIVE" ? "destructive" : "outline"}>{c.status}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{c.caseNumber}</span>
                      </div>
                      {subject && <p className="font-medium mt-0.5">{subject.firstName} {subject.lastName}</p>}
                      {subject?.dateOfBirth && <p className="text-xs text-muted-foreground">DOB: {new Date(subject.dateOfBirth).toLocaleDateString()}</p>}
                      {c.assignments[0] && <p className="text-xs text-muted-foreground mt-1">Detective: {c.assignments[0].user.name}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}