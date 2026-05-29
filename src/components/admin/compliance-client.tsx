"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Download, Trash2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export function ComplianceClient() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportData, setExportData] = useState<Record<string, unknown> | null>(null);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportData(null);
    try {
      const res = await fetch("/api/admin/compliance/export");
      if (res.ok) {
        const data = await res.json();
        setExportData(data);
        toast.success("Data export completed");
      } else {
        const err = await res.json();
        toast.error(err.message || "Export failed");
      }
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tpt-police-data-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (deleting) return;
    const confirmed = confirm(
      "⚠ DATA DELETION WARNING\n\nThis will permanently delete your account and all associated personal data. This action CANNOT be undone.\n\n" +
      "The following data will be deleted:\n" +
      "- Your user profile and credentials\n" +
      "- Leave requests, performance reviews\n" +
      "- Disciplinary and training records\n" +
      "- Payroll entries, expense claims\n" +
      "- Shift assignments and swaps\n" +
      "- Vehicle and equipment assignments\n" +
      "- Case notes you authored\n\n" +
      "Are you sure you want to proceed?"
    );
    if (!confirmed) return;

    // Second confirmation for safety
    const doubleConfirmed = confirm(
      "FINAL CONFIRMATION\n\nType 'DELETE' to confirm you understand this is irreversible."
    );
    if (!doubleConfirmed) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/admin/compliance/delete", { method: "DELETE" });
      if (res.ok) {
        toast.success("Account deleted. Redirecting to home page...");
        // Sign out and redirect
        setTimeout(() => {
          window.location.href = "/api/auth/signout";
        }, 2000);
      } else {
        const err = await res.json();
        toast.error(err.message || "Deletion failed");
        setDeleting(false);
      }
    } catch {
      toast.error("Failed to delete account");
      setDeleting(false);
    }
  };

  const recordCount = (obj: Record<string, unknown> | null, key: string): number => {
    if (!obj || !obj[key]) return 0;
    if (Array.isArray(obj[key])) return (obj[key] as unknown[]).length;
    return 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          GDPR / Privacy Compliance
        </h2>
        <p className="text-sm text-muted-foreground">
          Exercise your data rights under privacy regulations. Export or delete your personal data.
        </p>
      </div>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Data Export (Right of Access)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download all personal data associated with your account in a machine-readable JSON format.
            This includes your profile, assigned cases, leave records, asset assignments, shifts,
            payroll history, performance reviews, training certifications, and more.
          </p>
          <div className="flex gap-3">
            <Button onClick={handleExport} disabled={exporting} variant="outline">
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {exportData ? "Re-export Data" : "Export My Data"}
                </>
              )}
            </Button>
            {exportData && (
              <>
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download JSON File
                </Button>
                <Button variant="ghost" onClick={() => setExportData(null)}>
                  Clear
                </Button>
              </>
            )}
          </div>
          {exportData && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                Export completed successfully
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                <div className="text-muted-foreground">Profile:</div>
                <div className="font-medium">1 record</div>
                <div className="text-muted-foreground">Audit Logs:</div>
                <div className="font-medium">{recordCount(exportData.user as Record<string, unknown> | null, "auditLogs")} records</div>
                <div className="text-muted-foreground">Assigned Cases:</div>
                <div className="font-medium">{recordCount(exportData.user as Record<string, unknown> | null, "assignedCases")} records</div>
                <div className="text-muted-foreground">Leave Requests:</div>
                <div className="font-medium">{recordCount(exportData.user as Record<string, unknown> | null, "leaveRequests")} records</div>
                <div className="text-muted-foreground">Shifts:</div>
                <div className="font-medium">{recordCount(exportData.user as Record<string, unknown> | null, "shifts")} records</div>
                <div className="text-muted-foreground">Payroll Entries:</div>
                <div className="font-medium">{recordCount(exportData.user as Record<string, unknown> | null, "payrollEntries")} records</div>
                <div className="text-muted-foreground">Assets Issued:</div>
                <div className="font-medium">{recordCount(exportData.user as Record<string, unknown> | null, "issuedAssets")} records</div>
                <div className="text-muted-foreground">Vehicles Assigned:</div>
                <div className="font-medium">{recordCount(exportData.user as Record<string, unknown> | null, "assignedVehicles")} records</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Data Deletion */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />
            Data Deletion (Right to be Forgotten)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            <p className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Irreversible Action
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Request permanent deletion of your account and all associated personal data.
              This action removes your user profile, leave records, payroll data, performance reviews,
              training certifications, and other personal records. Case integrity data (e.g., case
              assignments and notes authored by you) will also be removed.
            </p>
            <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
              <li>Administrator accounts cannot self-delete — contact a higher-level admin</li>
              <li>Audit logs will be anonymised (your user reference removed)</li>
              <li>Anonymous tips you submitted will be preserved but disassociated</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting Account...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account & Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}