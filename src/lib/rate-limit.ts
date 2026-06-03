import { NextResponse } from "next/server";

/**
 * In-memory sliding window rate limiter.
 * For production multi-instance deployments, swap for Redis-based implementation.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 60 seconds to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 60_000).unref?.();

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Window duration in milliseconds (default: 60_000 = 1 minute) */
  windowMs: number;
  /** Custom identifier prefix for grouping endpoints */
  prefix?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  max: 60,
  windowMs: 60_000,
  prefix: "rl",
};

/**
 * Rate limit check for API routes.
 * Returns a NextResponse with 429 status if rate limited, or null to continue.
 *
 * @example
 * ```ts
 * const rateLimitResult = checkRateLimit("user-id-or-ip", { max: 30, windowMs: 60_000 });
 * if (rateLimitResult) return rateLimitResult;
 * ```
 */
export function checkRateLimit(
  identifier: string,
  overrides?: Partial<RateLimitConfig>,
): NextResponse | null {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const key = `${config.prefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.max) {
    const retryAfterMs = entry.timestamps[0] + config.windowMs - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    return NextResponse.json(
      { message: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((now + retryAfterMs) / 1000)),
        },
      },
    );
  }

  entry.timestamps.push(now);

  return null;
}

/**
 * Extract a rate limit identifier from the request context.
 * Prefers authenticated user ID, falls back to IP address.
 */
export function getRateLimitIdentifier(
  userId?: string,
  request?: Request,
): string {
  if (userId) return `user:${userId}`;
  if (request) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    return `ip:${ip}`;
  }
  return "ip:unknown";
}