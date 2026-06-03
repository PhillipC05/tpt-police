import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import net from "net";

const startTime = Date.now();

async function checkRedis(): Promise<{ status: string; latencyMs?: number; error?: string }> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return { status: "not_configured" };
  }

  // Parse redis://host:port from URL
  let host = "127.0.0.1";
  let port = 6379;
  try {
    const url = new URL(redisUrl);
    host = url.hostname;
    port = parseInt(url.port, 10) || 6379;
  } catch {
    return { status: "unavailable", error: "Invalid REDIS_URL format" };
  }

  const start = Date.now();
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port }, () => {
        // Send Redis PING command
        socket.write("*1\r\n$4\r\nPING\r\n");
      });

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("Redis connection timeout"));
      }, 5000);

      socket.on("data", () => {
        clearTimeout(timeout);
        socket.end();
        resolve();
      });

      socket.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const latencyMs = Date.now() - start;
    return { status: "connected", latencyMs };
  } catch (error) {
    return {
      status: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkDatabase(): Promise<{ status: string; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { status: "connected", latencyMs };
  } catch (error) {
    return {
      status: "disconnected",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [dbCheck, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const status = dbCheck.status === "connected" ? "healthy" : "unhealthy";

  const response = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    service: "tpt-police",
    version: process.env.APP_VERSION ?? "0.1.0",
    environment: process.env.NODE_ENV ?? "development",
    checks: {
      database: dbCheck,
      redis: redisCheck,
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      unit: "MB",
    },
    cpu: {
      loadAvg: typeof process.cpuUsage === "function" ? process.cpuUsage() : undefined,
    },
  };

  const httpStatus = status === "healthy" ? 200 : 503;

  logger.info("Health check", {
    source: "api/health",
    statusCode: httpStatus,
    dbLatencyMs: dbCheck.latencyMs,
    durationMs: Date.now() - startTime,
  });

  return NextResponse.json(response, { status: httpStatus });
}