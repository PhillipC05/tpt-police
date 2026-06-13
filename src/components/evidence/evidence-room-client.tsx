"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

interface CustodyEntry {
  id: string;
  action: string;
  location: string | null;
  reason: string | null;
  createdAt: string;
  user: { name: string } | null;
}

interface EvidenceItem {
  id: string;
  type: string;
  description: string;
  tagNumber: string | null;
  storageLocation: string | null;
  collectedAt: string | null;
  collectedBy: string | null;
  createdAt: string;
  case: { id: string; title: string; caseNumber: string | null } | null;
  custodyChain: CustodyEntry[];
}

interface LabSubmission {
  id: string;
  labReferenceNo: string;
  type: string;
  status: string;
  expectedTurnaround: number | null;
  turnaroundDays: number | null;
  createdAt: string;
  evidence: { id: string; description: string; tagNumber: string | null; type: string } | null;
}

interface Props {
  initialEvidence: EvidenceItem[];
  initialLabSubmissions: LabSubmission[];
  userRole: string;
}

const EVIDENCE_BADGE: Record<string, string> = {
  PHYSICAL: "bg-gray-100 text-gray-800",
  DIGITAL: "bg-blue-100 text-blue-800",
  DOCUMENTARY: "bg-yellow-100 text-yellow-800",
  BIOLOGICAL: "bg-red-100 text-red-800",
  AUDIO: "bg-purple-100 text-purple-800",
  VIDEO: "bg-pink-100 text-pink-800",
  PHOTO: "bg-green-100 text-green-800",
};

const LAB_STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  IN_ANALYSIS: "bg-yellow-100 text-yellow-800",
  RESULTS_READY: "bg-green-100 text-green-800",
  REVIEWED: "bg-gray-100 text-gray-800",
};

export function EvidenceRoomClient({ initialEvidence, initialLabSubmissions }: Props) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  const filtered = initialEvidence.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.tagNumber?.toLowerCase().includes(search.toLowerCase()) ||
      e.case?.caseNumber?.toLowerCase().includes(search.toLowerCase()) ||
      e.type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Tabs defaultValue="evidence">
      <TabsList>
        <TabsTrigger value="evidence">Evidence Items</TabsTrigger>
        <TabsTrigger value="lab">Lab Submissions</TabsTrigger>
      </TabsList>

      <TabsContent value="evidence" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, tag, case number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Tag</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Custody</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No evidence items found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((item) => (
                  <>
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        >
                          {expandedId === item.id ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.tagNumber ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVIDENCE_BADGE[item.type] ?? ""}`}>
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.case ? (
                          <span>{item.case.caseNumber ?? item.case.id.slice(0, 8)}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{item.storageLocation ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.collectedAt ? new Date(item.collectedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedEvidence(item)}
                        >
                          View Chain
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedId === item.id && (
                      <TableRow key={`${item.id}-exp`}>
                        <TableCell colSpan={8} className="bg-muted/30 px-8 py-3 text-sm">
                          <div className="grid grid-cols-3 gap-4">
                            <div><span className="font-medium">Collected by:</span> {item.collectedBy ?? "Unknown"}</div>
                            <div><span className="font-medium">Logged:</span> {new Date(item.createdAt).toLocaleString()}</div>
                            <div><span className="font-medium">Case:</span> {item.case?.title ?? "—"}</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="lab" className="mt-4">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Expected Turnaround</TableHead>
                  <TableHead>Actual Days</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialLabSubmissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No lab submissions found.
                    </TableCell>
                  </TableRow>
                )}
                {initialLabSubmissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-xs">{sub.labReferenceNo}</TableCell>
                    <TableCell>{sub.type}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LAB_STATUS_BADGE[sub.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {sub.status.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.evidence ? (sub.evidence.tagNumber ?? sub.evidence.description.slice(0, 30)) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{sub.expectedTurnaround ? `${sub.expectedTurnaround}d` : "—"}</TableCell>
                    <TableCell className="text-xs">{sub.turnaroundDays ? `${sub.turnaroundDays}d` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Chain of custody dialog */}
      <Dialog open={!!selectedEvidence} onOpenChange={() => setSelectedEvidence(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Chain of Custody — {selectedEvidence?.tagNumber ?? selectedEvidence?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedEvidence?.custodyChain.length === 0 && (
              <p className="text-muted-foreground text-sm">No custody entries recorded.</p>
            )}
            {selectedEvidence?.custodyChain.map((entry) => (
              <div key={entry.id} className="border rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{entry.action}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                {entry.user && <div className="mt-1 text-muted-foreground">By: {entry.user.name}</div>}
                {entry.location && <div className="text-muted-foreground">Location: {entry.location}</div>}
                {entry.reason && <div className="text-muted-foreground">{entry.reason}</div>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
