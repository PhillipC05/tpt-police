/**
 * Structured JSON logger for TPT Police.
 *
 * In production, outputs newline-delimited JSON (NDJSON) for ingestion by
 * Logstash, Datadog, CloudWatch, Grafana Loki, etc.
 * In development, outputs colorized, human-readable text.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("User logged in", { userId: "123", role: "OFFICER" });
 *
 *   const child = logger.child({ tenant: "precinct-42" });
 *   child.warn("Rate limit approaching", { current: 58, max: 60 });
 */

// ─── Log Levels ─────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m",    // cyan
  info: "\x1b[32m",     // green
  warn: "\x1b[33m",     // yellow
  error: "\x1b[31m",    // red
  fatal: "\x1b[35m",    // magenta
};

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

// ─── Context Type ───────────────────────────────────────────────────────

export interface LogContext {
  /** Request correlation ID */
  requestId?: string;
  /** Authenticated user ID */
  userId?: string;
  /** User role */
  userRole?: string;
  /** Tenant identifier */
  tenantId?: string;
  /** Tenant type */
  tenantType?: string;
  /** API route path or component name */
  source?: string;
  /** HTTP method for request logs */
  method?: string;
  /** HTTP path for request logs */
  path?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Request duration in milliseconds */
  durationMs?: number;
  /** Error stack trace */
  stack?: string;
  /** Additional arbitrary context */
  [key: string]: unknown;
}

// ─── Logger Implementation ──────────────────────────────────────────────

export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}, minLevel?: LogLevel) {
    this.context = context;
    this.minLevel = minLevel ?? getEffectiveLogLevel();
  }

  /**
   * Create a child logger with additional context merged in.
   * Child loggers inherit all parent context fields.
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.minLevel,
    );
  }

  debug(message: string, extra?: LogContext): void {
    this.log("debug", message, extra);
  }

  info(message: string, extra?: LogContext): void {
    this.log("info", message, extra);
  }

  warn(message: string, extra?: LogContext): void {
    this.log("warn", message, extra);
  }

  error(message: string, extra?: LogContext): void {
    this.log("error", message, extra);
  }

  fatal(message: string, extra?: LogContext): void {
    this.log("fatal", message, extra);
  }

  private log(level: LogLevel, message: string, extra?: LogContext): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return;

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...extra,
      // Ensure these are at the top level for searchability
      environment: process.env.NODE_ENV ?? "development",
      service: "tpt-police",
    };

    // Remove undefined values to keep output clean
    for (const key of Object.keys(entry)) {
      if (entry[key] === undefined) delete entry[key];
    }

    const isDev = process.env.NODE_ENV !== "production";

    if (isDev) {
      this.writeDev(level, entry);
    } else {
      this.writeJSON(entry);
    }
  }

  private writeDev(level: LogLevel, entry: Record<string, unknown>): void {
    const color = LOG_LEVEL_COLORS[level] ?? "";
    const label = level.toUpperCase().padEnd(5);
    const timestamp = new Date(entry.timestamp as string).toLocaleTimeString();
    const source = entry.source ? ` ${DIM}[${entry.source}]${RESET}` : "";
    const requestId = entry.requestId ? ` ${DIM}req=${entry.requestId}${RESET}` : "";
    const userId = entry.userId ? ` ${DIM}user=${entry.userId}${RESET}` : "";
    const tenantId = entry.tenantId ? ` ${DIM}tenant=${entry.tenantId}${RESET}` : "";
    const duration = entry.durationMs != null ? ` ${DIM}${entry.durationMs}ms${RESET}` : "";
    const statusCode = entry.statusCode != null ? ` ${DIM}http=${entry.statusCode}${RESET}` : "";

    // Extract known fields from extra for cleaner display
    const knownKeys = new Set([
      "timestamp", "level", "message", "service", "environment",
      "source", "requestId", "userId", "userRole",
      "tenantId", "tenantType", "method", "path",
      "statusCode", "durationMs", "stack",
    ]);
    const extraFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(entry)) {
      if (!knownKeys.has(k) && v !== undefined) {
        extraFields[k] = v;
      }
    }

    const extraStr =
      Object.keys(extraFields).length > 0
        ? ` ${DIM}${JSON.stringify(extraFields)}${RESET}`
        : "";

    const stack = entry.stack ? `\n${entry.stack}` : "";

    const line = `${color}${label}${RESET} ${timestamp}${source}${requestId}${userId}${tenantId}${duration}${statusCode} ${entry.message}${extraStr}${stack}`;

    if (level === "error" || level === "fatal") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  private writeJSON(entry: Record<string, unknown>): void {
    // Errors need special handling — ensure error.message and stack are captured
    const output = { ...entry };
    if (output.stack && typeof output.stack === "string") {
      output.stack = output.stack.split("\n").map((l) => l.trim()).join(" | ");
    }
    const line = JSON.stringify(output);
    if (entry.level === "error" || entry.level === "fatal") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }
}

// ─── Determine effective log level from environment ─────────────────────

function getEffectiveLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) return envLevel;
  if (process.env.NODE_ENV === "production") return "info";
  return "debug";
}

// ─── Default singleton logger ───────────────────────────────────────────

export const logger = new Logger();

// ─── Request-scoped logger factory ──────────────────────────────────────

/**
 * Create a logger instance pre-populated with HTTP request context.
 * Useful in API route handlers.
 *
 * @example
 * ```ts
 * import { loggerFromRequest } from "@/lib/logger";
 * const log = loggerFromRequest(request);
 * log.info("Processing request");
 * ```
 */
export function loggerFromRequest(
  request: Request,
  extra?: LogContext,
): Logger {
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    crypto.randomUUID();

  return new Logger({
    requestId,
    method: request.method,
    path: new URL(request.url).pathname,
    ...extra,
  });
}

/**
 * Create a logger from a known request ID (for async operations or background jobs).
 */
export function loggerFromRequestId(requestId?: string): Logger {
  return new Logger({
    requestId: requestId ?? crypto.randomUUID(),
  });
}