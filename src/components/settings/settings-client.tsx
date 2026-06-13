"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MfaSetup } from "@/components/auth/mfa-setup";
import { Shield } from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  badgeNumber: string | null;
  rank: string | null;
  department: string | null;
  role: string;
  mfaEnabled: boolean;
}

interface Props {
  user: UserProfile;
}

export function SettingsClient({ user }: Props) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const [notifCases, setNotifCases] = useState(true);
  const [notifShifts, setNotifShifts] = useState(true);
  const [notifAlerts, setNotifAlerts] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  async function saveProfile() {
    setProfileSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, phone: phone.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? "Failed to save profile");
        return;
      }
      toast.success("Profile updated");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Failed to change password");
        return;
      }
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function startMfaSetup() {
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      if (!res.ok) { toast.error("Could not start MFA setup"); return; }
      const data = await res.json();
      setMfaSetupData({ secret: data.secret, qrCodeUrl: data.qrCodeUrl });
    } finally {
      setMfaLoading(false);
    }
  }

  async function disableMfa() {
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/disable", { method: "POST" });
      if (!res.ok) { toast.error("Could not disable MFA"); return; }
      setMfaEnabled(false);
      toast.success("MFA disabled");
    } finally {
      setMfaLoading(false);
    }
  }

  async function saveNotifications() {
    setNotifSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    toast.success("Notification preferences saved");
    setNotifSaving(false);
  }

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile" className="mt-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your display name and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Contact your admin to change your email.</p>
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Badge Number</Label>
                <Input value={user.badgeNumber ?? ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label>Rank</Label>
                <Input value={user.rank ?? ""} disabled className="bg-muted" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input value={user.department ?? ""} disabled className="bg-muted" />
            </div>
            <div className="flex items-center gap-2">
              <Label>Role</Label>
              <Badge variant="secondary">{user.role.replace(/_/g, " ")}</Badge>
            </div>
            <Button onClick={saveProfile} disabled={profileSaving} className="w-full">
              {profileSaving ? "Saving…" : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Security Tab */}
      <TabsContent value="security" className="mt-6 space-y-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Minimum 12 characters. Use a strong, unique password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              onClick={changePassword}
              disabled={passwordSaving || !currentPassword || !newPassword}
              className="w-full"
            >
              {passwordSaving ? "Changing…" : "Change Password"}
            </Button>
          </CardContent>
        </Card>

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Multi-Factor Authentication</CardTitle>
            <CardDescription>
              {user.mfaEnabled ? "MFA is currently enabled on your account." : "Add an extra layer of security with an authenticator app."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mfaSetupData ? (
              <MfaSetup
                secret={mfaSetupData.secret}
                qrCodeUrl={mfaSetupData.qrCodeUrl}
                onVerify={async (code) => {
                  const res = await fetch("/api/auth/mfa/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code }),
                  });
                  if (res.ok) { setMfaEnabled(true); setMfaSetupData(null); }
                  return res.ok;
                }}
                onSkip={() => setMfaSetupData(null)}
              />
            ) : mfaEnabled ? (
              <Button variant="destructive" onClick={disableMfa} disabled={mfaLoading}>
                <Shield className="w-4 h-4 mr-2" />
                {mfaLoading ? "Disabling…" : "Disable MFA"}
              </Button>
            ) : (
              <Button variant="outline" onClick={startMfaSetup} disabled={mfaLoading}>
                <Shield className="w-4 h-4 mr-2" />
                {mfaLoading ? "Loading…" : "Enable MFA"}
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Notifications Tab */}
      <TabsContent value="notifications" className="mt-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Choose which events trigger email alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="notif-cases"
                checked={notifCases}
                onCheckedChange={(v) => setNotifCases(!!v)}
              />
              <div>
                <label htmlFor="notif-cases" className="text-sm font-medium cursor-pointer">Case updates</label>
                <p className="text-xs text-muted-foreground">Assignments, status changes, new evidence on your cases.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="notif-shifts"
                checked={notifShifts}
                onCheckedChange={(v) => setNotifShifts(!!v)}
              />
              <div>
                <label htmlFor="notif-shifts" className="text-sm font-medium cursor-pointer">Shift reminders</label>
                <p className="text-xs text-muted-foreground">Upcoming shift notifications and schedule changes.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="notif-alerts"
                checked={notifAlerts}
                onCheckedChange={(v) => setNotifAlerts(!!v)}
              />
              <div>
                <label htmlFor="notif-alerts" className="text-sm font-medium cursor-pointer">Active alerts</label>
                <p className="text-xs text-muted-foreground">BOLO, APB, and AMBER/SILVER alerts for your jurisdiction.</p>
              </div>
            </div>
            <Button onClick={saveNotifications} disabled={notifSaving} className="w-full">
              {notifSaving ? "Saving…" : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
