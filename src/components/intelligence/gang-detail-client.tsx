"use client";

import { useState, useTransition } from "react";
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
import { Trash2, Plus, Search, UserPlus } from "lucide-react";
import { addGangMember, removeGangMember } from "@/app/(platform)/intelligence/actions";
import type { GangMemberRole, ThreatLevel } from "@prisma/client";

interface MemberPerson {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string | null;
  dateOfBirth: Date | null;
  threatLevel: ThreatLevel;
}

interface Member {
  id: string;
  personId: string;
  role: GangMemberRole;
  joinedAt: Date | null;
  notes: string | null;
  person: MemberPerson;
}

interface Props {
  gang: { id: string; name: string; status: string };
  members: Member[];
  canEdit: boolean;
  canManageMembers: boolean;
}

const ROLE_LABELS: Record<GangMemberRole, string> = {
  LEADER: "Leader",
  LIEUTENANT: "Lieutenant",
  MEMBER: "Member",
  ASSOCIATE: "Associate",
  SUSPECTED: "Suspected",
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
  dateOfBirth: Date | null;
}

export function GangDetailClient({ gang, members: initialMembers, canManageMembers }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PersonResult[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null);
  const [role, setRole] = useState<GangMemberRole>("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSearch(q: string) {
    setSearchQuery(q);
    setSelectedPerson(null);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await fetch(`/api/persons/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.persons ?? []);
  }

  function handleRemove(personId: string) {
    startTransition(async () => {
      const result = await removeGangMember(gang.id, personId);
      if (result.error) {
        setError(result.error);
      } else {
        setMembers((prev) => prev.filter((m) => m.personId !== personId));
      }
    });
  }

  function handleAdd() {
    if (!selectedPerson) return;
    startTransition(async () => {
      const result = await addGangMember(gang.id, selectedPerson.id, role);
      if (result.error) {
        setError(typeof result.error === "string" ? result.error : "Failed to add member");
      } else {
        setShowAddForm(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedPerson(null);
        setRole("MEMBER");
        setError(null);
        // Optimistic update — refresh happens via revalidatePath server-side
        window.location.reload();
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
          {canManageMembers && !showAddForm && (
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
              <UserPlus className="w-4 h-4 mr-2" />Add Member
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
            <p className="text-sm font-medium">Add a person to {gang.name}</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
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

            <Select value={role} onValueChange={(v) => setRole(v as GangMemberRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!selectedPerson || isPending}>
                <Plus className="w-4 h-4 mr-1" />Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setError(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No members linked to this gang</p>
        ) : (
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2 gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/persons/${member.person.id}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {member.person.firstName} {member.person.lastName}
                  </Link>
                  <div className="flex gap-1 mt-0.5">
                    {member.person.idNumber && (
                      <span className="text-xs text-muted-foreground">{member.person.idNumber}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {member.person.threatLevel !== "NONE" && (
                    <Badge variant={THREAT_COLORS[member.person.threatLevel] as "destructive" | "secondary" | "outline"} className="text-xs">
                      {member.person.threatLevel}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">{ROLE_LABELS[member.role]}</Badge>
                  {canManageMembers && (
                    <button
                      onClick={() => handleRemove(member.personId)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove from gang"
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
