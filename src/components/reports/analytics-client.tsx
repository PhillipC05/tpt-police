"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  PieChart,
  BarChart3,
  FileText,
  Download,
  Calendar,
  Clock,
  Percent,
  Users,
  AlertTriangle,
  LineChart,
  GitCompare,
  Plus,
  Trash2,
  Play,
  Mail,
  Settings2,
  Building2,
  Globe,
  MapPin,
  X,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────

interface AnalyticsData {
  totalCases: number;
  openCases: number;
  resolvedCases: number;
  clearanceRate: number;
  byType: Array<{ type: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  officerMetrics: {
    totalOfficers: number;
    avgCasesPerOfficer: number;
    topPerformers: Array<{ id: string; name: string; caseCount: number }>;
  };
  recentActivity: Array<{ date: string; count: number }>;
}

interface TrendData {
  tenantId: string;
  tenantName: string;
  tenantType: string;
  totalCases: number;
  closedCases: number;
  activeCases: number;
  clearanceRate: number;
  trendData: Array<{ period: string; created: number; closed: number }>;
}

interface TrendsResponse {
  trends: TrendData[];
  comparisonSummary: Array<{
    name: string;
    type: string;
    totalCases: number;
    clearanceRate: number;
    activeCases: number;
  }>;
  period: string;
  generatedAt: string;
}

interface ScheduledReport {
  id: string;
  title: string;
  description: string | null;
  metrics: string[];
  filters: Record<string, unknown>;
  schedule: string;
  recipients: string[];
  format: string;
  lastSentAt: string | null;
  nextRunAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const METRIC_OPTIONS = [
  { value: "totalCases", label: "Total Cases" },
  { value: "openCases", label: "Open Cases" },
  { value: "clearanceRate", label: "Clearance Rate" },
  { value: "activeOfficers", label: "Active Officers" },
  { value: "casesByType", label: "Cases by Type" },
  { value: "caseTrends", label: "Case Trends Over Time" },
  { value: "clearanceTrend", label: "Clearance Rate Trend" },
  { value: "officerPerformance", label: "Officer Performance" },
  { value: "assetUtilization", label: "Asset Utilization" },
];

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const FORMAT_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
];

// ── Component ──────────────────────────────────────────────────────────

export function AnalyticsClient() {
  // Existing state
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  // Trend / comparison state
  const [trendData, setTrendData] = useState<TrendsResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState("monthly");
  const [trendDays, setTrendDays] = useState("365");
  const [compareTenants, setCompareTenants] = useState("");
  const [showComparison, setShowComparison] = useState(false);

  // Custom report builder state
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["totalCases", "openCases", "clearanceRate"]);
  const [reportFilters, setReportFilters] = useState("{}");

