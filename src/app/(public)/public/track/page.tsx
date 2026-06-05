"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SubmissionStatus {
  referenceNumber: string;
  type: string;
  status: string;
  description: string;
  location: string | null;
  isAnonymous: boolean;
  publicResponse: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const typeLabels: Record<string, string> = {
  TIP: "Crime Tip",
  COMPLAINT: "Officer Complaint",
  COMMENDATION: "Officer Commendation",
  MISSING_PERSON: "Missing Person Report",
  FOIA: "FOIA Request",
  EVIDENCE: "Evidence Upload",
};

export default function TrackSubmissionPage() {
  const [reference, setReference] = useState("");
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) return;

    setLoading(true);
    setError(null);
    setSubmission(null);

    try {
      const res = await fetch(`/api/public/submissions?reference=${encodeURIComponent(reference.trim())}`);
      if (res.status === 404) {
        setError("Submission not found. Check your reference number and try again.");
        return;
      }
      if (!res.ok) {
        setError("Failed to look up submission.");
        return;
      }
      setSubmission(await res.json());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Search className="w-7 h-7 text-purple-500" />
          Track Submission
        </h1>
        <p className="text-muted-foreground">
          Enter your reference number to check the status of your submission.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="reference" className="sr-only">Reference Number</Label>
              <Input
                id="reference"
                placeholder="e.g., TTP-20260605-ABCDE"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button type="submit" disabled={loading || !reference.trim()}>
              {loading ? "Searching..." : <><Search className="w-4 h-4 mr-2" /> Search</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {submission && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{typeLabels[submission.type] ?? submission.type}</span>
                <Badge className={statusColors[submission.status] ?? ""}>
                  {submission.status.replace(/_/g, " ")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Reference</p>
                <p className="font-mono font-semibold">{submission.referenceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{submission.description}</p>
              </div>
              {submission.location && (
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p>{submission.location}</p>
                </div>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Submitted: {new Date(submission.createdAt).toLocaleDateString()}</span>
                <span>Updated: {new Date(submission.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {submission.statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submission.statusHistory.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {entry.toStatus.replace(/_/g, " ")}
                        </p>
                        {entry.note && (
                          <p className="text-sm text-muted-foreground">{entry.note}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {submission.publicResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Police Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{submission.publicResponse}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}