"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CaseDetailData {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  type: string;
  status: string;
  location: string | null;
  createdAt: string;
  assignments: Array<{ id: string; isLead: boolean; user: { id: string; name: string; badgeNumber: string | null; role: string } }>;
  evidence: Array<{ id: string; type: string; description: string }>;
  persons: Array<{ id: string; role: string; person: { id: string; firstName: string; lastName: string } }>;
  notes: Array<{ id: string; content: string; createdAt: string; author: { id: string; name: string; badgeNumber: string | null } }>;
}

interface Props {
  caseId: string;
}

export function CaseDetailClient({ caseId }: Props) {
  const [data, setData] = useState<CaseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [noteText, setNoteText] = useState("");

  const fetchCase = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { fetchCase(); }, [fetchCase]);

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText }),
      });
      if (res.ok) {
        toast.success("Note added");
        setNoteText("");
        fetchCase();
      }
    } catch {
      toast.error("Failed to add note");
    }
  };

  const tabs = ["overview", "evidence", "persons", "notes", "actions"];

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading case details...</div>;
  if (!data) return <div className="text-center py-8 text-muted-foreground">Case not found</div>;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
            {tab === "evidence" && ` (${data.evidence.length})`}
            {tab === "persons" && ` (${data.persons.length})`}
            {tab === "notes" && ` (${data.notes.length})`}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Case Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Case Number:</span> {data.caseNumber}</div>
                <div><span className="text-muted-foreground">Type:</span> {data.type}</div>
                <div><span className="text-muted-foreground">Status:</span> {data.status}</div>
                <div><span className="text-muted-foreground">Location:</span> {data.location ?? "\u2014"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {data.description}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assigned Personnel</CardTitle></CardHeader>
            <CardContent>
              {data.assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignments</p>
              ) : (
                <div className="space-y-2">
                  {data.assignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm">
                      <span>{a.user.name}</span>
                      {a.user.badgeNumber && <span className="text-muted-foreground">#{a.user.badgeNumber}</span>}
                      {a.isLead && <Badge variant="default">Lead</Badge>}
                      <span className="text-muted-foreground">({a.user.role})</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Evidence Tab */}
      {activeTab === "evidence" && (
        <Card>
          <CardHeader><CardTitle>Evidence Items</CardTitle></CardHeader>
          <CardContent>
            {data.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence recorded</p>
            ) : (
              <div className="divide-y">
                {data.evidence.map((e) => (
                  <div key={e.id} className="py-2 text-sm">
                    <span className="font-medium">{e.type}</span>: {e.description}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Persons Tab */}
      {activeTab === "persons" && (
        <Card>
          <CardHeader><CardTitle>Related Persons</CardTitle></CardHeader>
          <CardContent>
            {data.persons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No persons linked</p>
            ) : (
              <div className="divide-y">
                {data.persons.map((p) => (
                  <div key={p.id} className="py-2 text-sm flex items-center gap-2">
                    <Badge variant="outline">{p.role}</Badge>
                    <span>{p.person.firstName} {p.person.lastName}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <Card>
          <CardHeader><CardTitle>Case Notes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addNote} className="self-end">Add</Button>
            </div>
            <div className="divide-y">
              {data.notes.map((n) => (
                <div key={n.id} className="py-3">
                  <p className="text-sm">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {n.author.name} — {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Tab */}
      {activeTab === "actions" && (
        <Card>
          <CardHeader><CardTitle>Case Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Additional case management actions can be performed here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}