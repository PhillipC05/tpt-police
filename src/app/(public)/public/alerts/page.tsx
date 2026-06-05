"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Car, AlertTriangle, AlertCircle, Info } from "lucide-react";

interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  vehiclePlate: string | null;
  vehicleDescription: string | null;
  createdAt: string;
  expiresAt: string | null;
}

const alertIcons: Record<string, React.ReactNode> = {
  AMBER_ALERT: <AlertTriangle className="w-5 h-5 text-red-500" />,
  BOLO: <Car className="w-5 h-5 text-amber-500" />,
  SILVER_ALERT: <Info className="w-5 h-5 text-blue-500" />,
  APB: <AlertCircle className="w-5 h-5 text-purple-500" />,
};

const alertColors: Record<string, string> = {
  AMBER_ALERT: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
  BOLO: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
  SILVER_ALERT: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
  APB: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
};

export default function PublicAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch("/api/public/alerts?tenantId=default");
        if (res.ok) {
          setAlerts(await res.json());
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="w-7 h-7 text-red-500" />
          Active Alerts
        </h1>
        <p className="text-muted-foreground">
          Current public safety alerts issued by law enforcement.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No Active Alerts</h3>
            <p className="text-muted-foreground text-sm">There are currently no active alerts for this area.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`border-2 ${alertColors[alert.type] ?? ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {alertIcons[alert.type] ?? <Bell className="w-5 h-5" />}
                  <span className="flex-1">{alert.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {alert.type.replace(/_/g, " ")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>{alert.description}</p>
                {alert.vehiclePlate && (
                  <p className="text-sm font-mono bg-muted inline-block px-2 py-1 rounded">
                    Plate: {alert.vehiclePlate}
                  </p>
                )}
                {alert.vehicleDescription && (
                  <p className="text-sm text-muted-foreground">{alert.vehicleDescription}</p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground pt-2">
                  <span>Issued: {new Date(alert.createdAt).toLocaleString()}</span>
                  {alert.expiresAt && (
                    <span>Expires: {new Date(alert.expiresAt).toLocaleString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}