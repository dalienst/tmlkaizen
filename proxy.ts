import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ROLE_DASHBOARD } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

interface AuthRequest extends NextRequest {
  auth: Session | null;
}

// Route → minimum required role(s)
const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/dashboard/admin": ["SYSTEM_ADMIN"],
  "/dashboard/hr": ["HR", "SYSTEM_ADMIN"],
  "/dashboard/gm": ["GM", "SYSTEM_ADMIN"],
  "/dashboard/manager": ["DEPT_MANAGER", "SYSTEM_ADMIN"],
  "/dashboard/group-manager": ["GROUP_MANAGER", "SYSTEM_ADMIN"],
  "/dashboard/groups": ["SYSTEM_ADMIN", "GROUP_MANAGER"],
};

export default auth((req) => {
  const { nextUrl, auth: session } = req as AuthRequest;
  const pathname: string = nextUrl.pathname;

  // ── Protect all /dashboard/* routes ──────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const userRole = session.user?.role as UserRole;

    // Check specific sub-route role requirements
    for (const [route, allowedRoles] of Object.entries(ROUTE_ROLES)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          // Redirect to their own dashboard
          const ownDashboard = ROLE_DASHBOARD[userRole] ?? "/login";
          return NextResponse.redirect(new URL(ownDashboard, req.url));
        }
        break;
      }
    }
  }

  // ── Redirect logged-in users away from login / setup ─────────────────────
  if (pathname === "/login" || pathname === "/setup") {
    const session2 = req.auth;
    if (session2?.user?.role) {
      const dashboard = ROLE_DASHBOARD[session2.user.role as UserRole];
      if (dashboard) {
        return NextResponse.redirect(new URL(dashboard, req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/setup"],
};
