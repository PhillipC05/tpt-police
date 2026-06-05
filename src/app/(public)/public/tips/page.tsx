"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SubmitTipPage() {
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: "default", // Will be resolved server-side for multi-tenant
          type: "TIP",
          description,
          location: location || undefined,
          isAnonymous,
          contactEmail: isAnonymous ? undefined : contactEmail || undefined,
          contactPhone: isAnonymous ? undefined : contactPhone || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to submit tip");
        return;
      }

      setResult(data);
      toast.success("Tip submitted successfully!");
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
            <h2 className="text-2xl font-bold">Tip Submitted</h2>
            <p className="text-muted-foreground">
              Your reference number is:
            </p>
            <p className="text-xl font-mono font-bold text-primary">{result.reference}</p>
            <p className="text-sm text-muted-foreground">
              Save this number to track your submission status later.
            </p>
            <Button variant="outline" onClick={() => setResult(null)}>
              Submit Another Tip
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
          Submit a Tip
        </h1>
        <p className="text-muted-foreground">
          Share information with law enforcement. You can submit anonymously or provide contact details for follow-up.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Submit Anonymously</Label>
                <p className="text-sm text-muted-foreground">
                  Your identity will not be shared
                </p>
              </div>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>

            {!isAnonymous && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (for follow-up)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+64 21 123 4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Tip</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                placeholder="e.g., 123 Main Street, Auckland"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">What do you know?</Label>
              <Textarea
                id="description"
                placeholder="Describe what you saw, heard, or know..."
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting || !description.trim()}>
          {submitting ? (
            "Submitting..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Tip
            </>
          )}
        </Button>
      </form>
    </div>
  );
}