  // Scheduled reports state
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedDescription, setSchedDescription] = useState("");
  const [schedMetrics, setSchedMetrics] = useState<string[]>(["totalCases", "clearanceRate"]);
  const [schedSchedule, setSchedSchedule] = useState("weekly");
  const [schedRecipients, setSchedRecipients] = useState("");
  const [schedFormat, setSchedFormat] = useState("pdf");

  // ── Data Fetching ──────────────────────────────────────────────────

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/reports/analytics?days=${dateRange}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTrends = async () => {
    setTrendLoading(true);
    try {
      const params = new URLSearchParams({
        period: trendPeriod,
        days: trendDays,
      });
      if (compareTenants.trim()) {
        params.set("tenants", compareTenants.trim());
      }
      const res = await fetch(`/api/reports/trends?${params.toString()}`);
      if (res.ok) setTrendData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setTrendLoading(false);
    }
  };

  const fetchScheduledReports = async () => {
    try {
      const res = await fetch("/api/reports/scheduled");
      if (res.ok) setScheduledReports(await res.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAnalytics().finally(() => setLoading(false));
  }, [dateRange]);

  useEffect(() => {
    if (showComparison) fetchTrends();
  }, [showComparison, trendPeriod, trendDays]);

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  // ── Export ─────────────────────────────────────────────────────────

  const handleExport = async (format: string) => {
    try {
      const res = await fetch(`/api/reports/analytics?days=${dateRange}&export=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Report exported as ${format.toUpperCase()}`);
      }
    } catch {
      toast.error("Export failed");
    }
  };

  // ── Custom Report Builder ──────────────────────────────────────────

  const toggleMetric = (value: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value],
    );
  };

  const handleBuildReport = async () => {
    if (!reportTitle.trim()) {
      toast.error("Report title is required");
      return;
    }

    try {
      JSON.parse(reportFilters || "{}");
    } catch {
      toast.error("Invalid filters JSON");
      return;
    }

    try {
      const res = await fetch(`/api/reports/analytics?days=${dateRange}&export=csv`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportTitle.replace(/\s+/g, "_").toLowerCase()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      const summary = [
        `Report: ${reportTitle}`,
        `Description: ${reportDescription || "N/A"}`,
        `Period: Last ${dateRange} days`,
        `Metrics: ${selectedMetrics.join(", ")}`,
        `Filters: ${reportFilters || "None"}`,
        `Generated: ${new Date().toLocaleString()}`,
        ``,
        data
          ? `Total Cases: ${data.totalCases}
Clearance Rate: ${data.clearanceRate.toFixed(1)}%
Open Cases: ${data.openCases}
Active Officers: ${data.officerMetrics.totalOfficers}`
          : "No base analytics data available",
      ].join("\n");

      const summaryBlob = new Blob([summary], { type: "text/plain" });
      const summaryUrl = URL.createObjectURL(summaryBlob);
      const a2 = document.createElement("a");
      a2.href = summaryUrl;
      a2.download = `${reportTitle.replace(/\s+/g, "_").toLowerCase()}_summary.txt`;
      a2.click();
      URL.revokeObjectURL(summaryUrl);

      toast.success("Custom report generated");
      setShowReportBuilder(false);
    } catch {
      toast.error("Failed to generate custom report");
    }
  };

  // ── Scheduled Reports ──────────────────────────────────────────────

  const toggleSchedMetric = (value: string) => {
    setSchedMetrics((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value],
    );
  };

  const handleCreateSchedule = async () => {
    if (!schedTitle.trim()) {
      toast.error("Report title is required");
      return;
    }
    if (!schedRecipients.trim()) {
      toast.error("At least one recipient email is required");
      return;
    }

    const recipients = schedRecipients
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/reports/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: schedTitle,
          description: schedDescription || undefined,
          metrics: schedMetrics,
          filters: {},
          schedule: schedSchedule,
          recipients,
          format: schedFormat,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message || "Failed to create schedule");
        return;
      }

      toast.success("Scheduled report created");
      setShowScheduleDialog(false);
      resetScheduleForm();
      fetchScheduledReports();
    } catch {
      toast.error("Failed to create scheduled report");
    }
  };

  const handleToggleSchedule = async (report: ScheduledReport) => {
    try {
      const res = await fetch("/api/reports/scheduled", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          isActive: !report.isActive,
        }),
      });

      if (res.ok) {
        toast.success(`Report ${report.isActive ? "paused" : "activated"}`);
        fetchScheduledReports();
      }
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/scheduled?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Scheduled report deleted");
        fetchScheduledReports();
      }
    } catch {
      toast.error("Failed to delete schedule");
    }
  };

  const resetScheduleForm = () => {
    setSchedTitle("");
    setSchedDescription("");
    setSchedMetrics(["totalCases", "clearanceRate"]);
    setSchedSchedule("weekly");
    setSchedRecipients("");
    setSchedFormat("pdf");
  };

  const handleSendNow = async (report: ScheduledReport) => {
    try {
      const metrics = report.metrics.length > 0
        ? report.metrics
        : ["totalCases", "clearanceRate"];

      const metricData = data
        ? [
            { label: "Total Cases", value: data.totalCases },
            { label: "Open Cases", value: data.openCases },
            { label: "Clearance Rate", value: `${data.clearanceRate.toFixed(1)}%` },
            { label: "Active Officers", value: data.officerMetrics.totalOfficers },
          ].filter((m) => metrics.includes(m.label.toLowerCase().replace(/\s+/g, "")))
        : [];

      const res = await fetch("/api/reports/scheduled/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          metrics: metricData,
        }),
      });

      if (res.ok) {
        toast.success("Report sent to recipients");
        fetchScheduledReports();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to send report");
      }
    } catch {
      toast.error("Failed to send report");
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────

  const getTenantIcon = (type: string) => {
    switch (type) {
      case "NATION":
        return <Globe className="w-4 h-4" />;
      case "PROVINCE":
        return <Building2 className="w-4 h-4" />;
      case "CITY":
        return <MapPin className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-NZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ── Loading State ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Clock className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Crime Statistics & Analytics</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateRange} onValueChange={(v: string | null) => setDateRange(v ?? "")}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={showReportBuilder} onOpenChange={setShowReportBuilder}>
            <DialogTrigger>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" /> Custom Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Custom Report Builder</DialogTitle>
                <DialogDescription>
                  Configure the metrics and filters for your custom report.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reportTitle">Report Title *</Label>
                  <Input
                    id="reportTitle"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="e.g., Monthly Crime Summary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportDesc">Description</Label>
                  <Textarea
                    id="reportDesc"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Brief description of this report"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Metrics to Include</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                    {METRIC_OPTIONS.map((m) => (
                      <label
                        key={m.value}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMetrics.includes(m.value)}
                          onChange={() => toggleMetric(m.value)}
                          className="rounded"
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportFilters">Filters (JSON)</Label>
                  <Textarea
                    id="reportFilters"
                    value={reportFilters}
                    onChange={(e) => setReportFilters(e.target.value)}
                    placeholder='{"caseType": "HOMICIDE", "status": "CLOSED"}'
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReportBuilder(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBuildReport}>
                  <FileText className="w-4 h-4 mr-1" /> Generate Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {!data ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No analytics data available</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── KPI Cards ───────────────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalCases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Open Cases</CardTitle>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.openCases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Clearance Rate</CardTitle>
                <Percent className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.clearanceRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Officers</CardTitle>
                <Users className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.officerMetrics.totalOfficers}</div>
              </CardContent>
            </Card>
          </div>

          {/* ── Cases by Type / Top Performers ──────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cases by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {data.byType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <div className="space-y-2">
                    {data.byType.map((t) => (
                      <div key={t.type} className="flex items-center justify-between text-sm">
                        <span>{t.type.replace(/_/g, " ")}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${(t.count / Math.max(...data.byType.map((x) => x.count))) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="font-medium w-8 text-right">{t.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Performing Officers</CardTitle>
              </CardHeader>
              <CardContent>
                {data.officerMetrics.topPerformers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data</p>
                ) : (
                  <div className="space-y-2">
                    {data.officerMetrics.topPerformers.slice(0, 5).map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm">
                        <span>{o.name}</span>
                        <Badge variant="secondary">{o.caseCount} cases</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Trend Dashboards / Cross-Precinct Comparison Section ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <LineChart className="w-4 h-4" />
                  Province / City / National Trend Dashboards
                </CardTitle>
                <CardDescription>
                  View case trends over time and compare across precincts
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showComparison}
                  onCheckedChange={setShowComparison}
                  id="trend-toggle"
                />
                <Label htmlFor="trend-toggle" className="text-xs cursor-pointer">
                  {showComparison ? "Hide Trends" : "Show Trends"}
                </Label>
              </div>
            </CardHeader>

            {showComparison && (
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Period:</Label>
                    <Select value={trendPeriod} onValueChange={(v: string | null) => setTrendPeriod(v ?? "monthly")}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Days:</Label>
                    <Select value={trendDays} onValueChange={(v: string | null) => setTrendDays(v ?? "365")}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">3 months</SelectItem>
                        <SelectItem value="180">6 months</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="730">2 years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Label className="text-xs">Compare Tenants (IDs):</Label>
                    <Input
                      className="w-[200px]"
                      placeholder="tenantId1,tenantId2"
                      value={compareTenants}
                      onChange={(e) => setCompareTenants(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="secondary" onClick={fetchTrends}>
                    {trendLoading ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <LineChart className="w-4 h-4 mr-1" />
                    )}
                    Load Trends
                  </Button>
                </div>

                {trendLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Clock className="w-6 h-6 animate-spin" />
                  </div>
                ) : trendData ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {trendData.trends.map((t) => (
                        <div key={t.tenantId} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getTenantIcon(t.tenantType)}
                              <span className="font-medium">{t.tenantName}</span>
                              <Badge variant="outline" className="text-xs">
                                {t.tenantType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>Total: {t.totalCases}</span>
                              <span>Active: {t.activeCases}</span>
                              <span className="text-green-600">
                                Clearance: {t.clearanceRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          {t.trendData.length > 0 ? (
                            <div className="space-y-1">
                              {t.trendData.slice(-12).map((d) => (
                                <div key={d.period} className="flex items-center gap-2 text-xs">
                                  <span className="w-20 text-right text-muted-foreground">
                                    {d.period}
                                  </span>
                                  <div className="flex-1 flex items-center gap-1">
                                    <div
                                      className="h-3 bg-blue-500 rounded-sm"
                                      style={{
                                        width: `${Math.min(
                                          (d.created / Math.max(...t.trendData.map((x) => x.created), 1)) * 100,
                                          100,
                                        )}%`,
                                        minWidth: d.created > 0 ? "4px" : "0",
                                      }}
                                      title={`Created: ${d.created}`}
                                    />
                                    <div
                                      className="h-3 bg-green-500 rounded-sm"
                                      style={{
                                        width: `${Math.min(
                                          (d.closed / Math.max(...t.trendData.map((x) => x.created), 1)) * 100,
                                          100,
                                        )}%`,
                                        minWidth: d.closed > 0 ? "4px" : "0",
                                      }}
                                      title={`Closed: ${d.closed}`}
                                    />
                                  </div>
                                  <span className="w-16 text-muted-foreground">
                                    {d.created} / {d.closed}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No trend data available</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {trendData.comparisonSummary.length > 1 && (
                      <Card className="border-dashed">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <GitCompare className="w-4 h-4" />
                            Cross-Precinct Comparison
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="pb-2 font-medium">Precinct</th>
                                  <th className="pb-2 font-medium">Type</th>
                                  <th className="pb-2 font-medium text-right">Total Cases</th>
                                  <th className="pb-2 font-medium text-right">Active</th>
                                  <th className="pb-2 font-medium text-right">Clearance Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {trendData.comparisonSummary.map((p) => (
                                  <tr key={p.name} className="border-b last:border-0">
                                    <td className="py-2 flex items-center gap-2">
                                      {getTenantIcon(p.type)}
                                      {p.name}
                                    </td>
                                    <td className="py-2 text-muted-foreground">{p.type}</td>
                                    <td className="py-2 text-right font-medium">{p.totalCases}</td>
                                    <td className="py-2 text-right">{p.activeCases}</td>
                                    <td className="py-2 text-right">
                                      <Badge
                                        variant={p.clearanceRate >= 50 ? "default" : "secondary"}
                                        className="text-xs"
                                      >
                                        {p.clearanceRate.toFixed(1)}%
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Click "Load Trends" to view trend data
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* ── Case Resolution Rates ───────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Case Resolution Rates</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byStatus.length === 0 ? (
                <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <PieChart className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">No resolution data available</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.byStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span>{s.status.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-40 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.status === "CLOSED"
                                ? "bg-green-500"
                                : s.status === "OPEN"
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                            }`}
                            style={{
                              width: `${data.totalCases > 0 ? (s.count / data.totalCases) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="font-medium w-8 text-right">{s.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Asset Utilization Summary ────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Asset Utilization Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Asset utilization statistics will display here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Scheduled Reports Section ─────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Scheduled Report Emails
                </CardTitle>
                <CardDescription>
                  Automatically generate and email reports on a schedule
                </CardDescription>
              </div>
              <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                <DialogTrigger>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" /> New Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create Scheduled Report</DialogTitle>
                    <DialogDescription>
                      Configure a report to be automatically generated and emailed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label htmlFor="schedTitle">Report Title *</Label>
                      <Input
                        id="schedTitle"
                        value={schedTitle}
                        onChange={(e) => setSchedTitle(e.target.value)}
                        placeholder="e.g., Weekly Crime Summary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedDesc">Description</Label>
                      <Textarea
                        id="schedDesc"
                        value={schedDescription}
                        onChange={(e) => setSchedDescription(e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Metrics</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                        {METRIC_OPTIONS.map((m) => (
                          <label
                            key={m.value}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={schedMetrics.includes(m.value)}
                              onChange={() => toggleSchedMetric(m.value)}
                              className="rounded"
                            />
                            {m.label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="schedSchedule">Schedule</Label>
                        <Select value={schedSchedule} onValueChange={(v: string | null) => setSchedSchedule(v ?? "weekly")}>
                          <SelectTrigger id="schedSchedule">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHEDULE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schedFormat">Format</Label>
                        <Select value={schedFormat} onValueChange={(v: string | null) => setSchedFormat(v ?? "pdf")}>
                          <SelectTrigger id="schedFormat">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FORMAT_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedRecipients">
                        Recipients (comma or newline separated emails) *
                      </Label>
                      <Textarea
                        id="schedRecipients"
                        value={schedRecipients}
                        onChange={(e) => setSchedRecipients(e.target.value)}
                        placeholder="admin@precinct.gov, captain@precinct.gov"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSchedule}>
                      <Calendar className="w-4 h-4 mr-1" /> Create Schedule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {scheduledReports.length === 0 ? (
                <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <Mail className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">
                      No scheduled reports yet. Click "New Schedule" to create one.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledReports.map((report) => (
                    <div
                      key={report.id}
                      className={`border rounded-lg p-4 ${
                        report.isActive ? "" : "opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              report.isActive ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{report.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {report.schedule}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {report.format.toUpperCase()}
                              </Badge>
                            </div>
                            {report.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {report.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendNow(report)}
                            title="Send now"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleSchedule(report)}
                            title={report.isActive ? "Pause" : "Activate"}
                          >
                            {report.isActive ? (
                              <X className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSchedule(report.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {(report.recipients as string[]).length} recipient(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Last: {formatDate(report.lastSentAt)}
                        </span>
                        {report.nextRunAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Next: {formatDate(report.nextRunAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}