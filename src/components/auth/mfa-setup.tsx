"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Copy, Check } from "lucide-react";

interface MfaSetupProps {
  secret: string;
  qrCodeUrl: string;
  onVerify: (code: string) => Promise<boolean>;
  onSkip?: () => void;
}

export function MfaSetup({ secret, qrCodeUrl, onVerify, onSkip }: MfaSetupProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    const valid = await onVerify(code);
    setVerifying(false);
    if (valid) {
      toast.success("MFA enabled successfully");
    } else {
      toast.error("Invalid code. Please try again.");
    }
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Set Up Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
        </div>

        <div className="space-y-2">
          <Label>Or enter this key manually</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono">
              {secret}
            </code>
            <Button variant="outline" size="icon" onClick={copySecret}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mfa-code">Verification Code</Label>
          <Input
            id="mfa-code"
            placeholder="Enter the 6-digit code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleVerify} disabled={code.length !== 6 || verifying}>
            {verifying ? "Verifying…" : "Verify & Enable"}
          </Button>
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}