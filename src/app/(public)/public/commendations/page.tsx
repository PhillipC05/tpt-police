"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CommendOfficerPage() {
  const [officerName, setOfficerName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [description, setDescription] = useState("");
  const [citizenName, setCitizenName] = useState("");
  const [citizenEmail, setCitizenEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !officerName.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: "default",
          type: "COMMENDATION",
          description,
          isAnonymous: !citizenEmail,
          contactEmail: citizenEmail || undefined,
          linkedRecordId: badgeNumber || officerName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to submit commendation");
        return;
      }

      setResult(data);
      toast.success("Commendation submitted!");
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
            <h2 className="text-2xl font-bold">Thank You!</h2>
            <p className="text-muted-foreground">Your commendation has been submitted.</p>
            <p className="text-sm text-muted-foreground">Reference: <span className="font-mono font-bold text-primary">{result.reference}</span></p>
            <Button variant="outline" onClick={() => setResult(null)}>Submit Another</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="w-7 h-7 text-green-500" />
          Commend an Officer
        </h1>
        <p className="text-muted-foreground">
          Recognize an officer who provided exceptional service to you or our community.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Officer Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="officer">Officer Name *</Label>
              <Input id="officer" placeholder="Officer Jane Smith" value={officerName} onChange={(e) => setOfficerName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge">Badge Number (if known)</Label>
              <Input id="badge" placeholder="1234" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Your Details (Optional)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" placeholder="John Doe" value={citizenName} onChange={(e) => setCitizenName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={citizenEmail} onChange={(e) => setCitizenEmail(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">What happened?</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              placeholder="Describe the situation and what the officer did that was commendable..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting || !description.trim() || !officerName.trim()}>
          {submitting ? "Submitting..." : <><Send className="w-4 h-4 mr-2" /> Submit Commendation</>}
        </Button>
      </form>
    </div>
  );
}