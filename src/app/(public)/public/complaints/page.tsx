"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function FileComplaintPage() {
  const [description, setDescription] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !contactEmail.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: "default",
          type: "COMPLAINT",
          description,
          isAnonymous: false,
          contactEmail,
          linkedRecordId: officerName || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to submit complaint");
        return;
      }

      setResult(data);
      toast.success("Complaint filed successfully!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-lg">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Complaint Filed</h2>
            <p className="text-muted-foreground">Your reference number is:</p>
            <p className="text-xl font-mono font-bold text-primary">{result.reference}</p>
            <p className="text-sm text-muted-foreground">Save this number to track your submission.</p>
            <Button variant="outline" onClick={() => setResult(null)}>File Another Complaint</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle className="w-7 h-7 text-destructive" />
          File a Complaint
        </h1>
        <p className="text-muted-foreground">
          File a complaint about police conduct or service. A valid email is required for follow-up.
        </p>
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-800 dark:text-amber-200">
            False complaints may have legal consequences. Please ensure your complaint is truthful and accurate.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Your Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input id="name" placeholder="John Doe" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Complaint Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="officer">Officer Name or Badge # (if known)</Label>
              <Input id="officer" placeholder="Officer Smith or badge #1234" value={officerName} onChange={(e) => setOfficerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Incident Date</Label>
              <Input id="date" type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description of Complaint *</Label>
              <Textarea id="description" placeholder="Describe what happened in detail..." rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting || !description.trim() || !contactEmail.trim()}>
          {submitting ? "Submitting..." : <><Send className="w-4 h-4 mr-2" /> File Complaint</>}
        </Button>
      </form>
    </div>
  );
}