/**
 * Prometheus metrics endpoint.
 *
 * Exposes application metrics in Prometheus text format for scraping by
 * Prometheus, Grafana, Datadog Agent, or any OpenMetrics-compatible collector.
 *
 * Endpoint: GET /api/metrics
 * Scrape config:
 *   - job_name: 'tpt-police'
 *     scrape_interval: 15s
 *     static_configs:
 *       - targets: ['localhost:3000']
 *     metrics_path: '/api/metrics'
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── Metrics Registry ───────────────────────────────────────────────────

interface Metric {
  name: string;
  help: string;
  type: "counter" | "gauge" | "histogram";
  value: number;
  labels?: Record<string, string>;
}

const startTime = Date.now();

// Simple counter store for tracking
const counters = new Map<string, number>();

/**
 * Increment a counter metric. Safe to call from anywhere.
 * @example incrementCounter("http_requests_total", { method: "GET", path: "/api/health" });
 */
export function incrementCounter(
  name: string,
  labels?: Record<string, string>,
  value = 1,
): void {
  const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
  counters.set(key, (counters.get(key) ?? 0) + value);
}

/**
 * Reset all counters (useful for tests).
 */
export function resetCounters(): void {
  counters.clear();
}

// ─── Database metric helper ─────────────────────────────────────────────

async function collectMetrics(): Promise<Metric[]> {
  const metrics: Metric[] = [];

  // ── Application Info ─────────────────────────────────────────────
  metrics.push({
    name: "tpt_police_build_info",
    help: "Build and version information",
    type: "gauge",
    value: 1,
    labels: {
      version: process.env.APP_VERSION ?? "0.1.0",
      node_version: process.version,
      environment: process.env.NODE_ENV ?? "development",
    },
  });

  // ── Uptime ────────────────────────────────────────────────────────
  metrics.push({
    name: "tpt_police_uptime_seconds_total",
    help: "Application uptime in seconds",
    type: "counter",
    value: Math.floor((Date.now() - startTime) / 1000),
  });

  // ── Memory ────────────────────────────────────────────────────────
  const mem = process.memoryUsage();
  metrics.push({
    name: "tpt_police_memory_heap_bytes",
    help: "Heap used memory in bytes",
    type: "gauge",
    value: mem.heapUsed,
  });
  metrics.push({
    name: "tpt_police_memory_heap_total_bytes",
    help: "Heap total memory in bytes",
    type: "gauge",
    value: mem.heapTotal,
  });
  metrics.push({
    name: "tpt_police_memory_rss_bytes",
    help: "Resident set size in bytes",
    type: "gauge",
    value: mem.rss,
  });

  // ── Database Connection ───────────────────────────────────────────
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    metrics.push({
      name: "tpt_police_database_up",
      help: "Database connectivity (1 = connected, 0 = disconnected)",
      type: "gauge",
      value: 1,
    });
    metrics.push({
      name: "tpt_police_database_latency_ms",
      help: "Database query latency in milliseconds",
      type: "gauge",
      value: dbLatency,
    });
  } catch {
    metrics.push({
      name: "tpt_police_database_up",
      help: "Database connectivity (1 = connected, 0 = disconnected)",
      type: "gauge",
      value: 0,
    });
  }

  // ── HTTP Request Counters (from in-memory counters) ───────────────
  // Group counters by name and sum by labels
  const groupedCounters = new Map<string, { total: number; labelMap: Map<string, number> }>();

  for (const [key, count] of counters.entries()) {
    const colonIdx = key.indexOf(":");
    if (colonIdx === -1) {
      // Unlabeled counter
      if (!groupedCounters.has(key)) {
        groupedCounters.set(key, { total: 0, labelMap: new Map() });
      }
      groupedCounters.get(key)!.total += count;
    } else {
      const name = key.substring(0, colonIdx);
      const labelStr = key.substring(colonIdx + 1);
      try {
        const labelsObj = JSON.parse(labelStr) as Record<string, string>;
        const labelKey = Object.entries(labelsObj)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}="${escapeLabelValue(v)}"`)
          .join(",");

        if (!groupedCounters.has(name)) {
          groupedCounters.set(name, { total: 0, labelMap: new Map() });
        }
        const group = groupedCounters.get(name)!;
        group.total += count;
        group.labelMap.set(labelKey, (group.labelMap.get(labelKey) ?? 0) + count);
      } catch {
        // Skip malformed label JSON
      }
    }
  }

  for (const [name, group] of groupedCounters.entries()) {
    // Emit unlabeled total if no specific labels
    if (group.total > 0 && group.labelMap.size === 0) {
      metrics.push({
        name,
        help: `Counter for ${name}`,
        type: "counter",
        value: group.total,
      });
    }

    // Emit per-label combos
    for (const [labelKey, value] of group.labelMap.entries()) {
      metrics.push({
        name,
        help: `Counter for ${name}`,
        type: "counter",
        value,
        labels: parseLabelKey(labelKey),
      });
    }
  }

  return metrics;
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function parseLabelKey(labelKey: string): Record<string, string> {
  const labels: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(labelKey)) !== null) {
    labels[match[1]] = match[2];
  }
  return labels;
}

// ─── Prometheus Text Format Serialiser ──────────────────────────────────

function formatPrometheus(metrics: Metric[]): string {
  const lines: string[] = [];

  for (const metric of metrics) {
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    lines.push(`# TYPE ${metric.name} ${metric.type}`);

    if (metric.labels && Object.keys(metric.labels).length > 0) {
      const labels = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${escapeLabelValue(v)}"`)
        .join(",");
      lines.push(`${metric.name}{${labels}} ${metric.value}`);
    } else {
      lines.push(`${metric.name} ${metric.value}`);
    }
  }

  lines.push(""); // trailing newline
  return lines.join("\n");
}

// ─── Route Handler ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const metrics = await collectMetrics();
    const body = formatPrometheus(metrics);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return new NextResponse(
      `# Error collecting metrics: ${error instanceof Error ? error.message : "Unknown error"}\n`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
  }
}