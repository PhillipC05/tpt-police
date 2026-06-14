"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Search } from "lucide-react";
import { addAssociation, removeAssociation } from "@/app/(platform)/intelligence/actions";
import type { AssociationType, ConfidenceLevel, ThreatLevel } from "@prisma/client";

interface Associate {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string | null;
  photoUrl: string | null;
  threatLevel: ThreatLevel;
}

interface Association {
  id: string;
  relationshipType: AssociationType;
  confidence: ConfidenceLevel;
  notes: string | null;
  createdAt: string;
  associate: Associate;
}

interface Props {
  personId: string;
  canEdit: boolean;
}

const TYPE_LABELS: Record<AssociationType, string> = {
  KNOWN_ASSOCIATE: "Known Associate",
  FAMILY: "Family",
  EMPLOYER: "Employer",
  BUSINESS_PARTNER: "Business Partner",
  RIVAL: "Rival",
  CO_DEFENDANT: "Co-Defendant",
  INFORMANT: "Informant",
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  CONFIRMED: "destructive",
  SUSPECTED: "secondary",
  UNVERIFIED: "outline",
};

const THREAT_COLORS: Record<ThreatLevel, string> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
  NONE: "outline",
};

interface PersonResult {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string | null;
}

export function PersonAssociationsClient({ personId, canEdit }: Props) {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PersonResult[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null);
  const [relType, setRelType] = useState<AssociationType>("KNOWN_ASSOCIATE");
  const [confidence, setConfidence] = useState<ConfidenceLevel>("UNVERIFIED");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch(`/api/persons/${personId}/associations`)
      .then((r) => r.json())
      .then((d) => { setAssociations(d.associations ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [personId]);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    setSelectedPerson(null);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await fetch(`/api/persons/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    // Exclude the current person from results
    setSearchResults((data.persons ?? []).filter((p: PersonResult) => p.id !== personId));
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeAssociation(id);
      if (result.error) {
        setError(result.error);
      } else {
        setAssociations((prev) => prev.filter((a) => a.id !== id));
      }
    });
  }

  function handleAdd() {
    if (!selectedPerson) return;
    startTransition(async () => {
      const result = await addAssociation({
        personAId: personId,
        personBId: selectedPerson.id,
        relationshipType: relType,
        confidence,
        notes: notes.trim() || undefined,
      });
      if (result.error) {
        setError(typeof result.error === "string" ? result.error : "Failed to add association");
      } else {
        setShowAddForm(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedPerson(null);
        setRelType("KNOWN_ASSOCIATE");
        setConfidence("UNVERIFIED");
        setNotes("");
        setError(null);
        // Reload associations
        fetch(`/api/persons/${personId}/associations`)
          .then((r) => r.json())
          .then((d) => setAssociations(d.associations ?? []));
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Known Associates ({associations.length})</CardTitle>
          {canEdit && !showAddForm && (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Link
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
        )}

        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Link a known associate</p>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for a person..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {searchResults.length > 0 && !selectedPerson && (
              <div className="border rounded-md divide-y max-h-48 overflow-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => { setSelectedPerson(p); setSearchResults([]); setSearchQuery(`${p.firstName} ${p.lastName}`); }}
                  >
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    {p.idNumber && <span className="text-muted-foreground ml-2">({p.idNumber})</span>}
                  </button>
                ))}
              </div>
            )}

            {selectedPerson && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md text-sm">
                <span className="font-medium">{selectedPerson.firstName} {selectedPerson.lastName}</span>
                <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => { setSelectedPerson(null); setSearchQuery(""); }}>✕</button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Relationship type</p>
                <Select value={relType} onValueChange={(v) => setRelType(v as AssociationType)}>
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
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Confidence level</p>
                <Select value={confidence} onValueChange={(v) => setConfidence(v as ConfidenceLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="SUSPECTED">Suspected</SelectItem>
                    <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!selectedPerson || isPending}>
                <Plus className="w-4 h-4 mr-1" />Link
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setError(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
        ) : associations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No known associates on record</p>
        ) : (
          <div className="divide-y">
            {associations.map((assoc) => (
              <div key={assoc.id} className="flex items-center justify-between py-2 gap-3">
                <div className="min-w-0">
                  <Link href={`/persons/${assoc.associate.id}`} className="text-sm font-medium hover:underline block truncate">
                    {assoc.associate.firstName} {assoc.associate.lastName}
                  </Link>
                  {assoc.notes && <p className="text-xs text-muted-foreground truncate">{assoc.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {assoc.associate.threatLevel !== "NONE" && (
                    <Badge variant={THREAT_COLORS[assoc.associate.threatLevel] as "destructive" | "secondary" | "outline"} className="text-xs">
                      {assoc.associate.threatLevel}
                    </Badge>
                  )}
                  <Badge variant={CONFIDENCE_COLORS[assoc.confidence] as "destructive" | "secondary" | "outline"} className="text-xs">
                    {assoc.confidence.toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{TYPE_LABELS[assoc.relationshipType]}</Badge>
                  {canEdit && (
                    <button
                      onClick={() => handleRemove(assoc.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                      title="Remove link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
