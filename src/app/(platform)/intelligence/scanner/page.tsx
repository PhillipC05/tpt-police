import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { isFacialConfigured } from "@/lib/facial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AlertTriangle, Camera, Shield, Eye } from "lucide-react";
import { ScannerConfigClient } from "@/components/intelligence/scanner-config-client";

const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];
const ADMIN_ROLES = ["PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

export default async function ScannerPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!DETECTIVE_ROLES.includes(session.user.role)) redirect("/dashboard");

  await writeAuditLog({
    userId: session.user.id,
    tenantId: session.user.tenantId,
    action: "VIEW_SCANNER_CONTROL",
    resource: "scanner",
  });

  const tid = session.user.tenantId;
  const configured = isFacialConfigured();

  const [config, activeSessions, recentMatchCount] = await Promise.all([
    prisma.scanConfig.findUnique({ where: { tenantId: tid } }),
    prisma.faceScanSession.findMany({
      where: { tenantId: tid, endedAt: null },
      include: {
        bwcCamera: { select: { serialNumber: true, deviceType: true } },
        surveillanceCam: { select: { name: true } },
        officer: { select: { name: true, badgeNumber: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
    prisma.facialMatch.count({
      where: {
        tenantId: tid,
        capturedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const canEdit = ADMIN_ROLES.includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Identity Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Real-time biometric identification across camera sources
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/intelligence/scanner/matches">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted px-3 py-1.5">
              <Eye className="w-3 h-3 mr-1" />{recentMatchCount} matches today
            </Badge>
          </Link>
        </div>
      </div>

      {!configured && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-sm text-yellow-700 dark:text-yellow-400">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>No recognition service configured.</strong> Set <code>FACIAL_API_URL</code> and{" "}
            <code>FACIAL_API_KEY</code> environment variables to enable live identification. The scanner
            will return stub results until then.
          </span>
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
        All face scanning activity is logged and subject to audit review. Enabling sensitive scan
        categories requires supervisor authorisation and must comply with applicable legal frameworks.
      </div>

      <ScannerConfigClient
        initialConfig={config}
        canEdit={canEdit}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Active Scan Sessions ({activeSessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active scan sessions</p>
          ) : (
            <div className="divide-y">
              {activeSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{s.sourceType.replace(/_/g, " ")}</Badge>
                      {s.bwcCamera && (
                        <span className="text-sm truncate">
                          {s.bwcCamera.deviceType === "SMART_GLASSES" ? "Smart Glasses" : "BWC"}{" "}
                          {s.bwcCamera.serialNumber}
                        </span>
                      )}
                      {s.surveillanceCam && (
                        <span className="text-sm truncate">{s.surveillanceCam.name}</span>
                      )}
                    </div>
                    {s.officer && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.officer.name} ({s.officer.badgeNumber}) · started{" "}
                        {new Date(s.startedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{s.matchCount} matches</span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/intelligence/scanner/matches">
          <div className="flex items-center gap-2 text-sm text-primary hover:underline">
            <Eye className="w-4 h-4" />View match history
          </div>
        </Link>
        <Link href="/intelligence/scanner/cameras">
          <div className="flex items-center gap-2 text-sm text-primary hover:underline">
            <Camera className="w-4 h-4" />Manage CCTV cameras
          </div>
        </Link>
      </div>
    </div>
  );
}
