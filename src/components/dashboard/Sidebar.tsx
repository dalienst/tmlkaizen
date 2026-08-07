"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  SYSTEM_ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: "⊞" },
    { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
    { href: "/dashboard/departments", label: "Departments", icon: "🏢" },
    { href: "/dashboard/staff", label: "Staff", icon: "👥" },
    { href: "/dashboard/core-values", label: "Core Values", icon: "★" },
    { href: "/dashboard/projects", label: "All Projects", icon: "📋" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
  ],
  HR: [
    { href: "/dashboard/hr", label: "Staff Roster", icon: "👤" },
    { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
    { href: "/dashboard/departments", label: "Departments", icon: "🏢" },
    { href: "/dashboard/staff", label: "All Staff", icon: "👥" },
    { href: "/dashboard/core-values", label: "Core Values", icon: "★" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
  ],
  GM: [
    { href: "/dashboard/gm", label: "Overview", icon: "⊞" },
    { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
    { href: "/dashboard/departments", label: "Departments", icon: "🏢" },
    { href: "/dashboard/staff", label: "Staff", icon: "👥" },
    { href: "/dashboard/core-values", label: "Core Values", icon: "★" },
    { href: "/dashboard/gm/projects", label: "All Projects", icon: "📋" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
  ],
  DEPT_MANAGER: [
    { href: "/dashboard/manager", label: "Projects", icon: "📋" },
    { href: "/dashboard/analytics", label: "Analytics", icon: "📊" },
    { href: "/dashboard/staff", label: "Department Staff", icon: "👥" },
    { href: "/dashboard/core-values", label: "Core Values", icon: "★" },
    { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
  ],
};

import { useSidebar } from "@/context/SidebarContext";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;
  const navItems = role ? NAV_ITEMS[role] : [];
  const { isOpen, close } = useSidebar();

  return (
    <aside className={`dashboard-sidebar${isOpen ? " open" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo flex items-center justify-between">
        <div>
          <span style={{ color: "var(--color-brand)" }}>Kaizen</span>
          <span style={{ color: "var(--color-text-sub)", fontWeight: 400 }}> Tracker</span>
        </div>
        <button
          onClick={close}
          className="mobile-close-btn"
          aria-label="Close sidebar menu"
        >
          ✕
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {role && (
          <div className="sidebar-section-label">{ROLE_LABELS[role]}</div>
        )}
        {(() => {
          const rootOnlyLinks = new Set(["/dashboard/admin", "/dashboard/hr", "/dashboard/gm", "/dashboard/manager"]);
          return navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (!rootOnlyLinks.has(item.href) && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item${isActive ? " active" : ""}`}
                onClick={close}
              >
                <span style={{ fontSize: "0.875rem", lineHeight: 1 }} aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          });
        })()}
      </nav>

      {/* Footer: user info + sign out */}
      <div className="sidebar-footer">
        {session?.user && (
          <div style={{ marginBottom: "0.5rem" }}>
            <div className="font-medium truncate" style={{ fontSize: "0.8125rem" }}>
              {session.user.name}
            </div>
            <div className="text-muted truncate" style={{ fontSize: "0.75rem" }}>
              {session.user.email}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-ghost btn-sm w-full"
          style={{ justifyContent: "flex-start", padding: "0.375rem 0.5rem" }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
