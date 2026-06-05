import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

const PUBLIC_PATHS = [
  "/login", "/register",
  "/crime-map", "/foia",
  "/api/auth", "/api/webhooks", "/api/health",
  "/api/public",
  "/public",
];

const ROLE_HOME: Record<UserRole, string> = {
  SUPER_ADMIN: "/admin",
  PROVINCE_ADMIN: "/dashboard",
  CITY_ADMIN: "/dashboard",
  PRECINCT_ADMIN: "/dashboard",
  DETECTIVE: "/cases",
  OFFICER: "/dashboard",
  DISPATCHER: "/dispatch",
  PUBLIC: "/crime-map",
};

// Session timeout in seconds (8 hours of inactivity)
const SESSION_TIMEOUT_SECONDS = 8 * 60 * 60;

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const session = req.auth;
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Activity-based session expiry check
  if (session.expires) {
    const expiresAt = new Date(session.expires).getTime();
    const now = Date.now();

    // If session is about to expire within timeout window, redirect to login
    if (now > expiresAt) {
      return NextResponse.redirect(new URL("/login?expired=true", req.url));
    }
  }

  // Redirect unauthenticated root to login, authenticated root to role home
  if (pathname === "/") {
    const home = ROLE_HOME[session.user.role as UserRole] ?? "/dashboard";
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};