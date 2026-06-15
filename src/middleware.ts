import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/session-constants";

const publicPaths = [
  "/login",
  "/api/auth/login",
  "/api/health",
  "/api/version",
  "/quiz",
  "/api/training/attempts",
  "/s", // ShipNotify public confirm pages (/s/<token>)
  "/api/public/ship-confirm" // ShipNotify public confirm endpoint
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (!request.cookies.get(SESSION_COOKIE)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
