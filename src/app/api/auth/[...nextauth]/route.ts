import { handlers } from "@/lib/auth";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

// Rate limit sign-in attempts: 10 per IP per minute, 5 per email per 15 minutes
const IP_RATE_LIMIT = { max: 10, windowMs: 60_000, prefix: "rl:signin:ip" };
const EMAIL_RATE_LIMIT = { max: 5, windowMs: 15 * 60_000, prefix: "rl:signin:email" };

export async function POST(request: NextRequest) {
  // Apply IP-based rate limiting to sign-in endpoint
  const ipIdentifier = getRateLimitIdentifier(undefined, request);
  const ipResult = checkRateLimit(ipIdentifier, IP_RATE_LIMIT);
  if (ipResult) return ipResult;

  // Parse body to get email for per-account rate limiting
  let email: string | undefined;
  try {
    const body = await request.clone().json();
    email = body?.email;
  } catch {
    // If body can't be parsed, still allow the request through
    // (next-auth's authorize will handle invalid input)
  }

  if (email) {
    const emailIdentifier = `email:${email.toLowerCase().trim()}`;
    const emailResult = checkRateLimit(emailIdentifier, EMAIL_RATE_LIMIT);
    if (emailResult) {
      // Log the blocked attempt for audit
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            tenantId: user.tenantId,
            action: "LOGIN_RATE_LIMITED",
            resource: "user",
            resourceId: user.id,
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
            userAgent: request.headers.get("user-agent") ?? undefined,
          },
        });
      }
      return emailResult;
    }
  }

  // Forward to next-auth handler
  return handlers.POST(request);
}

export const GET = handlers.GET;
